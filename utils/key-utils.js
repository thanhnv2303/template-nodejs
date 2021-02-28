const { randomBytes } = require("crypto");
const secp256k1 = require("secp256k1");

function genNewKey() {
  let privateKey;
  do {
    privateKey = randomBytes(32);
  } while (!secp256k1.privateKeyVerify(privateKey));
  const publicKey = secp256k1.publicKeyCreate(privateKey);
  const publicKey65 = secp256k1.publicKeyCreate(privateKey, false);
  return { privateKey: Buffer.from(privateKey).toString("hex"), publicKey: Buffer.from(publicKey).toString("hex"), publicKey65: Buffer.from(publicKey65).toString("hex") };
}

module.exports = { genNewKey };
