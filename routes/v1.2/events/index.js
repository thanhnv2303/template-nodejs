const express = require("express");
const connection = require("../../../db");
const router = express.Router();

// TODO: need authen, author too!
router.post("/registration", async (req, res) => {
  try {
    const profile = req.body.profile;
    const ballot = { ...profile, state: "new" };
    const ballotColl = (await connection).db().collection("Ballot");
    const uniProfile = { ...profile, votes: [] };
    const uniProfileColl = (await connection).db().collection("UniversityProfile");
    await ballotColl.insertOne(ballot);
    await uniProfileColl.insertOne(uniProfile);
    return res.send("ok");
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

router.post("/vote", async (req, res) => {
  try {
    const ministryColl = (await connection).db().collection("MinistryProfile");
    const col = (await connection).db().collection("UniversityProfile");
    const ministry = await ministryColl.findOne({});
    let voter = null;
    if (req.body.publicKey === ministry.publicKey) {
      voter = ministry;
    } else {
      voter = await col.findOne({ publicKey: req.body.publicKey });
    }
    await col.updateOne(
      { publicKey: req.body.requesterPublicKey },
      {
        $push: {
          votes: { ...voter, decision: req.body.decision },
        },
      }
    );
    return res.send("ok");
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

router.post("/vote-closed", async (req, res) => {
  try {
    const col = (await connection).db().collection("UniversityProfile");
    await col.updateOne({ publicKey: req.body.requesterPublicKey }, { $set: { state: req.body.finalState } });
    return res.send("ok");
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

module.exports = router;
