const express = require("express");
const router = express.Router();

router.use(require("./profile"));
router.use(require("./submit-point"));

module.exports = router;
