const express = require("express");
const router = express.Router();

router.use(require("./profile/profile"));
router.use(require("./submit-point/submit-point"));

module.exports = router;
