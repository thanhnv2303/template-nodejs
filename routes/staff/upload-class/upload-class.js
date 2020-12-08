const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const readXlsxFile = require("read-excel-file/node");
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const { ROLE } = require("../../acc/ROLE");

const { Duplex } = require("stream");
const { uid } = require("uid");
function bufferToStream(myBuuffer) {
  let tmp = new Duplex();
  tmp.push(myBuuffer);
  tmp.push(null);
  return tmp;
}

router.post("/upload-classes", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const classCol = (await connection).db().collection("Class");
    readXlsxFile(bufferToStream(req.file.buffer)).then(async (rows) => {
      // skip header
      rows.shift();
      // parse excel
      const classes = rows.map(async (row) => {
        let claxx = {
          semester: row[0],
          subjectId: row[1],
          classId: row[2],
          teacherId: row[3],
          studentIds: row[4],
          timestamp: Date.now(),
          id: uid(),
        };
        claxx.subject = await getSubjectById(claxx.subjectId);
        claxx.teacher = await getTeacherById(claxx.teacherId);
        claxx.students = await getStudentsByIds(claxx.studentIds);
        return claxx;
      });
      const result = await classCol.insertMany(classes);
      res.json(result.ops);
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/classes", authen, author(ROLE.STAFF), async (req, res) => {
  const classCol = (await connection).db().collection("Class");
  const docs = await classCol.find({}).sort({ timestamp: -1 }).toArray();
  res.json(docs);
});

// helper functions
async function getSubjectById(subjectId) {
  const subjectCol = (await connection).db().collection("Subject");
  return subjectCol.findOne({ subjectId });
}

async function getTeacherById(teacherId) {
  const teacherHistoryCol = (await connection).db().collection("TeacherHistory");
  const doc = await teacherHistoryCol.findOne({ "profiles.teacherId": teacherId }, { projection: { "profiles.$": 1, _id: 0 } });
  return doc ? doc.profiles[0] : null;
}

async function getStudentsByIds(studentIdsString) {
  const studentHistoryCol = (await connection).db().collection("StudentHistory");
}

module.exports = router;
