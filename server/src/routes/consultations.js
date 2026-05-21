const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema } = require('../validators/consultations');

module.exports = function consultationsRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.get('/', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const consultations = await db('consultations')
        .where('consultations.organization_id', req.orgId)
        .join('patients', 'consultations.patient_id', 'patients.id')
        .select(
          'consultations.id', 'consultations.patient_id', 'consultations.doctor_id',
          'consultations.chief_complaint', 'consultations.diagnosis',
          'consultations.notes', 'consultations.created_at',
          'patients.first_name as patient_first_name', 'patients.last_name as patient_last_name'
        )
        .orderBy('consultations.created_at', 'desc');
      res.json(consultations);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authorize('doctor'), async (req, res, next) => {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const appointment = await db('appointments')
        .where({ id: value.appointment_id, organization_id: req.orgId, doctor_id: req.user.id })
        .first();

      if (!appointment) return res.status(404).json({ error: 'RDV introuvable ou non autorisé' });

      await db.transaction(async (trx) => {
        const [consultation] = await trx('consultations')
          .insert({ ...value, organization_id: req.orgId, doctor_id: req.user.id })
          .returning(['id', 'patient_id', 'appointment_id', 'chief_complaint', 'diagnosis', 'notes', 'created_at']);

        await trx('appointments')
          .where({ id: value.appointment_id })
          .update({ status: 'completed', updated_at: new Date() });

        res.status(201).json(consultation);
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const consultation = await db('consultations')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select('id', 'patient_id', 'appointment_id', 'doctor_id', 'chief_complaint', 'examination', 'diagnosis', 'notes', 'created_at')
        .first();

      if (!consultation) return res.status(404).json({ error: 'Consultation introuvable' });

      if (req.user.role === 'patient') {
        const patient = await db('patients').where({ id: consultation.patient_id, user_id: req.user.id }).first();
        if (!patient) return res.status(403).json({ error: 'Accès refusé' });
      }

      res.json(consultation);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
