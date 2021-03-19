const router = require("express").Router();
const spez = require("speakeasy");
const connection = require("../../../../db");
var { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const { authen } = require("../protect-middleware");

router.post("/registry", authen, async (req, res) => {
  try {
    const secret = spez.generateSecret();
    const accCol = (await connection).db().collection("Account");
    await accCol.updateOne({ _id: ObjectId(req.user.uid) }, { $set: { TwoFASecretBase32: secret.base32, TwoFAVerified: false } });
    return res.json(secret);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

router.post("/verify", authen, async (req, res) => {
  try {
    const accCol = (await connection).db().collection("Account");
    const userAcc = await accCol.findOne({ _id: ObjectId(req.user.uid) });
    const secretBase32 = userAcc.TwoFASecretBase32;
    const verified = spez.totp.verify({ secret: secretBase32, encoding: "base32", token: req.body.OTP });
    if (!verified) {
      return res.json({ ok: false });
    } else {
      const token = jwt.sign({ ...req.user, twoFAVerified: true }, process.env.TOKEN_SECRET);
      return res.json({ ok: true, token });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

router.post("/disable", authen, async (req, res) => {
  try {
    const accCol = (await connection).db().collection("Account");
    await accCol.updateOne({ _id: ObjectId(req.user.uid) }, { $unset: { TwoFASecretBase32: "", TwoFAVerified: "" } });

    const token = jwt.sign({ ...req.user, twoFAVerified: undefined }, process.env.TOKEN_SECRET);
    return res.json({ ok: true, token });
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

module.exports = router;
