const express = require("express");
const app = express();
const https = require("https");
var fs = require("fs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` }); // docker-compose will provide env var
const axios = require("axios").default;
axios.defaults.baseURL = process.env.REST_API_URL;

const cors = require("cors");
app.use(cors());

// app.use("/api/v1", require("./routes/v1.0"));
app.use("/api/v1.2", require("./routes/v1.2"));

const PORT = process.env.PORT || 8000;

const { initMinistryProfile, initStaffAccount } = require("./init");

https
  .createServer(
    {
      key: fs.readFileSync("/etc/letsencrypt/live/school-backend-2.b4e.vn/privkey.pem"), // need bind mount
      cert: fs.readFileSync("/etc/letsencrypt/live/school-backend-2.b4e.vn/fullchain.pem"), // need bind mount
    },
    app
  )
  .listen(PORT, () => {
    console.log(`B4E School Backend listening on port ${PORT}!`);
    initMinistryProfile();
    initStaffAccount();
  });
