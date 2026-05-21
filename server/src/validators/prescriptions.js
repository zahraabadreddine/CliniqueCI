const Joi = require('joi');

const medicationSchema = Joi.object({
  name: Joi.string().required(),
  dosage: Joi.string().required(),
  frequency: Joi.string().required(),
  duration: Joi.string().required(),
});

const createSchema = Joi.object({
  consultation_id: Joi.string().uuid().required(),
  patient_id: Joi.string().uuid().required(),
  medications: Joi.array().items(medicationSchema).min(1).required(),
  notes: Joi.string().max(1000).allow('', null),
});

module.exports = { createSchema, medicationSchema };
