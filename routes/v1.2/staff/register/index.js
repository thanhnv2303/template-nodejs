const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");
const MY_UNIVERSITY_PROFILE = "MyUniversityProfile";

const { profileSchema } = require("./schema");
const { validate, randomTxid } = require("../../../utils");
const ObjectID = require("mongodb").ObjectID;
const axios = require("axios").default;

router.get("/my-university-profile", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const col = (await connection).db().collection(MY_UNIVERSITY_PROFILE);
    const accCol = (await connection).db().collection("Account");
    const profile = await col.findOne();
    const acc = await accCol.findOne({ _id: new ObjectID(req.user.uid) });
    return res.json({ ...profile, email: acc.email });
  } catch (err) {
    return res.status(400).json(err.toString());
  }
});

router.post("/register", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const profile = req.body.profile;
    delete profile._id;
    profile.uid = req.user.uid;

    const errs = validate(profile, profileSchema);
    if (errs) return res.status(400).send(JSON.stringify(errs));

    const profileColl = (await connection).db().collection(MY_UNIVERSITY_PROFILE);
    await profileColl.updateOne({}, { $set: { ...profile } });
    try {
      console.log("Start send registry");
      const response = await axios.post("/staff/register", {
        privateKeyHex: req.body.privateKeyHex,
        profile,
      });
      console.log("Success registry");
      // const response = { data: { transactionId: randomTxid() } };
      await profileColl.updateOne({}, { $set: { state: "voting", txid: response.data.transactionId } });
      return res.send("ok");
    } catch (error) {
      await profileColl.updateOne({}, { $set: { state: "fail" } });
      console.error(error);
      if (error.response) return res.status(502).send("Không thể tạo tx, vui lòng thử lại sau");
      else return res.status(500).send(error.toString());
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

router.post("/change-avatar", authen, author(ROLE.STAFF), upload.single("avatar"), async (req, res) => {
  try {
    const col = (await connection).db().collection(MY_UNIVERSITY_PROFILE);
    const imgBase64 = req.file.buffer.toString("base64");
    const imgSrc = `data:${req.file.mimetype};base64,${imgBase64}`;
    // each db instance is for only one university -> this collection intended has only 1 document
    // await col.updateOne({ uid: req.user.uid }, { $set: { imgSrc: imgSrc } }, { upsert: true });
    await col.insertOne({ imgSrc });
    return res.json(imgSrc);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

module.exports = router;
