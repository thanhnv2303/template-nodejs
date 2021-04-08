const express = require("express");
const app = express();
const https = require("https");
var fs = require("fs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
const axios = require("axios").default;
axios.defaults.baseURL = process.env.REST_API_URL;

const cors = require("cors");
app.use(cors());

// app.use("/api/v1", require("./routes/v1.0"));
app.use("/api/v1.2", require("./routes/v1.2"));

const PORT = process.env.PORT || 8001;

const { initMinistryProfile, initStaffAccount } = require("./init");

https
  .createServer(
    {
      key: fs.readFileSync("/etc/letsencrypt/live/school-backend.b4e.vn/privkey.pem"),
      cert: fs.readFileSync("/etc/letsencrypt/live/school-backend.b4e.vn/fullchain.pem"),
    },
    app
  )
  .listen(PORT, () => {
    console.log(`B4E School Backend listening on port ${PORT}!`);
    initMinistryProfile();
    initStaffAccount();
  });
