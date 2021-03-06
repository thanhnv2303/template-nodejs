const express = require("express");
const router = express.Router();

router.use(require("./staff"));
router.use(require("./teacher/teacher-router"));
router.use(require("./student"));

module.exports = router;
