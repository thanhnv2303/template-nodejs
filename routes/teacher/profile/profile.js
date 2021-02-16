const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const { ROLE } = require("../../acc/role");
const ObjectID = require("mongodb").ObjectID;

router.get(
  "/teacher-profile",
  authen,
  author(ROLE.TEACHER),
  async (req, res) => {
    try {
      const col = (await connection).db().collection("TeacherHistory");
      const doc = await col.findOne(
        { "profiles.uid": new ObjectID(req.user.uid) },
        { projection: { "profiles.$": 1, _id: 0 } }
      );
      res.json(doc ? doc.profiles[0] : null);
    } catch (error) {
      res.status(500).json(error.toString());
    }
  }
);
router.post(
  "/change-avatar",
  authen,
  author(ROLE.TEACHER),
  upload.single("avatar"),
  async (req, res) => {
    try {
      const col = (await connection).db().collection("TeacherHistory");
      const imgBase64 = req.file.buffer.toString("base64");
      const imgSrc = `data:${req.file.mimetype};base64,${imgBase64}`;
      const opResult = await col.updateOne(
        { "profiles.uid": new ObjectID(req.user.uid) },
        { $set: { "profiles.$.imgSrc": imgSrc } },
        { upsert: true }
      );
      if (opResult.result.ok) {
        res.json(imgSrc);
      } else {
        res.json(opResult);
      }
    } catch (error) {
      res.status(500).json(error.toString());
    }
  }
);

module.exports = router;
