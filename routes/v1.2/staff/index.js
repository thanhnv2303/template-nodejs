const express = require("express");
const router = express.Router();

router.use(require("./register"));
router.use(require("./voting"));
router.use(require("./upload-teacher"));
router.use(require("./upload-student"));
router.use(require("./upload-class"));
router.use(require("./certificate-apis"));

module.exports = router;
