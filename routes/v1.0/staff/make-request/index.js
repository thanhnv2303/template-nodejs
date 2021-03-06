const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const { profileSchema } = require("./schema");
const { ROLE } = require("../../acc/role");
const PROFILE = "UniversityProfile";
const ObjectID = require("mongodb").ObjectID;
const axios = require("axios").default;
const { validate } = require("../../../utils");

router.get("/university-profile", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const col = (await connection).db().collection(PROFILE);
    const accCol = (await connection).db().collection("Account");
    const profile = await col.findOne({ uid: req.user.uid });
    const acc = await accCol.findOne({ _id: new ObjectID(req.user.uid) });
    return res.json({ ...profile, email: acc.email });
  } catch (err) {
    return res.status(500).json(err.toString());
  }
});

router.post("/make-request", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    delete req.body.profile._id;
    const profile = req.body.profile;
    profile.uid = req.user.uid;
    const col = (await connection).db().collection(PROFILE);

    const errors = validate(profile, profileSchema);
    if (errors) return res.status(400).json(errors);

    // send to bkc
    try {
      const response = await axios.post("/create_institution", {
        privateKeyHex: req.body.privateKeyHex,
        profile,
      });
      await col.updateOne(
        { uid: req.user.uid },
        {
          $set: {
            ...profile,
            state: "voting",
            txid: response.data.transactionId,
          },
        }
      );
      res.json({ ok: true });
    } catch (error) {
      await col.updateOne({ uid: req.user.uid }, { $set: { ...profile, state: "fail" } });
      res.json({
        ok: false,
        msg: "Không thể tạo tx, vui lòng thử lại sau: " + error.response.data.error,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json(err.toString());
  }
});

router.post("/change-avatar", authen, author(ROLE.STAFF), upload.single("avatar"), async (req, res) => {
  try {
    const col = (await connection).db().collection(PROFILE);
    const imgBase64 = req.file.buffer.toString("base64");
    const imgSrc = `data:${req.file.mimetype};base64,${imgBase64}`;
    await col.updateOne({ uid: req.user.uid }, { $set: { imgSrc: imgSrc } }, { upsert: true });
    res.json(imgSrc);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
