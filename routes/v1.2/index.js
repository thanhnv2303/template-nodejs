const express = require("express");
const router = express.Router();

router.use("/acc", require("./acc"));
router.use("/acc/2fa", require("./acc/2FA"));
router.use("/staff", require("./staff"));
router.use("/teacher", require("./teacher"));
router.use("/student", require("./student"));
router.use("/events", require("./events"));

module.exports = router;
