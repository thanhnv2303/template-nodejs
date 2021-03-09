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
      cid: row[5].toString(), // citizen identification numbers
      school: row[6], // equivalent deparment
      eduProgram: { eduProgramId: row[7], name: row[8], totalCredit: row[9], minYear: row[10], maxYear: row[11] },
      publicKey: row[12],
    };
  });
}

function preparePayload(students) {
  return students.map((student) => {
    return { publicKey: student.publicKey, eduProgram: student.eduProgram };
  });
}

async function sendToBKC(payload, privateKeyHex) {
  return axios.post("/staff/create-students", {
    privateKeyHex,
    profiles: payload,
  });
}

function addCidAsFirstTimePw(students) {
  students.forEach((student) => {
    const salt = bcrypt.genSaltSync();
    student.firstTimePassword = student.cid;
    student.hashedPassword = bcrypt.hashSync(student.firstTimePassword, salt);
  });
}

module.exports = { parseExcel, preparePayload, sendToBKC, addCidAsFirstTimePw };
