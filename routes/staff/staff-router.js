const express = require("express");
const router = express.Router();

const makeRequestRouter = require("./make-request/make-request");
router.use(makeRequestRouter);

const votingRouter = require("./voting/voting-router");
router.use(votingRouter);

const createBureauRouter = require("./create-bureau/create-bureau");
router.use(createBureauRouter);

module.exports = router;
