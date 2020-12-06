function sendAcceptVote(publicKeyOfRequest, privateKey) {
  return Promise.resolve({ ok: true });
}

function sendDeclineVote(publicKeyOfRequest, privateKey) {
  return Promise.resolve({ ok: true });
}

module.exports = { sendAcceptVote, sendDeclineVote };
