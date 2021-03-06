const express = require("express");
const router = express.Router();

router.use(require("./make-request"));
router.use(require("./voting"));
router.use(require("./upload-teacher"));
router.use(require("./upload-student"));

router.use(require("./upload-subject/upload-subject"));
router.use(require("./upload-class/upload-class"));
router.use(require("./upload-class/upload-class_v1.2"));
router.use(require("./upload-certificate/upload-certificate"));
router.use(require("./revoke-certificate"));
module.exports = router;
