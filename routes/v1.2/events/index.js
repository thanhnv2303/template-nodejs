const express = require("express");
const connection = require("../../../db");
const router = express.Router();

// TODO: need authen, author too!
router.post("/registration", async (req, res) => {
  try {
    const profile = req.body.profile;
    const ballot = { ...profile, state: "new" };
    const uniProfile = { ...profile, votes: [] };
    const ballotColl = (await connection).db().collection("Ballot");
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
    const col = (await connection).db().collection("UniversityProfile");
    await col.updateOne(
      { publicKey: req.body.requesterPublicKey },
      {
        $push: {
          votes: { publicKey: req.body.publicKey, decision: req.body.decision },
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
