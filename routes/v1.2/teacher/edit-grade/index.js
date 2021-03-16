const express = require("express");
const router = express.Router();
const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");

router.get("/classes/:classId", authen, author(ROLE.TEACHER), async (req, res) => {
  try {
    const classId = req.params.classId;
    const classCol = (await connection).db().collection("Class");
    const docs = await classCol.findOne({ classId: classId });
    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
});

module.exports = router;
