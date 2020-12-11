const express = require("express");
const router = express.Router();
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const { ROLE } = require("../../acc/ROLE");
const axios = require("axios").default;
const ecies = require("ecies-geth");

router.post("/submit-point", authen, author(ROLE.TEACHER), async (req, res) => {
  try {
    const classCol = (await connection).db().collection("Class");
    const privateKeyHex = req.body.privateKeyHex;
    const claxx = req.body.claxx;
    // require teacher != null
    const universityPublicKey = claxx.teacher.universityPublicKey;
    const payload = await preparePayload(privateKeyHex, universityPublicKey, claxx);
    const response = await postPointToBkc(payload);
    if (response.ok) {
      const updatedClass = addTxidnAddress(claxx, response.txids, response.sawtoothStateAddresses);
      const opResult = await classCol.updateOne({ classId: claxx.classId }, { $set: { students: updatedClass.students } });
      res.json(opResult);
    } else {
      res.status(502).json(response.msg);
    }
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

async function preparePayload(privateKeyHex, universityPublicKey, claxx) {
  const semester = claxx.semester;
  const subject = claxx.subject;
  const classId = claxx.classId;
  const teacher = claxx.teacher;
  const bureau = claxx.bureau;
  const pointPromises = claxx.students.map(async (studentAndPoint) => {
    const plain = {
      semester,
      subject,
      classId,
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      department: teacher.department,
      bureauId: bureau.bureauId,
      bureauName: bureau.name,
      studentId: studentAndPoint.studentId,
      studentName: studentAndPoint.name,
      studentClass: studentAndPoint.class,
      halfSemesterPoint: studentAndPoint.halfSemesterPoint,
      finalSemesterPoint: studentAndPoint.finalSemesterPoint,
      // TODO: if you implement A, A+, B.. and pointBase4 -> then add it here too
    };
    const studentPublicKey = studentAndPoint.publicKey;
    const publicKeyHex65 = "04" + studentPublicKey;
    const cipher = (await ecies.encrypt(Buffer.from(publicKeyHex65, "hex"), Buffer.from(JSON.stringify(plain)))).toString("hex");
    return { studentPublicKey, cipher };
  });
  const points = await Promise.all(pointPromises);
  return { privateKeyHex, universityPublicKey, classId, points };
}

async function postPointToBkc(payload) {
  const res = await axios.post("/create_record", payload);
  return res.data;
}

function addTxidnAddress(claxx, txids, ads) {
  claxx.students = claxx.students.map((studentAndPoint, index) => ({ ...studentAndPoint, txid: txids[index], sawtoothStateAddress: ads[index] }));
  return claxx;
}

router.get("/classes/:classId", authen, author(ROLE.TEACHER), async (req, res) => {
  try {
    const classId = req.params.classId;
    const classCol = (await connection).db().collection("Class");
    const docs = await classCol.findOne({ classId: classId });
    res.json(docs);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.toString());
  }
});

module.exports = router;
