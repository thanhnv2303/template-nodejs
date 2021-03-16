const express = require("express");
const router = express.Router();

router.use(require("./profile"));
router.use(require("./submit-grade"));
router.use(require("./edit-grade"));

module.exports = router;
