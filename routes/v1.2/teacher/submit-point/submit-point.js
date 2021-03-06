const express = require("express");
const router = express.Router();
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../../db");
const { ROLE } = require("../../acc/role");
const axios = require("axios").default;
// const ecies = require("ecies-geth");

router.post("/submit-point", authen, author(ROLE.TEACHER), async (req, res) => {
  try {
    const classCol = (await connection).db().collection("Class");
    const privateKeyHex = req.body.privateKeyHex;
    const claxx = req.body.claxx;
    // require teacher != null
    const universityPublicKey = claxx.teacher.universityPublicKey;
    const payload = await preparePayload(privateKeyHex, universityPublicKey, claxx);
    try {
      const response = await axios.post("/create_subjects", payload);
      const updatedClass = addTxids(claxx, response.data);
      const opResult = await classCol.updateOne({ classId: claxx.classId }, { $set: { students: updatedClass.students } });
      res.json(opResult);
    } catch (error) {
      if (error.response) return res.status(502).json({ msg: error.response.data.error });
      return res.status(502).json({ msg: error });
    }
  } catch (error) {
    res.status(500).send(error);
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
    const publicKeyHex65 = studentAndPoint.publicKey65;
    // const cipher = (await ecies.encrypt(Buffer.from(publicKeyHex65, "hex"), Buffer.from(JSON.stringify(plain)))).toString("hex");
    const cipher = "";
    return { studentPublicKey, studentPublicKey65: publicKeyHex65, cipher };
  });
  const points = await Promise.all(pointPromises);
  return { privateKeyHex, universityPublicKey, classId, points };
}

function addTxids(claxx, data) {
  claxx.students = claxx.students.map((studentAndPoint) => ({
    ...studentAndPoint,
    txid: getTxidByStudentPublicKey(data, studentAndPoint.publicKey),
  }));
  return claxx;
}

function getTxidByStudentPublicKey(data, studentPublicKey) {
  const txs = data.transactions;
  const tx = txs.find((tx) => tx.studentPublicKey === studentPublicKey);
  return tx.transactionId;
}

router.get("/classes/:classId", authen, author(ROLE.TEACHER), async (req, res) => {
  try {
    const classId = req.params.classId;
    const classCol = (await connection).db().collection("Class");
    const docs = await classCol.findOne({ classId: classId });
    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

// FIXME: dev only //
router.post("/fake-submit-point", async (req, res) => {
  const privateKeyHex = req.body.privateKeyHex;
  const classCol = (await connection).db().collection("Class");
  const classes = await classCol.find({}).toArray();
  const length = classes.length;
  classes.forEach((clx, index) => {
    if (index < 20) {
      clx.students.forEach((student) => {
        student.halfSemesterPoint = Math.floor(Math.random() * 4 + 5);
        student.finalSemesterPoint = Math.floor(Math.random() * 4 + 5);
      });
      fakeSendPoint(privateKeyHex, clx, res, classCol);
    }
  });
});

async function fakeSendPoint(privateKeyHex, claxx, res, classCol) {
  try {
    // require teacher != null
    const universityPublicKey = claxx.teacher.universityPublicKey;
    const payload = await preparePayload(privateKeyHex, universityPublicKey, claxx);
    try {
      const response = await axios.post("/create_subjects", payload);
      const updatedClass = addTxid(claxx, response.data);
      const opResult = await classCol.updateOne({ classId: claxx.classId }, { $set: { students: updatedClass.students } });
      res.json(opResult);
    } catch (error) {
      if (error.response) return res.status(502).json({ msg: error.response.data.error });
      return res.status(502).json({ msg: error });
    }
  } catch (error) {
    res.status(500).send(error);
  }
}

module.exports = router;
