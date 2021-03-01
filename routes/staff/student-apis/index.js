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

const axios = require("axios").default;

const generator = require("generate-password");
const bcrypt = require("bcryptjs");

const { Duplex } = require("stream");
function bufferToStream(myBuuffer) {
  let tmp = new Duplex();
  tmp.push(myBuuffer);
  tmp.push(null);
  return tmp;
}

router.post("/create-student", authen, author(ROLE.STAFF), upload.single("excel-file"), async (req, res) => {
  try {
    const studentHistoryCol = (await connection).db().collection("StudentHistory");
    const accCol = (await connection).db().collection("Account");

    const hdKey = HdKey.fromMasterSeed(bip39.mnemonicToSeedSync(bip39.generateMnemonic()));
    readXlsxFile(bufferToStream(req.file.buffer)).then(async (rows) => {
      // skip header
      rows.shift();
      // parse excel
      let students = rows.map((row, index) => {
        const path = "m/44'/0'/0'/0/" + index;
        const newAccNode = hdKey.derive(path);
        const eduProgram = { name: row[8], totalCredit: row[9], minYear: row[10], maxYear: row[11] };
        let student = {
          studentId: row[0].toString(),
          name: row[1],
          birthday: row[2]?.toString(),
          gender: row[3],
          email: row[4],
          genaration: row[5],
          class: row[6],
          school: row[7], // equivalent deparment
          eduProgram,
          publicKey: newAccNode.publicKey.toString("hex"),
          publicKey65: Buffer.from(secp256k1.publicKeyCreate(newAccNode.privateKey, false)).toString("hex"),
          privateKey: newAccNode.privateKey.toString("hex"),
        };
        return student;
      });

      // TODO: send create student to bkc
      const payload = students.map((student) => {
        let { publicKey, eduProgram } = student;
        return { publicKey, eduProgram };
      });
      try {
        // send payload
        // TODO: uncomment this when bkc api ready
        // const response = await axios.post("/create-students", {
        //   privateKeyHex: req.body.privateKeyHex,
        //   profiles: payload,
        // });
        // gen pw
        students = students.map((student) => {
          let randomPassword = generator.generate({
            length: 8,
            numbers: true,
          });
          student.firstTimePassword = randomPassword;
          const salt = bcrypt.genSaltSync();
          let hashedPassword = bcrypt.hashSync(randomPassword, salt);
          student.hashedPassword = hashedPassword;
          student.role = ROLE.STUDENT;
          return student;
        });
        // create acc
        const accounts = students.map((student) => ({
          email: student.email,
          hashedPassword: student.hashedPassword,
          role: student.role,
        }));
        // save acc
        const insertedIds = (await accCol.insertMany(accounts)).insertedIds;
        // add Txid
        const profiles = students.map((student, index) => ({
          ...student,
          uid: insertedIds[index],
          // TODO: uncomment this when bkc api ready
          // txid: getTransactionIdByStudentId(response.data, student.studentId),
        }));
        // save profile
        const insertStudentHistoryResult = await studentHistoryCol.insertOne({
          time: new Date().toISOString().split("T")[0],
          profiles: profiles,
          uid: req.user.uid,
        });
        res.json(insertStudentHistoryResult.ops[0]);
      } catch (error) {
        console.error(error);
        return res.status(504).send(error);
      }
    });
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

function getTransactionIdByStudentId(data, studentId) {
  const txs = data.transactions;
  const tx = txs.find((tx) => tx.studentId === studentId);
  return tx.transactionId;
}

router.get("/student-history", authen, author(ROLE.STAFF), async (req, res) => {
  try {
    const studentHistoryCol = (await connection).db().collection("StudentHistory");
    const result = await studentHistoryCol.find({ uid: req.user.uid }).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json(error.toString());
  }
});

module.exports = router;
