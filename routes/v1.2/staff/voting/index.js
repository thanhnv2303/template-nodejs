const express = require("express");
const router = express.Router();

const connection = require("../../../../db");
const BALLOT = "Ballot";

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const axios = require("axios").default;

router.get("/ballots", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const col = (await connection).db().collection(BALLOT);
    const state = req.query.state;
    let ballots;
    if (state === "new") {
      ballots = await col.find({ state: "new", uid: { $ne: req.user.uid } }).toArray();
    } else if (state === "old") {
      ballots = await col.find({ state: { $in: ["accepted", "declined"] } }).toArray();
    } else {
      ballots = await col.find({}).toArray();
    }
    return res.json(ballots);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

router.post("/vote", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const decision = req.body.decision;
    const requesterPublicKey = req.body.requesterPublicKey;
    const privateKeyHex = req.body.privateKeyHex;

    // validate
    if (!decision || !requesterPublicKey || !privateKeyHex) {
      return res.status(400).json({ ok: false, msg: "decision, requesterPublicKey, privateKeyHex is require!" });
    }
    if (decision !== "accept" && decision != "decline") {
      return res.status(400).json({ ok: false, msg: "decision == accept || decision == decline!" });
    }

    try {
      const response = await axios.post("/vote", {
        requesterPublicKey,
        privateKeyHex,
        decision,
      });
      // const response = { data: { txid: randomTxid() } };
      const col = (await connection).db().collection(BALLOT);
      const opResult = await col.updateOne(
        { publicKey: requesterPublicKey },
        {
          $set: {
            state: decision === "accept" ? "accepted" : "declined",
            date: new Date().toISOString().split("T")[0],
            txid: response.data.txid,
          },
        }
      );
      return res.json(opResult);
    } catch (error) {
      console.error(error);
      if (error.response) return res.status(502).send(error.response.data);
      return res.status(500).send(error.toString());
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

module.exports = router;
