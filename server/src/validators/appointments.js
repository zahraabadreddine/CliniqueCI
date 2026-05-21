const Joi = require('joi');

const createSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  doctor_id: Joi.string().uuid().required(),
  scheduled_at: Joi.date().iso().greater('now').required(),
  reason: Joi.string().max(500).allow('', null),
  notes: Joi.string().max(1000).allow('', null),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'in-room', 'cancelled', 'completed').required(),
});

module.exports = { createSchema, statusSchema };
