const express = require("express");
const router = express.Router();
const connection = require("../../../db");
const COLL_NAME = "VoteRequest";
const voteCli = require("./vote-cli");
const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/ROLE");

router.get("/vote-requests", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const col = (await connection).db().collection(COLL_NAME);
    const state = req.query.state;
    let votes;
    if (state === "new") {
      votes = await col.find({ state: "new" }).toArray();
    } else if (state === "old") {
      votes = await col.find({ state: { $in: ["accepted", "declined"] } }).toArray();
    } else {
      votes = await col.find({}).toArray();
    }
    res.json(votes);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.post("/vote", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const decision = req.body.decision;
    const publicKeyOfRequest = req.body.publicKeyOfRequest;
    const privateKey = req.body.privateKey;
    if (!decision || !publicKeyOfRequest || !privateKey) {
      return res.status(400).json({ ok: false, msg: "decision, publicKeyOfRequest, privateKey is require!" });
    }
    let opResult;

    if (decision !== "accept" && decision != "decline") {
      return res.status(400).json({ ok: false, msg: "decision == accept || decision == decline!" });
    } else if (decision === "accept") {
      opResult = await voteCli.sendAcceptVote(publicKeyOfRequest, privateKey);
    } else if (decision === "decline") {
      opResult = await voteCli.sendDeclineVote(publicKeyOfRequest, privateKey);
    }

    if (opResult.ok) {
      const col = (await connection).db().collection(COLL_NAME);
      const updateResult = await col.updateOne(
        { pubkey: publicKeyOfRequest },
        { $set: { state: decision === "accept" ? "accepted" : "declined", date: new Date().toISOString().split("T")[0] } }
      );
      res.json(updateResult);
    } else {
      res.status(500).json(opResult);
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
