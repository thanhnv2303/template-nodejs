const express = require("express");
const router = express.Router();

router.use(require("./profile/profile"));

module.exports = router;
