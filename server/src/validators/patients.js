const Joi = require('joi');

const createSchema = Joi.object({
  first_name: Joi.string().min(1).max(50).required(),
  last_name: Joi.string().min(1).max(50).required(),
  date_of_birth: Joi.date().iso().required(),
  phone: Joi.string().max(20).allow('', null),
  email: Joi.string().email().allow('', null),
  address: Joi.string().max(200).allow('', null),
  blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').allow(null),
  allergies: Joi.string().max(500).allow('', null),
});

const updateSchema = Joi.object({
  first_name: Joi.string().min(1).max(50),
  last_name: Joi.string().min(1).max(50),
  date_of_birth: Joi.date().iso(),
  phone: Joi.string().max(20).allow('', null),
  email: Joi.string().email().allow('', null),
  address: Joi.string().max(200).allow('', null),
  blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').allow(null),
  allergies: Joi.string().max(500).allow('', null),
}).min(1);

module.exports = { createSchema, updateSchema };
