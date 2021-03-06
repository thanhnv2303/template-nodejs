const express = require("express");
const router = express.Router();

router.use(require("./make-request"));
router.use(require("./voting"));
router.use(require("./upload-teacher"));
router.use(require("./upload-student"));
router.use(require("./upload-class"));

router.use(require("./upload-certificate"));
router.use(require("./revoke-certificate"));
module.exports = router;
