const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema, statusSchema } = require('../validators/appointments');

module.exports = function appointmentsRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.get('/', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const { date, doctor_id } = req.query;

      let query = db('appointments')
        .where('appointments.organization_id', req.orgId)
        .join('patients', 'appointments.patient_id', 'patients.id')
        .join('users', 'appointments.doctor_id', 'users.id')
        .select(
          'appointments.id', 'appointments.scheduled_at', 'appointments.status', 'appointments.reason',
          'patients.id as patient_id', 'patients.first_name as patient_first_name', 'patients.last_name as patient_last_name',
          'users.id as doctor_id', 'users.first_name as doctor_first_name', 'users.last_name as doctor_last_name'
        )
        .orderBy('appointments.scheduled_at', 'asc');

      if (req.user.role === 'patient') {
        const patientRecord = await db('patients')
          .where({ organization_id: req.orgId, user_id: req.user.id })
          .first();
        if (!patientRecord) return res.json([]);
        query = query.where('appointments.patient_id', patientRecord.id);
      }

      if (date) {
        query = query.whereBetween('appointments.scheduled_at', [
          new Date(date + 'T00:00:00'),
          new Date(date + 'T23:59:59'),
        ]);
      }
      if (doctor_id) {
        query = query.where('appointments.doctor_id', doctor_id);
      }

      res.json(await query);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authorize('admin', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const [patient, doctor] = await Promise.all([
        db('patients').where({ id: value.patient_id, organization_id: req.orgId }).first(),
        db('users').where({ id: value.doctor_id, organization_id: req.orgId, role: 'doctor' }).first(),
      ]);

      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });
      if (!doctor) return res.status(404).json({ error: 'Médecin introuvable' });

      const [appointment] = await db('appointments')
        .insert({ ...value, organization_id: req.orgId, status: 'pending' })
        .returning(['id', 'patient_id', 'doctor_id', 'scheduled_at', 'status', 'reason']);

      res.status(201).json(appointment);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const appointment = await db('appointments')
        .where({ 'appointments.id': req.params.id, 'appointments.organization_id': req.orgId })
        .join('patients', 'appointments.patient_id', 'patients.id')
        .join('users', 'appointments.doctor_id', 'users.id')
        .select(
          'appointments.id', 'appointments.scheduled_at', 'appointments.status',
          'appointments.reason', 'appointments.notes',
          'patients.id as patient_id', 'patients.first_name as patient_first_name', 'patients.last_name as patient_last_name',
          'users.id as doctor_id', 'users.first_name as doctor_first_name', 'users.last_name as doctor_last_name'
        )
        .first();

      if (!appointment) return res.status(404).json({ error: 'RDV introuvable' });

      if (req.user.role === 'patient') {
        const patientRecord = await db('patients')
          .where({ organization_id: req.orgId, user_id: req.user.id })
          .first();
        if (!patientRecord || appointment.patient_id !== patientRecord.id) {
          return res.status(403).json({ error: 'Accès refusé' });
        }
      }

      res.json(appointment);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id/status', authorize('admin', 'secretary', 'doctor'), async (req, res, next) => {
    try {
      const { error, value } = statusSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const [appointment] = await db('appointments')
        .where({ id: req.params.id, organization_id: req.orgId })
        .update({ status: value.status, updated_at: new Date() })
        .returning(['id', 'status', 'scheduled_at']);

      if (!appointment) return res.status(404).json({ error: 'RDV introuvable' });
      res.json(appointment);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
