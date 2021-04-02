const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");

const axios = require("axios").default;
const readXlsxFile = require("read-excel-file/node");
const { bufferToStream, addTxid } = require("../utils");
const { parseExcel, addUniversityName, addStudentInfoByStudentId, preparePayload } = require("./helper");
const { hashObject } = require("../../../utils");
const { encrypt } = require("eciesjs");

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
    const doc = await col.findOne({ studentId: studentId });
    return res.json(doc);
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
    const plains = await addStudentInfoByStudentId(certs);
    const hashes = plains.map((plain) => hashObject(plain));
    const ciphers = plains.map((plain) => encrypt(plain.publicKey, Buffer.from(JSON.stringify(plain))).toString("hex"));
    certs = plains.map((plain, index) => ({ ...plain, hash: hashes[index], cipher: ciphers[index] }));

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
      const documents = certs.map((cert) => ({
        studentId: cert.studentId,
        versions: [cert],
      }));
      const certColl = (await connection).db().collection("Certificate");
      const result = await certColl.insertMany(documents);
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
      const response = await axios.post("/staff/revoke-certificate", { privateKeyHex, eduProgramId, studentPublicKey });
      // const response = { data: { transactionId: randomTxid() } };
      cert.txid = response.data.transactionId;
      cert.timestamp = Date.now();
      cert.type = "revoke";
      cert.version = cert.version + 1;
      delete cert._id;
      const col = (await connection).db().collection("Certificate");
      await col.updateOne({ studentId: cert.studentId }, { $push: { versions: cert } });
      const updatedDoc = await col.findOne({ studentId: cert.studentId });
      return res.json(updatedDoc);
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
      const response = await axios.post("/staff/reactive-certificate", { privateKeyHex, eduProgramId, studentPublicKey });
      // const response = { data: { transactionId: randomTxid() } };
      cert.txid = response.data.transactionId;
      cert.timestamp = Date.now();
      cert.type = "reactive";
      cert.version = cert.version + 1;
      delete cert._id;
      const col = (await connection).db().collection("Certificate");
      await col.updateOne({ studentId: cert.studentId }, { $push: { versions: cert } });
      const updatedDoc = await col.findOne({ studentId: cert.studentId });
      return res.json(updatedDoc);
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
