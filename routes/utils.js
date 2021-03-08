function validate(data, schema) {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) {
    const errors = {};
    for (let err of error.details) {
      errors[err.context.key] = err.message;
    }
    return JSON.stringify(errors);
  } else {
    return null;
  }
}

module.exports = { validate };
