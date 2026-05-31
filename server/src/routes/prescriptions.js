const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema } = require('../validators/prescriptions');

module.exports = function prescriptionsRoutes(db) {
  const router = express.Router();

  // ── Public QR verification (no auth required) ───────────────────────
  router.get('/verify/:token', async (req, res, next) => {
    try {
      const { token } = req.params;
      // Validate UUID format before hitting DB (qr_token is uuid type)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(token)) {
        return res.status(404).json({ valid: false, error: 'Ordonnance introuvable ou token invalide' });
      }
      const prescription = await db('prescriptions')
        .where('qr_token', token)
        .join('patients', 'prescriptions.patient_id', 'patients.id')
        .join('users as doctors', 'prescriptions.doctor_id', 'doctors.id')
        .select(
          'prescriptions.id',
          'prescriptions.medications',
          'prescriptions.notes',
          'prescriptions.created_at',
          'patients.first_name as patient_first_name',
          'patients.last_name as patient_last_name',
          db.raw("doctors.first_name || ' ' || doctors.last_name as doctor_name")
        )
        .first();

      if (!prescription) return res.status(404).json({ valid: false, error: 'Ordonnance introuvable ou token invalide' });

      res.json({
        valid: true,
        prescription: {
          ...prescription,
          medications: typeof prescription.medications === 'string'
            ? JSON.parse(prescription.medications)
            : prescription.medications,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.use(authenticate, tenant);

  router.get('/', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const { patientId } = req.query;
      let query = db('prescriptions')
        .where('prescriptions.organization_id', req.orgId)
        .join('patients', 'prescriptions.patient_id', 'patients.id')
        .join('users as doctors', 'prescriptions.doctor_id', 'doctors.id')
        .select(
          'prescriptions.id', 'prescriptions.patient_id', 'prescriptions.medications',
          'prescriptions.notes', 'prescriptions.created_at', 'prescriptions.qr_token',
          'patients.first_name as patient_first_name', 'patients.last_name as patient_last_name',
          'patients.phone as patient_phone',
          'doctors.first_name as doctor_first_name', 'doctors.last_name as doctor_last_name'
        )
        .orderBy('prescriptions.created_at', 'desc');

      if (patientId) {
        query = query.where('prescriptions.patient_id', patientId);
      }

      const rows = await query;
      res.json(rows.map(p => ({
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
          qr_token: uuidv4(),
        })
        .returning(['id', 'patient_id', 'consultation_id', 'medications', 'notes', 'created_at', 'qr_token']);

      res.status(201).json({ ...prescription, medications: typeof prescription.medications === 'string' ? JSON.parse(prescription.medications) : prescription.medications });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const prescription = await db('prescriptions')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select('id', 'patient_id', 'consultation_id', 'doctor_id', 'medications', 'notes', 'created_at', 'qr_token')
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
