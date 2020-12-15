const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const readXlsxFile = require("read-excel-file/node");
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const generator = require("generate-password");
const bcrypt = require("bcryptjs");
const { ROLE } = require("../../acc/ROLE");
const axios = require("axios").default;

const { Duplex } = require("stream");
function bufferToStream(myBuuffer) {
  let tmp = new Duplex();
  tmp.push(myBuuffer);
  tmp.push(null);
  return tmp;
}

router.post("/create-teacher", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const uniProfileCol = (await connection).db().collection("UniversityProfile");
    const staffUID = req.user.uid;
    const universityPublicKey = (await uniProfileCol.findOne({ uid: staffUID })).pubkey;
    const accCol = (await connection).db().collection("Account");
    const teacherHistoryCol = (await connection).db().collection("TeacherHistory");

    readXlsxFile(bufferToStream(req.file.buffer)).then(async (rows) => {
      let teachers = parseTeacher(rows, universityPublicKey);
      const payload = teachers.map((teacher) => ({ ...teacher, email: null }));

      try {
        const response = await axios.post("/create_teachers", { privateKeyHex: req.body.privateKeyHex, profiles: payload });
        teachers = addAccountInfo(teachers);
        // TODO: check if emails exits
        const accounts = teachers.map((teacher) => ({ email: teacher.email, hashedPassword: teacher.hashedPassword, role: teacher.role }));
        const insertedIds = (await accCol.insertMany(accounts)).insertedIds;
        const profiles = teachers.map((teacher, index) => ({
          ...teacher,
          uid: insertedIds[index],
          txid: getTransactionIdByTeacherId(response.data, teacher.teacherId),
        }));
        // create history
        const insertTeacherHistoryResult = await teacherHistoryCol.insertOne({
          time: new Date().toISOString().split("T")[0],
          profiles: profiles,
          uid: req.user.uid,
        });
        res.json(insertTeacherHistoryResult.ops[0]);
      } catch (error) {
        res.status(502).json({ msg: "Không thể tạo các transaction: " + error.response.data.error });
      }
    });
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

function parseTeacher(rows, universityPublicKey) {
  // skip header
  rows.shift();
  return rows.map((row) => ({
    teacherId: row[0].toString(),
    name: row[1],
    email: row[2],
    department: row[3],
    publicKey: row[4],
    universityPublicKey,
  }));
}

function addAccountInfo(teachers) {
  return teachers.map((teacher) => {
    let randomPassword = generator.generate({ length: 8, numbers: true });
    teacher.firstTimePassword = randomPassword;
    const salt = bcrypt.genSaltSync();
    let hashedPassword = bcrypt.hashSync(randomPassword, salt);
    teacher.hashedPassword = hashedPassword;
    teacher.role = ROLE.TEACHER;
    return teacher;
  });
}

function getTransactionIdByTeacherId(response, teacherId) {
  const txs = response.transactions;
  const tx = txs.find((tx) => tx.teacherId === teacherId);
  return tx.transactionId;
}

router.get("/teacher-history", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const teacherHistoryCol = (await connection).db().collection("TeacherHistory");
    const result = await teacherHistoryCol.find({ uid: req.user.uid }).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

module.exports = router;
