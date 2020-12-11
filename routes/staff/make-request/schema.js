const Joi = require("joi");

const profileSchema = Joi.object({
  _id: Joi.string(),
  uid: Joi.string(),
  universityName: Joi.string().required(),
  nameInEnglish: Joi.string().required(),
  address: Joi.string(),
  email: Joi.string().email(),
  // phone: Joi.string().pattern(/(03|07|08|09|01[2|6|8|9])+([0-9]{8})\b/),
  // FIXME: use valid on phone
  phone: Joi.string(),
  // TODO: valide pubkey too
  pubkey: Joi.string(),
  description: Joi.string().max(1000),
  imgSrc: Joi.string(),
  votes: Joi.array(),
});

module.exports = { profileSchema };
