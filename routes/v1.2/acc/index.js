const router = require("express").Router();
const multer = require("multer");
const upload = multer();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { validate } = require("../../utils");
const { signUpSchema, signInSchema } = require("./schema");

const connection = require("../../../db");
const ACC_COLL_NAME = "Account";
const { ROLE } = require("./role");

// FIXME: account of university is provided, not sign up!!!, remove this api when in production
router.post("/signup", async (req, res) => {
  try {
    const errors = validate(req.body, signUpSchema);
    if (errors) return res.status(400).json(errors);

    const col = (await connection).db().collection(ACC_COLL_NAME);
    const emailExist = await col.findOne({ email: req.body.email });
    if (emailExist) return res.status(400).json({ email: "Email already exists!" });

    const salt = await bcrypt.genSalt();
    req.body.hashedPassword = await bcrypt.hash(req.body.password, salt);
    delete req.body.password;
    delete req.body.repassword;
    req.body.role = ROLE.STAFF;

    const result = await col.insertOne(req.body);
    const token = jwt.sign({ uid: result.insertedId, role: ROLE.STAFF }, process.env.TOKEN_SECRET);

    res.json({ token: token, role: ROLE.STAFF });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
});

router.post("/signin", upload.none(), async (req, res) => {
  try {
    const errors = validate(req.body, signInSchema);
    if (errors) return res.status(400).json(errors);

    const col = (await connection).db().collection(ACC_COLL_NAME);
    const acc = await col.findOne({ email: req.body.email });
    if (!acc) return res.status(400).json({ email: "Account doesn't exists!" });

    if (!bcrypt.compareSync(req.body.password, acc.hashedPassword)) return res.status(400).json({ password: "Incorrect password!" });

    const token = jwt.sign({ uid: acc._id, role: acc.role }, process.env.TOKEN_SECRET);
    res.json({ token: token, role: acc.role });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
});

module.exports = router;
