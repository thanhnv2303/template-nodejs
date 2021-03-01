const axios = require("axios").default;

function parseExcel(rows) {
  // skip header
  rows.shift();
  return rows.map((row) => ({
    school: row[0],
    department: row[1],
    bureauId: row[2],
    name: row[3],
    email: row[4],
    phone: row[5],
  }));
}

function preparePayload(bureaus) {
  return bureaus.map((bureau) => {
    let { school, department, bureauId, name, publicKey, universityPublicKey } = bureau;
    return { school, department, bureauId, name, publicKey, universityPublicKey };
  });
}

async function sendToBKC(payload, privateKeyHex) {
  return axios.post("/create_edu_officers", {
    privateKeyHex,
    profiles: payload,
  });
}

module.exports = { parseExcel, preparePayload, sendToBKC };
