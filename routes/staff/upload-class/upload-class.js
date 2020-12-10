const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const readXlsxFile = require("read-excel-file/node");
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const { ROLE } = require("../../acc/ROLE");

const { Duplex } = require("stream");
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
      const classesPromises = rows.map(async (row) => {
        let claxx = {
          semester: row[0].toString(),
          subjectId: row[1].toString(),
          classId: row[2].toString(),
          teacherId: row[3].toString(),
          bureauId: row[4].toString(),
          studentIds: row[5],
          uploadTimestamp: Date.now(),
        };
        // join on write, read-ready pattern
        claxx.subject = await getSubjectById(claxx.subjectId);
        claxx.teacher = await getTeacherById(claxx.teacherId);
        claxx.bureau = await getBureauById(claxx.bureauId);
        claxx.students = await getStudentsByIds(claxx.studentIds);
        return claxx;
      });
      const classes = await Promise.all(classesPromises);
      // provide priviledge for teacher to write point of that class
      // get ids, addresses, ....
      const result = await classCol.insertMany(classes);
      res.json(result.ops);
    });
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

router.get("/classes", authen, author(ROLE.STAFF), async (req, res) => {
  const classCol = (await connection).db().collection("Class");
  const docs = await classCol.find({}).sort({ uploadTimestamp: -1 }).toArray();
  res.json(docs);
});

// helper functions
async function getSubjectById(subjectId) {
  const subjectCol = (await connection).db().collection("Subject");
  return subjectCol.findOne({ subjectId });
}

async function getBureauById(bureauId) {
  const bureauHistoryCol = (await connection).db().collection("BureauHistory");
  const doc = await bureauHistoryCol.findOne({ "profiles.bureauId": bureauId }, { projection: { "profiles.$": 1, _id: 0 } });
  return doc ? doc.profiles[0] : null;
}
async function getTeacherById(teacherId) {
  const teacherHistoryCol = (await connection).db().collection("TeacherHistory");
  const doc = await teacherHistoryCol.findOne({ "profiles.teacherId": teacherId }, { projection: { "profiles.$": 1, _id: 0 } });
  return doc ? doc.profiles[0] : null;
}

async function getStudentsByIds(studentIdsString) {
  const studentHistoryCol = (await connection).db().collection("StudentHistory");
  const studentIds = studentIdsString.split(",").map((sid) => sid.trim());
  const studentPromises = studentIds.map(async (studentId) => {
    const doc = await studentHistoryCol.findOne({ "profiles.studentId": studentId }, { projection: { "profiles.$": 1, _id: 0 } });
    return doc ? doc.profiles[0] : null;
  });
  return Promise.all(studentPromises);
}

module.exports = router;
