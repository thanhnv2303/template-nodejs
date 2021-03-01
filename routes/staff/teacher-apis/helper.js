const axios = require("axios").default;
const connection = require("../../../db");

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

function addTxid(objs, txs) {
  objs.forEach((obj) => {
    obj.txid = txs.find((tx) => tx.teacherId === obj.teacherId).transactionId;
  });
}

async function saveProfiles(teachers) {
  const teacherHistoryCol = (await connection).db().collection("TeacherHistory");
  return teacherHistoryCol.insertOne({
    time: new Date().toISOString().split("T")[0],
    profiles: teachers,
  });
}

module.exports = { parseExcel, preparePayload, sendToBKC, addTxid, saveProfiles };
