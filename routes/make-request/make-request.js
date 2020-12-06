const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { authen } = require("../acc/protect-middleware");
const connection = require("../../db");
const PROFILE = "Profile";
const { profileSchema } = require("./schema");
const sawtoothCli = require("./make-req-cli");

router.get("/profile", authen, async (req, res) => {
  try {
    const col = (await connection).db().collection(PROFILE);
    const profile = await col.findOne({ uid: req.user.uid });
    res.json(profile);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/make-request", authen, async (req, res) => {
  try {
    const profile = req.body;
    delete req.body._id;

    // first valid data
    const { error } = profileSchema.validate(profile, { abortEarly: false });
    if (error) {
      const errors = {};
      for (let err of error.details) {
        errors[err.context.key] = err.message;
      }
      return res.status(400).json(errors);
    }

    // forward to sawtooth-cli to make tx
    const makeTxOp = await sawtoothCli.makeJoinRequest(profile);
    const col = (await connection).db().collection(PROFILE);
    profile.uid = req.user.uid;
    if (makeTxOp.ok) {
      await col.updateOne({ uid: profile.uid }, { $set: { ...profile, state: "voting" } }, { upsert: true });
      res.json({ ok: true });
    } else {
      await col.updateOne({ uid: profile.uid }, { $set: { ...profile, state: "fail" } }, { upsert: true });
      res.json({ ok: false });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/change-avatar", authen, upload.single("avatar"), async (req, res) => {
  try {
    const col = (await connection).db().collection(PROFILE);
    const imgBase64 = req.file.buffer.toString("base64");
    const imgSrc = `data:${req.file.mimetype};base64,${imgBase64}`;
    const opResult = await col.updateOne({ uid: req.user.uid }, { $set: { imgSrc: imgSrc } }, { upsert: true });
    if (opResult.result.ok) {
      res.json(imgSrc);
    } else {
      res.json(opResult);
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
