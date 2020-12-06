const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
require("dotenv").config();

const cors = require("cors");
app.use(cors());

const accRouter = require("./routes/acc/acc-router");
app.use(accRouter);

const makeRequest = require("./routes/make-request/make-request");
app.use(makeRequest);

const votingRouter = require("./routes/voting/voting-router");
app.use(votingRouter);

const creatBureau = require("./routes/create-bureau/create-bureau");
app.use(creatBureau);

app.listen(8003, () => {
  console.log("App listening on port 8003!");
});
