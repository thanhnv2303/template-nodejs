const express = require("express");
const router = express.Router();
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const { ROLE } = require("../../acc/ROLE");

router.get("/classes/:classId", authen, author(ROLE.TEACHER), async (req, res) => {
  const classId = req.params.classId;
  const classCol = (await connection).db().collection("Class");
  const docs = await classCol.findOne({ classId: classId });
  res.json(docs);
});

module.exports = router;
