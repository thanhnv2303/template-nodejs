async function makeJoinRequest(profile, privateKeyHex) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // resolve({ ok: true });
      const rd = Math.floor(Math.random() * 10);
      console.log(rd);
      if (rd % 5 == 0) {
        resolve({ ok: false, msg: "error" });
      } else {
        resolve({ ok: true });
      }
    }, 1200);
  });
}

module.exports = { makeJoinRequest };
