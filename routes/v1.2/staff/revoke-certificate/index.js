const express = require("express");
const router = express.Router();

const { authen, author } = require("../../acc/protect-middleware");
const { ROLE } = require("../../acc/role");
const connection = require("../../../../db");
const { default: axios } = require("axios");

router.get("/certificate", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const studentId = req.query.studentId;
    const col = (await connection).db().collection("Certificate");
    const docs = await col.find({ studentId: studentId }).toArray();
    docs.sort((a, b) => b.timestamp - a.timestamp);
    return res.json(docs);
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
      delete cert._id;
      const col = (await connection).db().collection("Certificate");
      const result = await col.insertOne(cert);
      return res.json(result);
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
