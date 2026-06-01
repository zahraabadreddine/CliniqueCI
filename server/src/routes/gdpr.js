const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');

module.exports = function gdprRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  // ── GET export all data for a patient ────────────────────────────────
  router.get('/export/:patientId', authorize('admin', 'doctor', 'patient'), async (req, res, next) => {
    try {
      const { patientId } = req.params;

      // Patient role can only export their own data
      if (req.user.role === 'patient') {
        const p = await db('patients').where({ id: patientId, user_id: req.user.id }).first();
        if (!p) return res.status(403).json({ error: 'Accès refusé' });
      }

      const patient = await db('patients')
        .where({ id: patientId, organization_id: req.orgId })
        .select('id', 'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'address', 'blood_type', 'allergies', 'chronic_diseases', 'created_at')
        .first();

      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

      const [appointments, consultations, prescriptions, invoices, consentSigs] = await Promise.all([
        db('appointments')
          .where({ patient_id: patientId, organization_id: req.orgId })
          .select('id', 'scheduled_at', 'status', 'reason', 'notes', 'created_at'),

        db('consultations')
          .where({ patient_id: patientId, organization_id: req.orgId })
          .select('id', 'chief_complaint', 'examination', 'diagnosis', 'notes', 'created_at'),

        db('prescriptions')
          .where({ patient_id: patientId, organization_id: req.orgId })
          .select('id', 'medications', 'notes', 'created_at'),

        db('invoices')
          .where({ patient_id: patientId, organization_id: req.orgId })
          .select('id', 'amount', 'currency', 'status', 'payment_method', 'notes', 'paid_at', 'created_at'),

        db('consent_signatures')
          .join('consent_forms', 'consent_signatures.consent_form_id', 'consent_forms.id')
          .where({ 'consent_signatures.patient_id': patientId, 'consent_signatures.organization_id': req.orgId })
          .select('consent_forms.title', 'consent_signatures.signed', 'consent_signatures.signed_at'),
      ]);

      const safeParse = (val, fallback = null) => {
        if (typeof val !== 'string') return val ?? fallback;
        try { return JSON.parse(val); } catch { return val; }
      };

      const exportData = {
        exported_at: new Date().toISOString(),
        patient: {
          ...patient,
          allergies: safeParse(patient.allergies, []),
          chronic_diseases: safeParse(patient.chronic_diseases, []),
        },
        appointments,
        consultations,
        prescriptions: prescriptions.map(p => ({
          ...p,
          medications: safeParse(p.medications),
        })),
        invoices,
        consent_signatures: consentSigs,
        summary: {
          total_appointments: appointments.length,
          total_consultations: consultations.length,
          total_prescriptions: prescriptions.length,
          total_invoices: invoices.length,
        },
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="patient_data_${patientId}_${Date.now()}.json"`);
      res.json(exportData);
    } catch (err) {
      next(err);
    }
  });

  // ── POST anonymize patient data (GDPR right to erasure) ──────────────
  // Admin only — soft anonymizes PII, keeps medical records structure
  router.post('/anonymize/:patientId', authorize('admin'), async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const patient = await db('patients').where({ id: patientId, organization_id: req.orgId }).first();
      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

      const { confirm } = req.body;
      if (confirm !== 'CONFIRMER_ANONYMISATION') {
        return res.status(400).json({ error: 'Confirmez en envoyant confirm: "CONFIRMER_ANONYMISATION"' });
      }

      const trx = await db.transaction();
      try {
        await trx('patients')
          .where({ id: patientId, organization_id: req.orgId })
          .update({
            first_name: 'Anonymisé',
            last_name: `Patient-${patientId.slice(0, 8)}`,
            date_of_birth: '1900-01-01',
            phone: null,
            email: null,
            address: null,
            updated_at: trx.fn.now(),
          });

        // Nullify user account link if exists
        const p = await trx('patients').where({ id: patientId }).select('user_id').first();
        if (p?.user_id) {
          await trx('users').where({ id: p.user_id }).update({
            email: `anon-${p.user_id.slice(0, 8)}@supprime.local`,
            first_name: 'Anonymisé',
            last_name: 'Supprimé',
            is_active: false,
            updated_at: trx.fn.now(),
          });
        }

        await trx.commit();
        res.json({ message: 'Patient anonymisé avec succès', patient_id: patientId });
      } catch (e) {
        await trx.rollback();
        throw e;
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
};
