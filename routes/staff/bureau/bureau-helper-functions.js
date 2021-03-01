const axios = require("axios").default;
const connection = require("../../../db");

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

function addTxid(objs, txs) {
  objs.forEach((obj) => {
    obj.txid = txs.find((tx) => tx.bureauId === obj.bureauId).transactionId;
  });
}

async function saveProfiles(bureaus) {
  const bureauHistoryCol = (await connection).db().collection("BureauHistory");
  return bureauHistoryCol.insertOne({
    time: new Date().toISOString().split("T")[0],
    profiles: bureaus,
  });
}

module.exports = { parseExcel, preparePayload, sendToBKC, addTxid, saveProfiles };
