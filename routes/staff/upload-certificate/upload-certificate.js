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

router.post("/upload-certificates", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const subjectCol = (await connection).db().collection("Certificate");
    readXlsxFile(bufferToStream(req.file.buffer)).then(async (rows) => {
      // skip header
      rows.shift();
      // parse excel
      const certificates = rows.map((row, index) => {
        let certificate = {
          name: row[0],
          birthday: row[1],
          gender: row[2],
          university: row[3],
          faculty: row[4],
          degree: row[5],
          gradyear: row[6],
          level: row[7],
          eduform: row[8],
          issuelocation: row[9],
          issuedate: row[10],
          headmaster: row[11],
          regisno: row[12],
          globalregisno: row[13],
          uploadTimestamp: Date.now(),
          id: uid(),
        };
        return certificate;
      });
      const result = await subjectCol.insertMany(certificates);
      res.json(result.ops);
      // TODO: send to blockchain too
    });
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

router.get("/certificates", authen, author(ROLE.STAFF), async (req, res) => {
  const subjectCol = (await connection).db().collection("Certificate");
  const docs = await subjectCol.find({}).sort({ uploadTimestamp: -1 }).toArray();
  res.json(docs);
});

module.exports = router;
