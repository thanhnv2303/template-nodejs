const express = require("express");
const router = express.Router();

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");

router.get("/certificate", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const studentId = req.query.studentId;
    const col = (await connection).db().collection("Certificate");
    const docs = await col.find({ studentId: studentId }).toArray();
    if (docs.length === 0) return res.json({ found: false });
    docs.sort((a, b) => b.timestamp - a.timestamp);
    return res.json(docs[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json(error.toString());
  }
});

module.exports = router;
