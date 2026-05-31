const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema, closeSchema, updateSchema } = require('../validators/consultations');

module.exports = function consultationsRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.get('/', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const { patientId } = req.query;
      let query = db('consultations')
        .where('consultations.organization_id', req.orgId)
        .join('patients', 'consultations.patient_id', 'patients.id')
        .select(
          'consultations.id', 'consultations.patient_id', 'consultations.doctor_id',
          'consultations.chief_complaint', 'consultations.diagnosis',
          'consultations.notes', 'consultations.created_at',
          'patients.first_name as patient_first_name', 'patients.last_name as patient_last_name'
        )
        .orderBy('consultations.created_at', 'desc');

      if (patientId) {
        query = query.where('consultations.patient_id', patientId);
      }

      res.json(await query);
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

  /**
   * POST /consultations/close
   * Fermeture atomique d'une consultation :
   *  1. INSERT consultation
   *  2. INSERT prescription (si médicaments fournis)
   *  3. INSERT invoice (statut 'pending')
   *  4. UPDATE appointments.status → 'completed'
   * Tout dans une seule transaction Knex.
   */
  router.post('/close', authorize('doctor'), async (req, res, next) => {
    try {
      const { error, value } = closeSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const appointment = await db('appointments')
        .where({ id: value.appointment_id, organization_id: req.orgId, doctor_id: req.user.id })
        .whereIn('status', ['in-room', 'confirmed'])
        .first();

      if (!appointment) {
        return res.status(404).json({ error: 'RDV introuvable ou non autorisé' });
      }

      const result = await db.transaction(async (trx) => {
        // 1. Créer la consultation
        const [consultation] = await trx('consultations')
          .insert({
            organization_id: req.orgId,
            doctor_id:        req.user.id,
            patient_id:       value.patient_id,
            appointment_id:   value.appointment_id,
            chief_complaint:  value.chief_complaint,
            examination:      value.examination ?? null,
            diagnosis:        value.diagnosis,
            notes:            value.notes ?? null,
          })
          .returning(['id', 'patient_id', 'appointment_id', 'chief_complaint', 'diagnosis', 'notes', 'created_at']);

        // 2. Créer l'ordonnance si des médicaments sont présents
        let prescription = null;
        if (value.medications && value.medications.length > 0) {
          [prescription] = await trx('prescriptions')
            .insert({
              organization_id: req.orgId,
              consultation_id: consultation.id,
              patient_id:      value.patient_id,
              doctor_id:       req.user.id,
              medications:     JSON.stringify(value.medications),
              notes:           value.prescription_notes ?? null,
            })
            .returning(['id', 'medications', 'notes', 'created_at']);
        }

        // 3. Créer la facture en brouillon (statut 'pending', à encaisser par secrétaire)
        const [invoice] = await trx('invoices')
          .insert({
            organization_id: req.orgId,
            patient_id:      value.patient_id,
            consultation_id: consultation.id,
            appointment_id:  value.appointment_id,
            amount:          value.amount,
            status:          'pending',
          })
          .returning(['id', 'amount', 'status', 'created_at']);

        // 4. Marquer le rendez-vous comme terminé
        await trx('appointments')
          .where({ id: value.appointment_id })
          .update({ status: 'completed', updated_at: new Date() });

        // 5. Créer un RDV de suivi (statut 'pending') si le médecin a indiqué une date
        let nextAppointment = null;
        if (value.next_appointment_date) {
          // Joi isoDate() peut convertir la valeur en objet Date — on normalise
          const rawDate = value.next_appointment_date instanceof Date
            ? value.next_appointment_date.toISOString().slice(0, 10)
            : String(value.next_appointment_date).slice(0, 10);
          const scheduledAt = new Date(`${rawDate}T08:00:00`);
          if (isNaN(scheduledAt.getTime())) {
            throw new Error(`Date de suivi invalide : ${value.next_appointment_date}`);
          }
          const [nextAppt] = await trx('appointments')
            .insert({
              organization_id: req.orgId,
              patient_id:      value.patient_id,
              doctor_id:       req.user.id,
              scheduled_at:    scheduledAt,
              status:          'pending',
              reason:          value.next_appointment_reason || 'Consultation de suivi',
            })
            .returning(['id', 'patient_id', 'doctor_id', 'scheduled_at', 'status', 'reason']);
          nextAppointment = nextAppt;
        }

        return { consultation, prescription, invoice, next_appointment: nextAppointment };
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /consultations/stats
   * Statistiques du médecin connecté pour le mois courant :
   *  - total_month        : nombre de consultations ce mois-ci
   *  - new_patients_month : nouveaux patients vus pour la 1ère fois ce mois
   *  - occupancy_rate     : % de RDV confirmés/terminés ce mois (vs total planifiés)
   *  - top_reasons        : top 4 motifs de consultation (label + pct)
   */
  router.get('/stats', authorize('doctor'), async (req, res, next) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Total consultations this month
      const totalRow = await db('consultations')
        .where({ organization_id: req.orgId, doctor_id: req.user.id })
        .where('created_at', '>=', startOfMonth)
        .count('id as total')
        .first();
      const total_month = Number(totalRow?.total ?? 0);

      // New patients this month (first-ever consultation with this doctor)
      const newPatientsRow = await db('consultations as c1')
        .where('c1.organization_id', req.orgId)
        .where('c1.doctor_id', req.user.id)
        .where('c1.created_at', '>=', startOfMonth)
        .whereNotExists(
          db('consultations as c2')
            .whereRaw('c2.patient_id = c1.patient_id')
            .where('c2.organization_id', req.orgId)
            .where('c2.created_at', '<', startOfMonth)
        )
        .countDistinct('c1.patient_id as cnt')
        .first();
      const new_patients_month = Number(newPatientsRow?.cnt ?? 0);

      // Occupancy rate: completed appointments / total appointments this month (%)
      const apptRows = await db('appointments')
        .where({ organization_id: req.orgId, doctor_id: req.user.id })
        .where('scheduled_at', '>=', startOfMonth.toISOString().split('T')[0])
        .select(
          db.raw("COUNT(*)::integer as total"),
          db.raw("COUNT(*) FILTER (WHERE status IN ('completed','in-room'))::integer as done")
        )
        .first();
      const apptTotal = Number(apptRows?.total ?? 0);
      const apptDone  = Number(apptRows?.done  ?? 0);
      const occupancy_rate = apptTotal > 0 ? Math.round((apptDone / apptTotal) * 100) : 0;

      // Top 4 chief complaints
      const rawReasons = await db('consultations')
        .where({ organization_id: req.orgId, doctor_id: req.user.id })
        .whereNotNull('chief_complaint')
        .whereNot('chief_complaint', '')
        .select(db.raw('chief_complaint as label'), db.raw('COUNT(*)::integer as cnt'))
        .groupBy('chief_complaint')
        .orderBy('cnt', 'desc')
        .limit(4);

      const totalReasons = rawReasons.reduce((s, r) => s + Number(r.cnt), 0) || 1;
      const top_reasons = rawReasons.map(r => ({
        label: r.label,
        pct:   Math.round((Number(r.cnt) / totalReasons) * 100),
      }));

      res.json({ total_month, new_patients_month, occupancy_rate, top_reasons });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /consultations/stats/week
   * Nombre de consultations par jour de la semaine en cours (lun–dim).
   * Retourne un tableau de { day_of_week: 1–7, count } (ISO: 1=lundi, 7=dimanche).
   */
  router.get('/stats/week', authorize('doctor'), async (req, res, next) => {
    try {
      const now = new Date();
      // Start of ISO week (Monday)
      const day = now.getDay(); // 0=Sunday...6=Saturday
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() + diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const rows = await db('consultations')
        .where({ organization_id: req.orgId, doctor_id: req.user.id })
        .where('created_at', '>=', startOfWeek)
        .select(
          db.raw("EXTRACT(ISODOW FROM created_at)::integer as day_of_week"),
          db.raw('COUNT(*)::integer as count')
        )
        .groupByRaw("EXTRACT(ISODOW FROM created_at)")
        .orderByRaw("EXTRACT(ISODOW FROM created_at)");

      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /consultations/:id
   * Le médecin auteur peut compléter / corriger ses notes après coup.
   * Seul le médecin qui a créé la consultation peut la modifier (doctor_id = req.user.id).
   */
  router.patch('/:id', authorize('doctor'), async (req, res, next) => {
    try {
      const { error, value } = updateSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const consultation = await db('consultations')
        .where({ id: req.params.id, organization_id: req.orgId, doctor_id: req.user.id })
        .first();

      if (!consultation) return res.status(404).json({ error: 'Consultation introuvable ou accès refusé' });

      const [updated] = await db('consultations')
        .where({ id: req.params.id })
        .update({ ...value, updated_at: new Date() })
        .returning(['id', 'patient_id', 'appointment_id', 'chief_complaint', 'examination', 'diagnosis', 'notes', 'created_at', 'updated_at']);

      res.json(updated);
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
