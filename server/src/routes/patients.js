const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema, updateSchema } = require('../validators/patients');

module.exports = function patientsRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.get('/', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const { search } = req.query;
      let query = db('patients')
        .where({ organization_id: req.orgId })
        .select('id', 'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'created_at');

      if (search) {
        query = query.where(function () {
          this.whereILike('first_name', `%${search}%`).orWhereILike('last_name', `%${search}%`);
        });
      }

      const patients = await query.orderBy('last_name', 'asc');
      res.json(patients);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authorize('admin', 'secretary', 'doctor'), async (req, res, next) => {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const [patient] = await db('patients')
        .insert({ ...value, organization_id: req.orgId })
        .returning(['id', 'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'blood_type', 'allergies', 'created_at']);

      res.status(201).json(patient);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/me', authorize('patient'), async (req, res, next) => {
    try {
      const { error, value } = updateSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const [patient] = await db('patients')
        .where({ organization_id: req.orgId, user_id: req.user.id })
        .update({ ...value, updated_at: new Date() })
        .returning(['id', 'first_name', 'last_name', 'date_of_birth', 'blood_type', 'phone', 'email', 'allergies', 'created_at']);

      if (!patient) return res.status(404).json({ error: 'Dossier patient introuvable' });
      res.json(patient);
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', authorize('patient'), async (req, res, next) => {
    try {
      const patient = await db('patients')
        .where({ organization_id: req.orgId, user_id: req.user.id })
        .select('id', 'first_name', 'last_name', 'date_of_birth', 'blood_type', 'phone', 'email', 'allergies', 'created_at')
        .first();
      if (!patient) return res.status(404).json({ error: 'Dossier patient introuvable' });
      res.json(patient);
    } catch (err) {
      next(err);
    }
  });

  router.get('/me/history', authorize('patient'), async (req, res, next) => {
    try {
      const patient = await db('patients')
        .where({ organization_id: req.orgId, user_id: req.user.id })
        .first();

      if (!patient) return res.status(404).json({ error: 'Dossier patient introuvable' });

      const [appointments, consultations, prescriptions, invoices] = await Promise.all([
        db('appointments')
          .where({ 'appointments.patient_id': patient.id, 'appointments.organization_id': req.orgId })
          .join('users', 'appointments.doctor_id', 'users.id')
          .select('appointments.id', 'appointments.scheduled_at', 'appointments.status', 'appointments.reason',
            'users.first_name as doctor_first_name', 'users.last_name as doctor_last_name')
          .orderBy('appointments.scheduled_at', 'desc'),
        db('consultations')
          .where({ patient_id: patient.id, organization_id: req.orgId })
          .select('id', 'chief_complaint', 'diagnosis', 'notes', 'created_at')
          .orderBy('created_at', 'desc'),
        db('prescriptions')
          .where({ patient_id: patient.id, organization_id: req.orgId })
          .select('id', 'medications', 'notes', 'created_at')
          .orderBy('created_at', 'desc'),
        db('invoices')
          .where({ patient_id: patient.id, organization_id: req.orgId })
          .select('id', 'amount', 'status', 'payment_method', 'notes', 'paid_at', 'created_at')
          .orderBy('created_at', 'desc'),
      ]);

      const parsedPrescriptions = prescriptions.map(p => ({
        ...p,
        medications: typeof p.medications === 'string' ? JSON.parse(p.medications) : p.medications,
      }));

      res.json({ patient, appointments, consultations, prescriptions: parsedPrescriptions, invoices });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const patient = await db('patients')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select('id', 'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'address', 'blood_type', 'allergies', 'created_at')
        .first();

      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });
      res.json(patient);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const { error, value } = updateSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const [patient] = await db('patients')
        .where({ id: req.params.id, organization_id: req.orgId })
        .update({ ...value, updated_at: new Date() })
        .returning(['id', 'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'address', 'blood_type', 'allergies', 'created_at']);

      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });
      res.json(patient);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/history', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const patient = await db('patients')
        .where({ id: req.params.id, organization_id: req.orgId })
        .first();

      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

      if (req.user.role === 'patient' && patient.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      const [appointments, consultations, prescriptions] = await Promise.all([
        db('appointments')
          .where({ 'appointments.patient_id': req.params.id, 'appointments.organization_id': req.orgId })
          .join('users', 'appointments.doctor_id', 'users.id')
          .select('appointments.id', 'appointments.scheduled_at', 'appointments.status', 'appointments.reason',
            'users.first_name as doctor_first_name', 'users.last_name as doctor_last_name')
          .orderBy('appointments.scheduled_at', 'desc'),
        db('consultations')
          .where({ patient_id: req.params.id, organization_id: req.orgId })
          .select('id', 'chief_complaint', 'diagnosis', 'notes', 'created_at')
          .orderBy('created_at', 'desc'),
        db('prescriptions')
          .where({ patient_id: req.params.id, organization_id: req.orgId })
          .select('id', 'medications', 'notes', 'created_at')
          .orderBy('created_at', 'desc'),
      ]);

      res.json({ patient, appointments, consultations, prescriptions });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
