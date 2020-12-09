const express = require("express");
const router = express.Router();
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const { ROLE } = require("../../acc/ROLE");

router.post("/submit-point", authen, author(ROLE.TEACHER), async (req, res) => {
  try {
    const privateKeyHex = req.body.privateKeyHex;
    const claxx = req.body.claxx;
    const classCol = (await connection).db().collection("Class");
    const opResult = await classCol.updateOne({ classId: claxx.classId }, { $set: { students: claxx.students } });
    res.json(opResult);
    // TODO: push to blockchain too
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

router.get("/classes/:classId", authen, author(ROLE.TEACHER), async (req, res) => {
  try {
    const classId = req.params.classId;
    const classCol = (await connection).db().collection("Class");
    const docs = await classCol.findOne({ classId: classId });
    res.json(docs);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.toString());
  }
});

module.exports = router;
