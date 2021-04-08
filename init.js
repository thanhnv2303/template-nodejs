const connection = require("./db");
const ministryProfile = require("./resources/MinistryProfile.json");
const bcrypt = require("bcryptjs");
const { ROLE } = require("./routes/v1.2/acc/role");

async function initMinistryProfile() {
  const col = (await connection).db().collection("MinistryProfile");
  const doc = await col.findOne({});
  if (!doc) {
    await col.insertOne(ministryProfile);
  }
}

async function initStaffAccount() {
  try {
    const col = (await connection).db().collection("Account");
    const email = process.env.STAFF_ACCOUNT_EMAIL;
    const acc = await col.findOne({ email: email });
    if (!acc) {
      const password = process.env.STAFF_ACCOUNT_PASSWORD;
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);
      const role = ROLE.STAFF;
      await col.insertOne({ email, hashedPassword, role });
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = { initMinistryProfile, initStaffAccount };
