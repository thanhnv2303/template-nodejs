const axios = require("axios").default;

function parseExcel(rows) {
  // skip header
  rows.shift();
  return rows.map((row) => ({
    school: row[0],
    department: row[1],
    teacherId: row[2],
    name: row[3],
    email: row[4],
    phone: row[5],
    publicKey: row[6],
  }));
}

function preparePayload(teachers) {
  return teachers.map((teacher) => {
    let { school, department, teacherId, name, publicKey, universityPublicKey } = teacher;
    return { school, department, teacherId, name, publicKey, universityPublicKey };
  });
}

async function sendToBKC(payload, privateKeyHex) {
  return axios.post("/create_teachers", {
    privateKeyHex,
    profiles: payload,
  });
}

module.exports = { parseExcel, preparePayload, sendToBKC };
