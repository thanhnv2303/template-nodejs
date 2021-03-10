const express = require("express");
const connection = require("../../../db");
const router = express.Router();

// FIXME: need authen, author too!
router.post("/registration", async (req, res) => {
  try {
    const profile = req.body.profile;
    (await connection)
      .db()
      .collection("UniversityProfile")
      .insertOne({ ...profile, votes: [] });

    const myprofile = await (await connection).db().collection("MyUniversityProfile").findOne({});
    // check if this registration from other university, if then, create new ballot
    if (!myprofile || myprofile.publicKey !== profile.publicKey) {
      (await connection)
        .db()
        .collection("Ballot")
        .insertOne({ ...profile, state: "new" });
    }
    return res.send("ok");
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

router.post("/vote", async (req, res) => {
  try {
    const ministry = await (await connection).db().collection("MinistryProfile").findOne({});
    const col = (await connection).db().collection("UniversityProfile");
    // find who is the voter
    let voter;
    if (req.body.publicKey === ministry.publicKey) {
      voter = ministry;
    } else {
      voter = await col.findOne({ publicKey: req.body.publicKey });
    }
    // update in UniversityProfile
    await col.updateOne(
      { publicKey: req.body.requesterPublicKey },
      {
        $push: {
          votes: { ...voter, decision: req.body.decision },
        },
      }
    );

    // if vote about my university, update in MyUniversityProfile too
    const myProfileColl = (await connection).db().collection("MyUniversityProfile");
    const myprofile = await myProfileColl.findOne({});
    if (myprofile && req.body.requesterPublicKey === myprofile.publicKey) {
      await myProfileColl.updateOne(
        { publicKey: req.body.requesterPublicKey },
        {
          $push: {
            votes: { ...voter, decision: req.body.decision },
          },
        }
      );
    }

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

    const myProfileColl = (await connection).db().collection("MyUniversityProfile");
    const myprofile = await myProfileColl.findOne({});
    if (myprofile && req.body.requesterPublicKey === myprofile.publicKey) {
      await myProfileColl.updateOne({ publicKey: req.body.requesterPublicKey }, { $set: { state: req.body.finalState } });
    }

    return res.send("ok");
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

module.exports = router;
