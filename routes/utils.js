function validate(data, schema) {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) {
    const errors = {};
    for (let err of error.details) {
      errors[err.context.key] = err.message;
    }
    return errors;
  } else {
    return null;
  }
}

function randomTxid() {
  let characters = "0123456789abcdef";
  let str = "";
  for (let i = 0; i < 64; i++) {
    str += characters[Math.floor(Math.random() * 16)];
  }
  return str;
}

module.exports = { validate, randomTxid };
