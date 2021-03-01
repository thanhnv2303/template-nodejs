const axios = require("axios").default;

function parseExcel(rows) {
  // skip header
  rows.shift();
  return rows.map((row) => {
    return {
      studentId: row[0].toString(),
      name: row[1],
      birthday: row[2]?.toString(),
      gender: row[3],
      email: row[4],
      genaration: row[5], // k61, k62...
      class: row[6],
      school: row[7], // equivalent deparment
      eduProgram: { name: row[8], totalCredit: row[9], minYear: row[10], maxYear: row[11] },
    };
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

function addTxid(objs, txs) {
  objs.forEach((obj) => {
    obj.txid = txs.find((tx) => tx.studentId === obj.studentId).transactionId;
  });
}

module.exports = { parseExcel, preparePayload, sendToBKC, addTxid };
