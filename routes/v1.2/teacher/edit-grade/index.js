const express = require("express");
const router = express.Router();
const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");
const { encrypt } = require("eciesjs");
const crypto = require("crypto");
const { default: axios } = require("axios");

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

router.post("/edit-grade", authen, author(ROLE.TEACHER), async (req, res) => {
  try {
    // TODO: do we need check if the teacher is actualy teacher this class
    const payload = preparePayload(req.body);
    try {
      const response = await axios.post("/teacher/edit-grade", payload);
      const newVersion = {
        halfSemesterPoint: req.body.halfSemesterPoint,
        finalSemesterPoint: req.body.finalSemesterPoint,
        txid: response.data.txid,
        timestamp: response.data.timestamp,
      };

      const student = req.body.claxx.students.find((std) => std.studentId === req.body.student.studentId);
      student.versions.push(newVersion);

      const col = (await connection).db().collection("Class");
      await col.updateOne({ classId: req.body.claxx.classId }, { $set: { students: req.body.claxx.students } });
      return res.json(newVersion);
    } catch (error) {
      console.error(error);
      if (error.response) return res.status(502).send(error.response.data);
      else return res.status(500).send(error.toString());
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

function preparePayload(body) {
  const { privateKeyHex, claxx, student, halfSemesterPoint, finalSemesterPoint } = body;

  const plain = {
    semester: claxx.semester,
    subject: claxx.subject,
    classId: claxx.classId,
    teacherId: claxx.teacher.teacherId,
    teacherName: claxx.teacher.name,
    department: claxx.teacher.department,
    studentId: student.studentId,
    studentName: student.name,
    halfSemesterPoint,
    finalSemesterPoint,
  };
  const cipher = encrypt(student.publicKey, Buffer.from(JSON.stringify(plain))).toString("hex");
  const hash = crypto.createHash("sha256").update(JSON.stringify(plain)).digest("hex");
  return {
    privateKeyHex,
    classId: claxx.classId,
    studentPublicKey: student.publicKey,
    universityPublicKey: claxx.teacher.universityPublicKey,
    cipher,
    hash,
  };
}

module.exports = router;
