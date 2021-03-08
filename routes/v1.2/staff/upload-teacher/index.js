const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");

const readXlsxFile = require("read-excel-file/node");
const { parseExcel, preparePayload, sendToBKC } = require("./helper");
const {
  bufferToStream,
  addUniversityPublicKey,
  addKeyPairIfNeed,
  addTxid,
  addRandomPwAndHash,
  addRole,
  addUid,
  createAccount,
  saveProfiles,
} = require("../utils");

router.get("/teacher-history", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const teacherHistoryCol = (await connection).db().collection("TeacherHistory");
    const result = await teacherHistoryCol.find().toArray();
    res.json(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/create-teacher", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    // TODO: check if file too large -> suggest user to split it
    const rows = await readXlsxFile(bufferToStream(req.file.buffer));
    // TODO: validate schema
    let teachers = parseExcel(rows);
    // TODO: remove university publickey if not need anymore
    addUniversityPublicKey(teachers, req.body.privateKeyHex);
    addKeyPairIfNeed(teachers);
    const payload = preparePayload(teachers);
    try {
      const response = await sendToBKC(payload, req.body.privateKeyHex);
      addTxid(teachers, response.data.transactions, "teacherId");
      addRandomPwAndHash(teachers);
      addRole(teachers, ROLE.TEACHER);
      const insertedIds = await createAccount(teachers);
      addUid(teachers, insertedIds);
      const result = await saveProfiles(teachers, "TeacherHistory", req.file.originalname);
      res.json(result.ops[0]);
    } catch (error) {
      console.error(error);
      if (error.response) return res.status(502).send(error.response.data);
      else return res.status(500).send(error);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

module.exports = router;
