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

router.post("/upload-subjects", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const subjectCol = (await connection).db().collection("Subject");
    readXlsxFile(bufferToStream(req.file.buffer)).then(async (rows) => {
      // skip header
      rows.shift();
      // parse excel
      const subjects = rows.map((row, index) => {
        let subject = {
          subjectId: row[0],
          name: row[1],
          semester: row[2],
          credit: row[3],
          note: row[4],
          timestamp: Date.now(),
          id: uid(),
        };
        return subject;
      });
      const result = await subjectCol.insertMany(subjects);
      res.json(result.ops);
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/subjects", authen, author(ROLE.STAFF), async (req, res) => {
  const subjectCol = (await connection).db().collection("Subject");
  const docs = await subjectCol.find({}).sort({ timestamp: -1 }).toArray();
  res.json(docs);
});

module.exports = router;
