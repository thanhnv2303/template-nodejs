const express = require("express");
const router = express.Router();

router.use(require("./profile"));
router.use(require("./submit-grade"));

module.exports = router;
