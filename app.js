const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
require("dotenv").config();

const cors = require("cors");
app.use(cors());

const accRouter = require("./routes/acc/acc-router");
app.use("/acc/", accRouter);

const staffRouter = require("./routes/staff/staff-router");
app.use("/staff", staffRouter);

app.listen(8003, () => {
  console.log("App listening on port 8003!");
});
