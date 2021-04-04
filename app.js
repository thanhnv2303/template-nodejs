const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
const axios = require("axios").default;
axios.defaults.baseURL = process.env.REST_API_URL;

const cors = require("cors");
app.use(cors());

// app.use("/api/v1", require("./routes/v1.0"));
app.use("/api/v1.2", require("./routes/v1.2"));

const { initMinistryProfile } = require("./init");
app.listen(8001, () => {
  console.log("App listening on port 8001!");
  initMinistryProfile();
});
