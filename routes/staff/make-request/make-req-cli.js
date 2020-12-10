async function makeJoinRequest(profile, privateKeyHex) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const rd = Math.floor(Math.random() * 10);
      if (rd % 3 == 0) {
        resolve({ ok: true });
      } else {
        resolve({ ok: false, msg: "error" });
      }
    }, 1200);
  });
}

module.exports = { makeJoinRequest };
