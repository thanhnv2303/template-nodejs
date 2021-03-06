const express = require("express");
const router = express.Router();

const connection = require("../../../db");
const VOTE_REQUEST = "VoteRequest";

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const axios = require("axios").default;

router.get("/vote-requests", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const col = (await connection).db().collection(VOTE_REQUEST);
    const state = req.query.state;
    let votes;
    if (state === "new") {
      votes = await col.find({ state: "new", uid: { $ne: req.user.uid } }).toArray();
    } else if (state === "old") {
      votes = await col.find({ state: { $in: ["accepted", "declined"] } }).toArray();
    } else {
      votes = await col.find({}).toArray();
    }
    res.json(votes);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/vote", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const decision = req.body.decision;
    const publicKeyOfRequest = req.body.publicKeyOfRequest;
    const privateKeyHex = req.body.privateKeyHex;

    // validate
    if (!decision || !publicKeyOfRequest || !privateKeyHex) {
      return res.status(400).json({ ok: false, msg: "decision, publicKeyOfRequest, privateKeyHex is require!" });
    }
    if (decision !== "accept" && decision != "decline") {
      return res.status(400).json({ ok: false, msg: "decision == accept || decision == decline!" });
    }

    try {
      const response = await axios.post("/create_vote", {
        publicKeyOfRequest,
        privateKeyHex,
        decision,
      });

      const col = (await connection).db().collection(VOTE_REQUEST);
      const updateResult = await col.updateOne(
        { pubkey: publicKeyOfRequest },
        {
          $set: {
            state: decision === "accept" ? "accepted" : "declined",
            date: new Date().toISOString().split("T")[0],
            txid: response.data.txid,
          },
        }
      );

      res.json(updateResult);
    } catch (error) {
      console.error(error);
      res.status(502).send(error);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
