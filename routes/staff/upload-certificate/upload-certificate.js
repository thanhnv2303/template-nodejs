const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const readXlsxFile = require("read-excel-file/node");
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
const { ROLE } = require("../../acc/ROLE");
const axios = require("axios").default;
const ecies = require("ecies-geth");

const { Duplex } = require("stream");
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
      let certificatePromises = rows.map(async (row) => {
        let certificate = {
          name: row[0],
          birthday: row[1].toISOString().split("T")[0],
          gender: row[2],
          university: row[3],
          faculty: row[4],
          degree: row[5],
          gradyear: row[6].toString(),
          level: row[7],
          eduform: row[8],
          issuelocation: row[9],
          issuedate: row[10],
          headmaster: row[11],
          regisno: row[12].toString(),
          globalregisno: row[13].toString(),
          studentId: row[14].toString(),
          // uploadTimestamp: Date.now(),
          uid: req.user.uid,
        };
        const student = await getStudentByStudentId(certificate.studentId);
        certificate.studentPublicKey = student.publicKey;
        return certificate;
      });
      let certificates = await Promise.all(certificatePromises);

      // encrypt data
      let cipherPromises = certificates.map(async (cert) => {
        const publicKeyHex65 = "04" + cert.studentPublicKey;
        const cipher = (await ecies.encrypt(Buffer.from(publicKeyHex65, "hex"), Buffer.from(JSON.stringify(cert)))).toString("hex");
        return cipher;
      });
      const ciphers = await Promise.all(cipherPromises);
      const payload = certificates.map((cert, index) => ({
        globalregisno: cert.globalregisno,
        studentPublicKey: cert.studentPublicKey,
        cipher: ciphers[index],
      }));
      // post to bkc
      try {
        const response = await axios.post("/create_certs", { privateKeyHex: req.body.privateKeyHex, certificates: payload });
        certificates = certificates.map((cert) => ({ ...cert, txid: getTxidByGlobalregisno(response.data, cert.globalregisno) }));
        const result = await subjectCol.insertMany(certificates);
        res.json(result.ops);
      } catch (error) {
        res.status(502).json({ msg: "Không thể tạo tx: " + error.response.data.error });
      }
    });
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

async function getStudentByStudentId(studentId) {
  const studentHistoryCol = (await connection).db().collection("StudentHistory");
  const doc = await studentHistoryCol.findOne({ "profiles.studentId": studentId }, { projection: { "profiles.$": 1, _id: 0 } });
  return doc ? doc.profiles[0] : null;
}

function getTxidByGlobalregisno(data, grn) {
  const txs = data.transactions;
  const tx = txs.find((tx) => (tx.globalregisno = grn));
  return tx.transactionId;
}

router.get("/certificates", authen, author(ROLE.STAFF), async (req, res) => {
  const subjectCol = (await connection).db().collection("Certificate");
  const docs = await subjectCol.find({ uid: req.user.uid }).sort({ uploadTimestamp: -1 }).toArray();
  res.json(docs);
});

module.exports = router;
