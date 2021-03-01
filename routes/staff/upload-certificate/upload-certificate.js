const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../db");

const readXlsxFile = require("read-excel-file/node");
const axios = require("axios").default;
const { bufferToStream, addTxid } = require("../utils");
const { parseExcel, addUniversityName, addStudentInfoByStudentId, encryptCerts, hashCerts, preparePayload } = require("./helper");

router.post("/upload-certificates", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const rows = await readXlsxFile(bufferToStream(req.file.buffer));
    let certs = parseExcel(rows);
    await addUniversityName(certs);
    certs = await addStudentInfoByStudentId(certs);
    const ciphers = encryptCerts(certs);
    const hashes = hashCerts(certs);
    const payload = preparePayload(certs, ciphers, hashes);
    // post to bkc
    try {
      const response = await axios.post("/create_certs", {
        privateKeyHex: req.body.privateKeyHex,
        certificates: payload,
      });
      addTxid(certs, response.data.transactions, "globalregisno");
      const certColl = (await connection).db().collection("Certificate");
      const result = await certColl.insertMany(certs);
      res.json(result.ops);
    } catch (error) {
      console.error(error);
      if (!error.response) return res.status(502).json({ msg: error });
      res.status(502).json({ msg: "Không thể tạo tx: " + error.response.data.error });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
});

router.get("/certificates", authen, author(ROLE.STAFF), async (req, res) => {
  const coll = (await connection).db().collection("Certificate");
  const docs = await coll.find({}).toArray();
  res.json(docs);
});

module.exports = router;
