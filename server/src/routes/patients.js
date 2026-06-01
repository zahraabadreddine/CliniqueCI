const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema, updateSchema } = require('../validators/patients');

module.exports = function patientsRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  /**
   * GET /patients
   * - Admin / Secrétaire : tous les patients de la clinique
   * - Médecin : uniquement ses patients (ceux qui ont eu un RDV avec lui)
   * Chaque patient retourne aussi "doctors" : liste des médecins traitants distincts.
   */
  router.get('/', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const { search } = req.query;

      // Sous-requête : noms des médecins distincts ayant eu un RDV avec ce patient
      const doctorsSubquery = db.raw(`
        (SELECT STRING_AGG(full_name, ', ' ORDER BY full_name)
         FROM (
           SELECT DISTINCT u.last_name || ' ' || u.first_name AS full_name
           FROM appointments a
           JOIN users u ON a.doctor_id = u.id
           WHERE a.patient_id = patients.id
             AND a.organization_id = patients.organization_id
         ) sub
        ) AS doctors
      `);

      // Sous-requête : date de la dernière consultation
      const lastVisitSubquery = db.raw(`
        (SELECT MAX(c.created_at)
         FROM consultations c
         WHERE c.patient_id = patients.id
           AND c.organization_id = patients.organization_id
        ) AS last_visit
      `);

      let query = db('patients')
        .where('patients.organization_id', req.orgId)
        .select(
          'patients.id', 'patients.first_name', 'patients.last_name',
          'patients.date_of_birth', 'patients.phone', 'patients.email',
          'patients.blood_type', 'patients.allergies',
          'patients.created_at', doctorsSubquery, lastVisitSubquery
        );

      // Médecin : filtre sur ses propres patients uniquement
      if (req.user.role === 'doctor') {
        query = query.whereExists(
          db('appointments')
            .whereRaw('appointments.patient_id = patients.id')
            .where('appointments.doctor_id', req.user.id)
            .where('appointments.organization_id', req.orgId)
        );
      }

      if (search) {
        query = query.where(function () {
          this.whereILike('patients.first_name', `%${search}%`)
              .orWhereILike('patients.last_name', `%${search}%`);
        });
      }

      const patients = await query.orderBy('patients.last_name', 'asc');
      res.json(patients);
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /patients
   * Secrétaire et Admin uniquement — le médecin ne crée pas de patients.
   */
  router.post('/', authorize('admin', 'secretary'), async (req, res, next) => {
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
          .where({ 'consultations.patient_id': patient.id, 'consultations.organization_id': req.orgId })
          .join('users', 'consultations.doctor_id', 'users.id')
          .select('consultations.id', 'consultations.chief_complaint', 'consultations.diagnosis',
            'consultations.notes', 'consultations.created_at',
            'users.first_name as doctor_first_name', 'users.last_name as doctor_last_name')
          .orderBy('consultations.created_at', 'desc'),
        db('prescriptions')
          .where({ patient_id: patient.id, organization_id: req.orgId })
          .select('id', 'medications', 'notes', 'qr_token', 'created_at')
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

  /**
   * GET /patients/:id
   * - Médecin : accès refusé si aucun RDV avec ce patient
   */
  router.get('/:id', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const fields = req.user.role === 'secretary'
        ? ['id', 'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'address', 'created_at']
        : ['id', 'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'address', 'blood_type', 'allergies', 'created_at'];

      const patient = await db('patients')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select(fields)
        .first();

      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

      if (req.user.role === 'doctor') {
        const hasAppointment = await db('appointments')
          .where({ patient_id: req.params.id, doctor_id: req.user.id, organization_id: req.orgId })
          .first();
        if (!hasAppointment) return res.status(403).json({ error: 'Accès refusé' });
      }

      res.json(patient);
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /patients/:id
   * Secrétaire et Admin uniquement.
   */
  router.patch('/:id', authorize('admin', 'secretary'), async (req, res, next) => {
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

  /**
   * GET /patients/:id/history
   * - Patient    : son propre historique complet
   * - Secrétaire : rendez-vous uniquement (pas de données cliniques)
   * - Médecin    : uniquement ses RDV / consultations / ordonnances avec ce patient
   * - Admin      : tout l'historique, tous médecins confondus
   */
  router.get('/:id/history', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const patient = await db('patients')
        .where({ id: req.params.id, organization_id: req.orgId })
        .first();

      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

      if (req.user.role === 'patient' && patient.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      if (req.user.role === 'doctor') {
        const hasAppointment = await db('appointments')
          .where({ patient_id: req.params.id, doctor_id: req.user.id, organization_id: req.orgId })
          .first();
        if (!hasAppointment) return res.status(403).json({ error: 'Accès refusé' });
      }

      // Secrétaire : rendez-vous seulement + nom du médecin
      if (req.user.role === 'secretary') {
        const appointments = await db('appointments')
          .where({ 'appointments.patient_id': req.params.id, 'appointments.organization_id': req.orgId })
          .join('users', 'appointments.doctor_id', 'users.id')
          .select(
            'appointments.id', 'appointments.scheduled_at', 'appointments.status', 'appointments.reason',
            'users.first_name as doctor_first_name', 'users.last_name as doctor_last_name'
          )
          .orderBy('appointments.scheduled_at', 'desc');

        return res.json({
          patient: {
            id: patient.id, first_name: patient.first_name, last_name: patient.last_name,
            date_of_birth: patient.date_of_birth, phone: patient.phone,
            email: patient.email, address: patient.address,
          },
          appointments,
        });
      }

      // Admin et Médecin : consultations + ordonnances avec nom du médecin
      const isDoctor = req.user.role === 'doctor';

      const [appointments, consultations, prescriptions] = await Promise.all([
        db('appointments')
          .where({ 'appointments.patient_id': req.params.id, 'appointments.organization_id': req.orgId })
          .modify(q => isDoctor && q.where('appointments.doctor_id', req.user.id))
          .join('users', 'appointments.doctor_id', 'users.id')
          .select(
            'appointments.id', 'appointments.scheduled_at', 'appointments.status', 'appointments.reason',
            'users.first_name as doctor_first_name', 'users.last_name as doctor_last_name'
          )
          .orderBy('appointments.scheduled_at', 'desc'),

        db('consultations')
          .where({ 'consultations.patient_id': req.params.id, 'consultations.organization_id': req.orgId })
          .modify(q => isDoctor && q.where('consultations.doctor_id', req.user.id))
          .join('users', 'consultations.doctor_id', 'users.id')
          .select(
            'consultations.id', 'consultations.chief_complaint', 'consultations.diagnosis',
            'consultations.notes', 'consultations.created_at',
            'users.first_name as doctor_first_name', 'users.last_name as doctor_last_name'
          )
          .orderBy('consultations.created_at', 'desc'),

        db('prescriptions')
          .where({ 'prescriptions.patient_id': req.params.id, 'prescriptions.organization_id': req.orgId })
          .modify(q => isDoctor && q.where('prescriptions.doctor_id', req.user.id))
          .join('users', 'prescriptions.doctor_id', 'users.id')
          .select(
            'prescriptions.id', 'prescriptions.medications', 'prescriptions.notes', 'prescriptions.created_at',
            'users.first_name as doctor_first_name', 'users.last_name as doctor_last_name'
          )
          .orderBy('prescriptions.created_at', 'desc'),
      ]);

      res.json({ patient, appointments, consultations, prescriptions });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
