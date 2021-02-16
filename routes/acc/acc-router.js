const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connection = require("../../db");
const ACC_COLL_NAME = "Account";
const { signUpSchema, signInSchema } = require("./schema");
const multer = require("multer");
const { ROLE } = require("./role");
const upload = multer();

router.post("/signup", async (req, res) => {
  try {
    // validate submited data
    const { error, value } = signUpSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = {};
      for (let err of error.details) {
        errors[err.context.key] = err.message;
      }
      return res.status(400).json(errors);
    }

    // check if email exists
    const col = (await connection).db().collection(ACC_COLL_NAME);
    const emailExist = await col.findOne({ email: req.body.email });
    if (emailExist) return res.status(400).json({ email: "Email already exists!" });

    // hash pw and save new acc to db
    const salt = await bcrypt.genSalt();
    req.body.hashedPassword = await bcrypt.hash(req.body.password, salt);
    delete req.body.password;
    delete req.body.repassword;

    // set rol
    req.body.role = ROLE.STAFF;

    // create account
    const result = await col.insertOne(req.body);

    //send back token
    const token = jwt.sign({ uid: result.insertedId, role: ROLE.STAFF }, process.env.TOKEN_SECRET);
    res.json({ token: token, role: ROLE.STAFF });
  } catch (error) {
    console.log(error);
    res.status(500).json(error.toString());
  }
});

router.post("/signin", upload.none(), async (req, res) => {
  try {
    // validate
    const { error } = signInSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = {};
      for (let err of error.details) {
        errors[err.context.key] = err.message;
      }
      return res.status(400).json(errors);
    }

    // check if account exists
    const col = (await connection).db().collection(ACC_COLL_NAME);
    const acc = await col.findOne({ email: req.body.email });
    if (!acc) return res.status(400).json({ email: "Account doesn't exists!" });

    // check if pw is correct
    if (!bcrypt.compareSync(req.body.password, acc.hashedPassword)) return res.status(400).json({ password: "Incorrect password!" });

    // send back a token
    const token = jwt.sign({ uid: acc._id, role: acc.role }, process.env.TOKEN_SECRET);
    res.json({ token: token, role: acc.role });
  } catch (error) {
    console.log(error);
    res.status(500).json(error.toString());
  }
});

module.exports = router;
