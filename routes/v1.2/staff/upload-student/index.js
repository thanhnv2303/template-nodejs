const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");

const readXlsxFile = require("read-excel-file/node");
const { parseExcel, preparePayload, sendToBKC, addCidAsFirstTimePw } = require("./helper");
const {
  bufferToStream,
  addUniversityPublicKey,
  addKeyPairIfNeed,
  addTxid,
  addRole,
  addUid,
  createAccount,
  saveProfiles,
} = require("../utils");

router.get("/student-history", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const studentHistoryCol = (await connection).db().collection("StudentHistory");
    const result = await studentHistoryCol.find().toArray();
    res.json(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/create-student", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    // TODO: check if file too large -> suggest user to split it
    const rows = await readXlsxFile(bufferToStream(req.file.buffer));
    // TODO: validate schema
    let students = parseExcel(rows);
    addUniversityPublicKey(students, req.body.privateKeyHex);
    addKeyPairIfNeed(students);
    // const payload = preparePayload(students);
    try {
      // const response = await sendToBKC(payload, req.body.privateKeyHex);
      // addTxid(students, response.data.transactions, "studentId");
      addCidAsFirstTimePw(students);
      addRole(students, ROLE.STUDENT);
      const insertedIds = await createAccount(students);
      addUid(students, insertedIds);
      const result = await saveProfiles(students, "StudentHistory", req.file.originalname);
      res.json(result.ops[0]);
    } catch (error) {
      console.error(error);
      return res.status(502).send(error);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
