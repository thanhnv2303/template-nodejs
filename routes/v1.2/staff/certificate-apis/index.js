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
const { parseExcel, addUniversityName, addStudentInfoByStudentId, addEncrypt, addHashCert, preparePayload } = require("./helper");

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

router.get("/certificate", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const studentId = req.query.studentId.trim();
    const col = (await connection).db().collection("Certificate");
    const docs = await col.find({ studentId: studentId }).toArray();
    docs.sort((a, b) => b.timestamp - a.timestamp);
    return res.json(docs);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.toString());
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

router.post("/revoke-certificate", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const privateKeyHex = req.body.privateKeyHex;
    const cert = req.body.cert;
    const { eduProgramId, studentPublicKey } = cert;

    try {
      // const response = await axios.post("/staff/revoke-certificate", { privateKeyHex, eduProgramId, studentPublicKey });
      const response = await Promise.resolve({
        data: { transactionId: "0ee367bf3a412db7793f2d0b3ec3a9871d78601cd5321e6b335503e4d9284572532" },
      });
      cert.txid = response.data.transactionId;
      cert.timestamp = Date.now();
      cert.type = "revoke";
      cert.version = cert.version + 1;
      delete cert._id;
      const col = (await connection).db().collection("Certificate");
      const insertResult = await col.insertOne(cert);
      return res.json(insertResult.ops[0]);
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

router.post("/reactive-certificate", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const privateKeyHex = req.body.privateKeyHex;
    const cert = req.body.cert;
    const { eduProgramId, studentPublicKey } = cert;

    try {
      // const response = await axios.post("/staff/reactive-certificate", { privateKeyHex, eduProgramId, studentPublicKey });
      const response = await Promise.resolve({
        data: { transactionId: "2db7793f2d0b3ec3a9871d78601cd5321e6b335503e4d9284572532000" },
      });
      cert.txid = response.data.transactionId;
      cert.timestamp = Date.now();
      cert.type = "reactive";
      cert.version = cert.version + 1;
      delete cert._id;
      const col = (await connection).db().collection("Certificate");
      const insertResult = await col.insertOne(cert);
      return res.json(insertResult.ops[0]);
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
