const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const readXlsxFile = require("read-excel-file/node");
const { authen, author } = require("../../acc/protect-middleware");
const connection = require("../../../db");
// const generator = require("generate-password");
// const bcrypt = require("bcryptjs");
const { ROLE } = require("../../acc/role");

const bip39 = require("bip39");
const HdKey = require("hdkey");
const secp256k1 = require("secp256k1");

const { Duplex } = require("stream");
function bufferToStream(myBuuffer) {
  let tmp = new Duplex();
  tmp.push(myBuuffer);
  tmp.push(null);
  return tmp;
}

router.post(
  "/create-student",
  authen,
  author(ROLE.STAFF),
  upload.single("excel-file"),
  async (req, res) => {
    try {
      const studentHistoryCol = (await connection)
        .db()
        .collection("StudentHistory");
      const hdKey = HdKey.fromMasterSeed(
        bip39.mnemonicToSeedSync(bip39.generateMnemonic())
      );
      readXlsxFile(bufferToStream(req.file.buffer)).then(async (rows) => {
        // skip header
        rows.shift();
        // parse excel
        const students = rows.map((row, index) => {
          const path = "m/44'/0'/0'/0/" + index;
          const newAccNode = hdKey.derive(path);
          let student = {
            studentId: row[0].toString(),
            name: row[1],
            birthday: row[2].toString(),
            class: row[3],
            publicKey: newAccNode.publicKey.toString("hex"),
            publicKey65: Buffer.from(
              secp256k1.publicKeyCreate(newAccNode.privateKey, false)
            ).toString("hex"),
            privateKey: newAccNode.privateKey.toString("hex"),
          };
          return student;
        });

        const insertStudentHistoryResult = await studentHistoryCol.insertOne({
          time: new Date().toISOString().split("T")[0],
          profiles: students,
          uid: req.user.uid,
        });
        res.json(insertStudentHistoryResult.ops[0]);
      });
    } catch (error) {
      res.status(500).json(error.toString());
    }
  }
);

router.get("/student-history", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const studentHistoryCol = (await connection)
      .db()
      .collection("StudentHistory");
    const result = await studentHistoryCol
      .find({ uid: req.user.uid })
      .toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

module.exports = router;
