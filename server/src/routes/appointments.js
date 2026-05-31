const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema, statusSchema } = require('../validators/appointments');
const notif = require('../services/notifications');
const { scheduleRemindersForAppointment, cancelRemindersForAppointment } = require('../services/smsCron');

module.exports = function appointmentsRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.get('/', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const { date, doctor_id, patientId, status, date_from, date_to } = req.query;

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

      if (date_from && date_to) {
        query = query.whereBetween('appointments.scheduled_at', [
          new Date(date_from + 'T00:00:00'),
          new Date(date_to + 'T23:59:59'),
        ]);
      } else if (date) {
        query = query.whereBetween('appointments.scheduled_at', [
          new Date(date + 'T00:00:00'),
          new Date(date + 'T23:59:59'),
        ]);
      }
      if (doctor_id) {
        query = query.where('appointments.doctor_id', doctor_id);
      }
      if (patientId) {
        query = query.where('appointments.patient_id', patientId);
      }
      if (status) {
        query = query.where('appointments.status', status);
      }

      res.json(await query);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authorize('admin', 'secretary', 'doctor', 'patient'), async (req, res, next) => {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const [patient, doctor] = await Promise.all([
        db('patients').where({ id: value.patient_id, organization_id: req.orgId }).first(),
        db('users').where({ id: value.doctor_id, organization_id: req.orgId, role: 'doctor' }).first(),
      ]);

      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });
      if (!doctor) return res.status(404).json({ error: 'Médecin introuvable' });

      let appointment;
      try {
        [appointment] = await db.transaction((trx) =>
          trx('appointments')
            .insert({ ...value, organization_id: req.orgId, status: 'pending' })
            .returning(['id', 'patient_id', 'doctor_id', 'scheduled_at', 'status', 'reason'])
        );
      } catch (dbErr) {
        // PostgreSQL unique_violation — the slot was taken concurrently
        if (dbErr.code === '23505') {
          return res.status(409).json({
            error: 'Ce créneau vient d\'être pris. Veuillez en choisir un autre.',
          });
        }
        throw dbErr;
      }

      res.status(201).json(appointment);

      // ── Post-création : notifications + rappels SMS (best-effort) ─────────
      notif.onAppointmentCreated(db, { orgId: req.orgId, appointment, patient, doctor });

      // Planifier confirmation immédiate + rappels 48h/2h
      try {
        const org = await db('organizations').where({ id: req.orgId }).select('name').first();
        await scheduleRemindersForAppointment(
          db,
          { ...appointment, organization_id: req.orgId },
          patient.phone,
          `${patient.first_name} ${patient.last_name}`,
          org?.name ?? 'CliniqueCI',
        );
      } catch (smsErr) {
        console.error('[SMS] Erreur planification rappels (RDV créé):', smsErr.message);
      }
    } catch (err) {
      next(err);
    }
  });

  // ── Available slots for a doctor on a given day ──────────────────────────
  // GET /appointments/slots?doctor_id=X&date=YYYY-MM-DD
  router.get('/slots', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const { doctor_id, date } = req.query;
      if (!doctor_id || !date) {
        return res.status(400).json({ error: 'Les paramètres doctor_id et date sont requis' });
      }

      const doctor = await db('users')
        .where({ id: doctor_id, organization_id: req.orgId, role: 'doctor' })
        .first();
      if (!doctor) return res.status(404).json({ error: 'Médecin introuvable' });

      // All 30-minute slots within business hours (08:00 – 17:30)
      const ALL_SLOTS = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        '17:00', '17:30',
      ];

      // Fetch booked (non-cancelled) slots for that doctor on that date
      const booked = await db('appointments')
        .where('organization_id', req.orgId)
        .where('doctor_id', doctor_id)
        .whereNot('status', 'cancelled')
        .whereBetween('scheduled_at', [
          new Date(date + 'T00:00:00'),
          new Date(date + 'T23:59:59'),
        ])
        .select('scheduled_at');

      const bookedSet = new Set(
        booked.map((a) => {
          const d = new Date(a.scheduled_at);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })
      );

      // If the date is today, exclude slots in the past (+ 60-min buffer)
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const isToday = date === todayStr;
      const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() + 60 : -1;

      const available = ALL_SLOTS.filter((slot) => {
        if (bookedSet.has(slot)) return false;
        if (isToday) {
          const [h, m] = slot.split(':').map(Number);
          if (h * 60 + m <= nowMinutes) return false;
        }
        return true;
      });

      res.json({ date, doctor_id, slots: available });
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

  router.patch('/:id/status', authorize('admin', 'secretary', 'doctor', 'patient'), async (req, res, next) => {
    try {
      const { error, value } = statusSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      // State machine: valid transitions from each current status
      const VALID_NEXT = {
        pending:    ['confirmed', 'cancelled'],
        confirmed:  ['waiting', 'in-room', 'cancelled'],
        waiting:    ['in-room', 'cancelled'],
        'in-room':  ['completed', 'cancelled'],
        completed:  [],
        cancelled:  [],
      };

      // Transitions requiring doctor or admin role
      const DOCTOR_ONLY_TARGETS = new Set(['in-room', 'completed']);

      const current = await db('appointments')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select('id', 'status', 'scheduled_at', 'patient_id', 'doctor_id')
        .first();

      if (!current) return res.status(404).json({ error: 'RDV introuvable' });

      // Patient can only cancel their own appointments
      if (req.user.role === 'patient') {
        if (value.status !== 'cancelled') {
          return res.status(403).json({ error: 'Vous ne pouvez qu\'annuler un rendez-vous' });
        }
        const patientRecord = await db('patients')
          .where({ user_id: req.user.id, organization_id: req.orgId })
          .select('id')
          .first();
        if (!patientRecord || current.patient_id !== patientRecord.id) {
          return res.status(403).json({ error: 'Accès refusé' });
        }
      }

      const allowed = VALID_NEXT[current.status] ?? [];
      if (!allowed.includes(value.status)) {
        return res.status(422).json({
          error: `Transition invalide : ${current.status} → ${value.status}`,
        });
      }

      if (DOCTOR_ONLY_TARGETS.has(value.status) && !['admin', 'doctor'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Seul un médecin peut effectuer cette action' });
      }

      const [appointment] = await db('appointments')
        .where({ id: req.params.id, organization_id: req.orgId })
        .update({ status: value.status, updated_at: new Date() })
        .returning(['id', 'status', 'scheduled_at', 'patient_id', 'doctor_id']);

      res.json(appointment);

      // ── In-app notifications (best-effort) ────────────────────────────────
      const [patient, doctor] = await Promise.all([
        db('patients').where({ id: appointment.patient_id, organization_id: req.orgId })
          .select('id', 'first_name', 'last_name').first(),
        db('users').where({ id: appointment.doctor_id, organization_id: req.orgId })
          .select('id', 'first_name', 'last_name').first(),
      ]);

      if (patient && doctor) {
        if (value.status === 'cancelled') {
          notif.onAppointmentCancelled(db, { orgId: req.orgId, appointment, patient, doctor });
          // Supprimer les rappels SMS pending pour ce RDV annulé
          cancelRemindersForAppointment(db, appointment.id, req.orgId).catch((err) =>
            console.error('[SMS] Erreur suppression rappels (annulation):', err.message),
          );
        } else if (value.status === 'waiting') {
          notif.onPatientArrived(db, { orgId: req.orgId, appointment, patient, doctor });
        } else if (value.status === 'in-room') {
          notif.onPatientInRoom(db, { orgId: req.orgId, appointment, patient, doctor });
        } else if (value.status === 'completed') {
          notif.onAppointmentCompleted(db, { orgId: req.orgId, appointment, patient, doctor });
        }
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
};
