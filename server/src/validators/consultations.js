const Joi = require('joi');

const createSchema = Joi.object({
  appointment_id: Joi.string().uuid().required(),
  patient_id: Joi.string().uuid().required(),
  chief_complaint: Joi.string().max(500).required(),
  examination: Joi.string().max(2000).allow('', null),
  diagnosis: Joi.string().max(1000).required(),
  notes: Joi.string().max(2000).allow('', null),
});

// Schema for the atomic close endpoint (consultation + optional prescription + invoice draft)
const closeSchema = Joi.object({
  appointment_id: Joi.string().uuid().required(),
  patient_id: Joi.string().uuid().required(),
  chief_complaint: Joi.string().max(500).required(),
  examination: Joi.string().max(2000).allow('', null),
  diagnosis: Joi.string().max(1000).required(),
  notes: Joi.string().max(2000).allow('', null),
  // Optional prescription
  medications: Joi.array().items(
    Joi.object({
      name: Joi.string().max(200).required(),
      dosage: Joi.string().max(200).allow('', null),
      duration: Joi.string().max(200).allow('', null),
      instructions: Joi.string().max(500).allow('', null),
    })
  ).allow(null),
  prescription_notes: Joi.string().max(1000).allow('', null),
  // Invoice
  amount: Joi.number().integer().min(0).required(),
  // Suivi : prochain RDV suggéré par le médecin (créé en attente pour la secrétaire)
  next_appointment_date:   Joi.string().isoDate().allow(null, '').optional(),
  next_appointment_reason: Joi.string().max(500).allow('', null).optional(),
});

// Schema for PATCH /consultations/:id  (notes complémentaires du médecin)
const updateSchema = Joi.object({
  chief_complaint: Joi.string().max(500).optional(),
  examination:     Joi.string().max(2000).allow('', null).optional(),
  diagnosis:       Joi.string().max(1000).optional(),
  notes:           Joi.string().max(2000).allow('', null).optional(),
}).min(1); // au moins un champ requis

module.exports = { createSchema, closeSchema, updateSchema };
