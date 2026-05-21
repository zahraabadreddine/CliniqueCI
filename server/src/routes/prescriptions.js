const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema } = require('../validators/prescriptions');

module.exports = function prescriptionsRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.get('/', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const prescriptions = await db('prescriptions')
        .where('prescriptions.organization_id', req.orgId)
        .join('patients', 'prescriptions.patient_id', 'patients.id')
        .select(
          'prescriptions.id', 'prescriptions.medications', 'prescriptions.notes', 'prescriptions.created_at',
          'patients.first_name as patient_first_name', 'patients.last_name as patient_last_name'
        )
        .orderBy('prescriptions.created_at', 'desc');

      res.json(prescriptions.map(p => ({
        ...p,
        medications: typeof p.medications === 'string' ? JSON.parse(p.medications) : p.medications,
      })));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authorize('doctor'), async (req, res, next) => {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const consultation = await db('consultations')
        .where({ id: value.consultation_id, organization_id: req.orgId, doctor_id: req.user.id })
        .first();

      if (!consultation) return res.status(404).json({ error: 'Consultation introuvable ou non autorisée' });

      const [prescription] = await db('prescriptions')
        .insert({
          consultation_id: value.consultation_id,
          patient_id: value.patient_id,
          doctor_id: req.user.id,
          organization_id: req.orgId,
          medications: JSON.stringify(value.medications),
          notes: value.notes,
        })
        .returning(['id', 'patient_id', 'consultation_id', 'medications', 'notes', 'created_at']);

      res.status(201).json({ ...prescription, medications: typeof prescription.medications === 'string' ? JSON.parse(prescription.medications) : prescription.medications });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const prescription = await db('prescriptions')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select('id', 'patient_id', 'consultation_id', 'doctor_id', 'medications', 'notes', 'created_at')
        .first();

      if (!prescription) return res.status(404).json({ error: 'Ordonnance introuvable' });

      if (req.user.role === 'patient') {
        const patient = await db('patients').where({ id: prescription.patient_id, user_id: req.user.id }).first();
        if (!patient) return res.status(403).json({ error: 'Accès refusé' });
      }

      res.json({ ...prescription, medications: typeof prescription.medications === 'string'
        ? JSON.parse(prescription.medications)
        : prescription.medications });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
