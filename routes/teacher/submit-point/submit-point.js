const express = require("express");
const router = express.Router();
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const { ROLE } = require("../../acc/ROLE");

router.get("/classes/:classId", authen, author(ROLE.STAFF), async (req, res) => {
  const classCol = (await connection).db().collection("Class");
  const docs = await classCol.find({}).sort({ uploadTimestamp: -1 }).toArray();
  res.json(docs);
});

module.exports = router;
