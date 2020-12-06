const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const readXlsxFile = require("read-excel-file/node");
const { authen } = require("../acc/protect-middleware");
const connection = require("../../db");
const generator = require("generate-password");
const bcrypt = require("bcryptjs");
const ROLE = require("../acc/ROLE");

router.post("/create-bureau", authen, upload.single("excel-file"), async (req, res) => {
  try {
    const accCol = (await connection).db().collection("Account");
    const bureauProfileCol = (await connection).db().collection("BureauProfile");

    readXlsxFile(req.file.buffer).then(async (rows) => {
      // skip header
      rows.shift();

      // parse excel
      const bureaus = [];
      rows.forEach(async (row) => {
        let bureau = {
          bureauId: row[0],
          name: row[1],
          email: row[2],
          department: row[3],
          publicKey: row[4],
        };
        // create pw
        let randomPassword = generator.generate({ length: 8, numbers: true });
        const salt = await bcrypt.genSalt();
        console.log("salt: " + salt);
        let hashedPassword = await bcrypt.hash(randomPassword, salt);

        // insert to Account
        const opResult = await accCol.insertOne({ email: bureau.email, hashedPassword, role: ROLE.BUREAU });

        // inserto BureauProfile
        bureau.uid = opResult.insertedId;
        await bureauProfileCol.insertOne(bureau);

        bureau.password = randomPassword;
        bureaus.push(bureau);
      });

      res.json(bureaus);
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
