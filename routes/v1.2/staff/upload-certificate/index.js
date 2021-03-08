const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");

const readXlsxFile = require("read-excel-file/node");
const axios = require("axios").default;
const { bufferToStream, addTxid } = require("../utils");
const {
  parseExcel,
  addUniversityName,
  addStudentInfoByStudentId,
  addEncrypt,
  addHashCert,
  addTimestamp,
  addType,
  preparePayload,
} = require("./helper");

//
router.get("/certificates", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const coll = (await connection).db().collection("Certificate");
    const docs = await coll.find({}).toArray();
    return res.json(docs);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

//
router.post("/upload-certificates", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const rows = await readXlsxFile(bufferToStream(req.file.buffer));
    let certs = parseExcel(rows);

    await addUniversityName(certs);
    certs = await addStudentInfoByStudentId(certs);
    addEncrypt(certs);
    addHashCert(certs);

    const payload = preparePayload(certs);
    try {
      const response = await axios.post("/staff/create-certificates", {
        privateKeyHex: req.body.privateKeyHex,
        certificates: payload,
      });
      addTxid(certs, response.data.transactions, "studentPublicKey");
      certs.forEach((cert) => (cert.type = "create")); // event type cert: create, revoke, reactive, modify
      certs.forEach((cert) => (cert.version = 1)); // for each event, version increase 1
      certs.forEach((cert) => (cert.timestamp = Date.now())); // to know what newest
      const certColl = (await connection).db().collection("Certificate");
      const result = await certColl.insertMany(certs);
      res.json(result.ops);
    } catch (error) {
      console.error(error);
      if (error.response) return res.status(502).send(error.response.data);
      else return res.status(500).send(error.toString());
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
  }
});

module.exports = router;
