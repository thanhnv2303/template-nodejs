const express = require("express");
const router = express.Router();

router.use("/staff", require("./staff"));
router.use("/teacher", require("./teacher"));

module.exports = router;
