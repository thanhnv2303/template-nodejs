const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../db");

const readXlsxFile = require("read-excel-file/node");
const { parseExcel, preparePayload, addTxid, sendToBKC } = require("./helper");
const {
  bufferToStream,
  addUniversityPublicKey,
  addKeyPair,
  addPwAndHash,
  addRole,
  addUid,
  createAccount,
  saveProfiles,
} = require("../utils");

router.post("/create-teacher", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const rows = await readXlsxFile(bufferToStream(req.file.buffer));
    let teachers = parseExcel(rows);
    addUniversityPublicKey(teachers, req.user.uid);
    addKeyPair(teachers);
    const payload = preparePayload(teachers);
    try {
      const response = await sendToBKC(payload, req.body.privateKeyHex);
      addTxid(teachers, response.data.transactions);
      addPwAndHash(teachers);
      addRole(teachers, ROLE.TEACHER);
      const insertedIds = await createAccount(teachers);
      addUid(teachers, insertedIds);
      const result = await saveProfiles(teachers, "TeacherHistory");
      res.json(result.ops[0]);
    } catch (error) {
      console.error(error);
      return res.status(502).send(error);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/teacher-history", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const teacherHistoryCol = (await connection).db().collection("TeacherHistory");
    const result = await teacherHistoryCol.find().toArray();
    res.json(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
