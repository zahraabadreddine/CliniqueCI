const Joi = require('joi');

const createSchema = Joi.object({
  appointment_id: Joi.string().uuid().required(),
  patient_id: Joi.string().uuid().required(),
  chief_complaint: Joi.string().max(500).required(),
  examination: Joi.string().max(2000).allow('', null),
  diagnosis: Joi.string().max(1000).required(),
  notes: Joi.string().max(2000).allow('', null),
});

module.exports = { createSchema };
