const Joi = require('joi');

const createSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  consultation_id: Joi.string().uuid().allow(null, ''),
  appointment_id: Joi.string().uuid().allow(null, ''),
  amount: Joi.number().integer().min(0).required(),
  notes: Joi.string().max(1000).allow('', null),
});

const paySchema = Joi.object({
  payment_method: Joi.string().valid('cash', 'orange_money', 'wave', 'mtn_money', 'moov_money').required(),
});

module.exports = { createSchema, paySchema };
