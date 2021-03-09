const connection = require("./db");
const ministryProfile = require("./resources/MinistryProfile.json");

async function initMinistryProfile() {
  const col = (await connection).db().collection("MinistryProfile");
  const doc = await col.findOne({});
  if (!doc) {
    col.insertOne(ministryProfile);
  }
}

module.exports = { initMinistryProfile };
