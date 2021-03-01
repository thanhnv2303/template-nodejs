const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../db");

const readXlsxFile = require("read-excel-file/node");
const axios = require("axios").default;

const { bufferToStream } = require("../utils");
const { parseExcel, getTeacherById, getBureauById, getStudentsByIds } = require("./helper");

router.post("/v1.2/upload-classes", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const classCol = (await connection).db().collection("Class");
    const rows = await readXlsxFile(bufferToStream(req.file.buffer));
    const records = parseExcel(rows);

    // group studentIds by classId
    const classId2StudentIds = records.reduce((accumulator, record) => {
      accumulator[record.classId] = [...(accumulator[record.classId] || []), record.studentId];
      return accumulator;
    }, {});

    // fill other info,
    const simpleClasses = Object.entries(classId2StudentIds).map((entry) => {
      const classInfo = records.find((record) => record.classId == entry[0]);
      return {
        semester: classInfo.semester,
        classId: entry[0],
        subject: {
          subjectId: classInfo.subjectId,
          subjectName: classInfo.subjectName,
          credit: classInfo.credit,
        },
        note: classInfo.note,
        teacherId: classInfo.teacherId,
        bureauId: classInfo.bureauId,
        studentIds: entry[1],
      };
    });

    // pre-join students' info, teacher info, bureau info
    const classesPromises = simpleClasses.map(async (claxx) => {
      // TODO: if not found item, --> res to FE to notif user
      claxx.teacher = await getTeacherById(claxx.teacherId);
      claxx.bureau = await getBureauById(claxx.bureauId);
      claxx.students = await getStudentsByIds(claxx.studentIds);
      return claxx;
    });

    let classes = await Promise.all(classesPromises);

    //
    const payload = classes.map((cls) => ({
      classId: cls.classId,
      teacherPublicKey: cls.teacher.publicKey,
      bureauPublicKey: cls.bureau.publicKey,
    }));

    try {
      const response = await axios.post("/create_classes", {
        privateKeyHex: req.body.privateKeyHex,
        classes: payload,
      });

      classes.forEach((clx) => {
        clx.txid = response.data.transactions.find((tx) => tx.classId === clx.classId).transactionId;
      });

      const result = await classCol.insertMany(classes);
      res.json(result.ops);
    } catch (error) {
      console.error(error);
      res.status(502).send(error);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/v1.2/classes", authen, author(ROLE.STAFF), async (req, res) => {
  const classCol = (await connection).db().collection("Class");
  // const docs = await classCol.find({ uid: req.user.uid }).sort({ uploadTimestamp: -1 }).toArray();
  const docs = await classCol.find({}).sort({ uploadTimestamp: -1 }).toArray();
  res.json(docs);
});

module.exports = router;
