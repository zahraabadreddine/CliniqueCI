const Joi = require('joi');

const inviteSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().min(1).max(50).required(),
  last_name: Joi.string().min(1).max(50).required(),
  role: Joi.string().valid('doctor', 'secretary').required(),
});

const updateUserSchema = Joi.object({
  first_name: Joi.string().min(1).max(50),
  last_name: Joi.string().min(1).max(50),
  email: Joi.string().email(),
}).min(1);

module.exports = { inviteSchema, updateUserSchema };
