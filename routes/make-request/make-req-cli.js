async function makeJoinRequest(profile) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const rd = Math.floor(Math.random() * 10);
      if (rd % 2 == 0) {
        resolve({ ok: true });
      } else {
        resolve({ ok: false });
      }
    }, 1500);
  });
}

module.exports = { makeJoinRequest };
