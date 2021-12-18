const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");

const readXlsxFile = require("read-excel-file/node");
const axios = require("axios").default;

const { bufferToStream } = require("../utils");
const { parseExcel, getTeacherById, getStudentsByIds, parseExcelV122 } = require("./helper");

//
router.get("/classes", authen, author(ROLE.STAFF), async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 10);
  const classCol = (await connection).db().collection("Class");
  const count = await classCol.countDocuments();
  const docs = await classCol.find({}).sort({ uploadTimestamp: -1 }).skip(skip).limit(limit).toArray();
  res.json({ count, docs });
});

// v1.2.2
router.post("/upload-classes", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const rows = await readXlsxFile(bufferToStream(req.file.buffer));
    const records = parseExcelV122(rows);

    // pre-join students' info, teacher info,
    const classesPromises = records.map(async (claxx) => {
      claxx.teacher = await getTeacherById(claxx.teacherId);
      claxx.students = await getStudentsByIds(claxx.studentIds);
      return claxx;
    });
    let classes = await Promise.all(classesPromises);

    const payload = classes.map((cls) => ({
      classId: cls.classId,
      subjectId: cls.subject.subjectId,
      credit: cls.subject.credit,
      teacherPublicKey: cls.teacher.publicKey,
      studentPublicKeys: cls.students.map((std) => std.publicKey),
    }));

    try {
      console.log("Start send create classes: ", payload.slice(0, 2));
      const response = await axios.post("/staff/create-classes", {
        privateKeyHex: req.body.privateKeyHex,
        classes: payload,
      });
      console.log("Create classes ok: ", payload.slice(0, 2));

      classes.forEach((clx) => {
        clx.txid = response.data.transactions.find((tx) => tx.classId === clx.classId).transactionId;
      });
      const classCol = (await connection).db().collection("Class");
      const result = await classCol.insertMany(classes);
      // return res.json({ classIds: classes.map((clx) => clx.classId), status: "success" });
      return res.json(classes);
    } catch (error) {
      console.error(error);
      if (error.response) return res.status(502).send(error.response.data);
      return res.status(500).send(error.toString());
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

// excel file too duplicate info
// router.post("/upload-classes-v1.2.1", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
//   try {
//     const rows = await readXlsxFile(bufferToStream(req.file.buffer));
//     const records = parseExcel(rows);

//     // group studentIds by classId
//     const classId2StudentIds = records.reduce((accumulator, record) => {
//       accumulator[record.classId] = [...(accumulator[record.classId] || []), record.studentId];
//       return accumulator;
//     }, {});

//     // fill other info,
//     const simpleClasses = Object.entries(classId2StudentIds).map((entry) => {
//       const classInfo = records.find((record) => record.classId == entry[0]);
//       return {
//         semester: classInfo.semester,
//         classId: entry[0],
//         subject: {
//           subjectId: classInfo.subjectId,
//           subjectName: classInfo.subjectName,
//           credit: classInfo.credit,
//         },
//         note: classInfo.note,
//         teacherId: classInfo.teacherId,
//         studentIds: entry[1],
//       };
//     });

//     // pre-join students' info, teacher info,
//     const classesPromises = simpleClasses.map(async (claxx) => {
//       // TODO: if not found item, --> res to FE to notif user
//       claxx.teacher = await getTeacherById(claxx.teacherId);
//       claxx.students = await getStudentsByIds(claxx.studentIds);
//       return claxx;
//     });

//     let classes = await Promise.all(classesPromises);

//     //
//     const payload = classes.map((cls) => ({
//       classId: cls.classId,
//       subjectId: cls.subject.subjectId,
//       credit: cls.subject.credit,
//       teacherPublicKey: cls.teacher.publicKey,
//       studentPublicKeys: cls.students.map((std) => std.publicKey),
//     }));

//     try {
//       const response = await axios.post("/staff/create-classes", {
//         privateKeyHex: req.body.privateKeyHex,
//         classes: payload,
//       });
//       // const response = mockupBKCResponse(payload, "classId");
//       classes.forEach((clx) => {
//         clx.txid = response.data.transactions.find((tx) => tx.classId === clx.classId).transactionId;
//       });

//       const classCol = (await connection).db().collection("Class");
//       const result = await classCol.insertMany(classes);
//       res.json(result.ops);
//     } catch (error) {
//       console.error(error);
//       if (error.response) return res.status(502).send(error.response.data);
//       return res.status(500).send(error.toString());
//     }
//   } catch (error) {
//     console.error(error);
//     return res.status(500).send(error.toString());
//   }
// });

module.exports = router;
