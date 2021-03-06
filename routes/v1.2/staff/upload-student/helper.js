const axios = require("axios").default;
const bcrypt = require("bcryptjs");

function parseExcel(rows) {
  // skip header
  rows.shift();
  return rows.map((row) => {
    return {
      studentId: row[0].toString(),
      name: row[1],
      birthday: row[2].toString(),
      gender: row[3],
      email: row[4],
      cid: row[5], // citizen identification numbers
      school: row[6], // equivalent deparment
      eduProgram: { name: row[7], totalCredit: row[8], minYear: row[9], maxYear: row[10] },
      publicKey: row[11],
    };
  });
}

function addCidAsFirstTimePw(students) {
  students.forEach((student) => {
    const salt = bcrypt.genSaltSync();
    student.password = student.cid;
    student.hashedPassword = bcrypt.hashSync(student.password, salt);
  });
}

// TODO: may be need update payload
function preparePayload(students) {
  return students.map((student) => {
    return { publicKey: student.publicKey, eduProgram: student.eduProgram };
  });
}

// TODO: send to bkc when api ready
async function sendToBKC(payload, privateKeyHex) {
  return axios.post("/create_students", {
    privateKeyHex,
    profiles: payload,
  });
}

module.exports = { parseExcel, preparePayload, sendToBKC, addCidAsFirstTimePw };
