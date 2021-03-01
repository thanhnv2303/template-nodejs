const connection = require("../../db");
const { Duplex } = require("stream");
const { PrivateKey } = require("eciesjs");
const generator = require("generate-password");
const bcrypt = require("bcryptjs");

function bufferToStream(myBuuffer) {
  let tmp = new Duplex();
  tmp.push(myBuuffer);
  tmp.push(null);
  return tmp;
}

async function addUniversityPublicKey(objs, userId) {
  const uniProfileCol = (await connection).db().collection("UniversityProfile");
  const universityPublicKey = (await uniProfileCol.findOne({ uid: userId })).pubkey;
  objs.forEach((obj) => (obj.universityPublicKey = universityPublicKey));
}

function addKeyPair(objs) {
  objs.forEach((obj) => {
    const privateKeyObj = new PrivateKey();
    obj.privateKey = privateKeyObj.toHex().slice(2); // 32 bytes
    obj.publicKey = privateKeyObj.publicKey.toHex(true); // 33bytes
  });
}

function addTxid(objs, txs, idFieldName) {
  objs.forEach((obj) => {
    obj.txid = txs.find((tx) => tx[idFieldName] === obj[idFieldName]).transactionId;
  });
}

function addPwAndHash(objs) {
  objs.forEach((obj) => {
    const randomPassword = generator.generate({
      length: 8,
      numbers: true,
    });
    const salt = bcrypt.genSaltSync();
    obj.firstTimePassword = randomPassword;
    obj.hashedPassword = bcrypt.hashSync(randomPassword, salt);
  });
}

function addRole(objs, role) {
  objs.forEach((obj) => {
    obj.role = role;
  });
}

async function createAccount(objs) {
  // TODO: check if emails exits
  const accounts = objs.map((obj) => ({
    email: obj.email,
    hashedPassword: obj.hashedPassword,
    role: obj.role,
  }));
  const accCol = (await connection).db().collection("Account");
  return (await accCol.insertMany(accounts)).insertedIds;
}

function addUid(objs, insertedIds) {
  objs.forEach((obj, index) => {
    obj.uid = insertedIds[index];
  });
}
async function saveProfiles(profiles, collName) {
  const coll = (await connection).db().collection(collName);
  return coll.insertOne({
    time: new Date().toISOString().split("T")[0],
    profiles: profiles,
  });
}

module.exports = {
  bufferToStream,
  addUniversityPublicKey,
  addKeyPair,
  addTxid,
  addPwAndHash,
  addRole,
  createAccount,
  addUid,
  saveProfiles,
};
