const express = require("express");
const router = express.Router();
const { authen, author } = require("../acc/protect-middleware");
const { ROLE } = require("../acc/role");
const connection = require("../../../db");
const axios = require("axios").default;
const ObjectID = require("mongodb").ObjectID;
const { encrypt } = require("eciesjs");
const { hashObject } = require("../../utils");

const marks = [7.5, 8, 8.5, 9, 9.5, 10];

router.post("/gen-grade", async (req, res) => {
  try {
    const classCol = (await connection).db().collection("Class");
    const classIds = req.body.classIds;
    // console.log("🚧 --> router.post --> classIds", classIds);

    const promises = classIds.map(async (classId, index) => {
      try {
        const claxx = await classCol.findOne({ classId });
        if (claxx) {
          claxx.students.forEach((student) => {
            student.versions = [
              {
                halfSemesterPoint: marks[Math.floor(Math.random() * marks.length)],
                finalSemesterPoint: marks[Math.floor(Math.random() * marks.length)],
              },
            ];
          });

          const privateKeyHex = claxx.teacher.privateKey;

          const payload = preparePayload(privateKeyHex, claxx);
          try {
            console.log(`${index}/${classIds.length} Start send grade for class ${classId}`);
            const response = await axios.post("/teacher/submit-grade", payload);
            console.log(`${index}/${classIds.length}  Send grade for class ${classId} ok`);
            claxx.students.forEach((student) => (student.versions[0].txid = findTxid(response.data.transactions, student.publicKey)));
            claxx.students.forEach((student) => (student.versions[0].timestamp = Date.now()));
            await classCol.updateOne({ classId: claxx.classId }, { $set: { students: claxx.students, isSubmited: true } });
            claxx.isSubmited = true;
            return { ok: 1 };
          } catch (error) {
            console.error("Error when send tx for: ", classId, error);
            throw error;
          }
        }
      } catch (error) {
        console.error("Error while gen grade for: " + classId, error);
        throw error;
      }
    });

    await Promise.all(promises);
    return res.json("gen grade done!");
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

function preparePayload(privateKeyHex, claxx) {
  const grades = claxx.students.map((student) => {
    const plain = {
      semester: claxx.semester,
      subject: claxx.subject,
      classId: claxx.classId,
      teacherId: claxx.teacher.teacherId,
      teacherName: claxx.teacher.name,
      department: claxx.teacher.department,
      studentId: student.studentId,
      studentName: student.name,
      // versions: student.versions,
      halfSemesterPoint: student.versions[0].halfSemesterPoint,
      finalSemesterPoint: student.versions[0].finalSemesterPoint,
    };
    const cipher = encrypt(student.publicKey, Buffer.from(JSON.stringify(plain))).toString("hex");
    const hash = hashObject(plain);
    return { studentPublicKey: student.publicKey, eduProgramId: student.eduProgram.eduProgramId, cipher, hash };
  });
  return { privateKeyHex, universityPublicKey: claxx.teacher.universityPublicKey, classId: claxx.classId, grades };
}

function findTxid(txs, publicKey) {
  return txs.find((tx) => tx.studentPublicKey === publicKey).transactionId;
}

module.exports = router;
