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

const { Duplex } = require("stream");
function bufferToStream(myBuuffer) {
  let tmp = new Duplex();
  tmp.push(myBuuffer);
  tmp.push(null);
  return tmp;
}

router.post("/create-teacher", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const accCol = (await connection).db().collection("Account");
    const teacherHistoryCol = (await connection).db().collection("TeacherHistory");
    readXlsxFile(bufferToStream(req.file.buffer)).then(async (rows) => {
      // skip header
      rows.shift();
      // parse excel
      const teachers = rows.map((row) => {
        let teacher = {
          teacherId: row[0],
          name: row[1],
          email: row[2],
          department: row[3],
          publicKey: row[4],
        };
        // create pw
        let randomPassword = generator.generate({ length: 8, numbers: true });
        teacher.firstTimePassword = randomPassword;
        const salt = bcrypt.genSaltSync();
        let hashedPassword = bcrypt.hashSync(randomPassword, salt);
        teacher.hashedPassword = hashedPassword;
        return teacher;
      });

      const accounts = teachers.map((teacher) => ({ email: teacher.email, hashedPassword: teacher.hashedPassword, role: ROLE.TEACHER }));
      const insertedIds = (await accCol.insertMany(accounts)).insertedIds;
      const profiles = teachers.map((teacher, index) => ({ ...teacher, uid: insertedIds[index] }));
      const insertTeacherHistoryResult = await teacherHistoryCol.insertOne({ time: new Date().toISOString().split("T")[0], profiles: profiles });
      res.json(insertTeacherHistoryResult.ops[0]);
      await createTeacherOnBlockchain(req.body.privateKeyHex, profiles);
    });
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

// Talk to sawtooth-cli
async function createTeacherOnBlockchain(privateKeyHex, bureausJson) {
  return Promise.resolve({ ok: true });
}

router.get("/teacher-history", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const teacherHistoryCol = (await connection).db().collection("TeacherHistory");
    const result = await teacherHistoryCol.find({}).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

module.exports = router;
