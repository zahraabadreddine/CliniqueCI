const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');

module.exports = function recordSharesRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  // ── GET requests sent BY this org ─────────────────────────────────────
  router.get('/outgoing', authorize('admin'), async (req, res, next) => {
    try {
      const rows = await db('record_share_requests')
        .where('requesting_org_id', req.orgId)
        .join('organizations as src', 'record_share_requests.source_org_id', 'src.id')
        .join('patients', 'record_share_requests.patient_id', 'patients.id')
        .select(
          'record_share_requests.id',
          'record_share_requests.status',
          'record_share_requests.reason',
          'record_share_requests.patient_consent_code',
          'record_share_requests.expires_at',
          'record_share_requests.created_at',
          'src.name as source_org_name',
          db.raw("patients.first_name || ' ' || patients.last_name as patient_name"),
          'patients.id as patient_id'
        )
        .orderBy('record_share_requests.created_at', 'desc');

      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // ── GET requests received BY this org ────────────────────────────────
  router.get('/incoming', authorize('admin'), async (req, res, next) => {
    try {
      const rows = await db('record_share_requests')
        .where('source_org_id', req.orgId)
        .join('organizations as req_org', 'record_share_requests.requesting_org_id', 'req_org.id')
        .join('patients', 'record_share_requests.patient_id', 'patients.id')
        .select(
          'record_share_requests.id',
          'record_share_requests.status',
          'record_share_requests.reason',
          'record_share_requests.patient_consent_code',
          'record_share_requests.expires_at',
          'record_share_requests.created_at',
          'req_org.name as requesting_org_name',
          db.raw("patients.first_name || ' ' || patients.last_name as patient_name"),
          'patients.id as patient_id'
        )
        .orderBy('record_share_requests.created_at', 'desc');

      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // ── POST create share request ─────────────────────────────────────────
  // Requires patient consent code that was given to the patient
  router.post('/', authorize('admin'), async (req, res, next) => {
    try {
      const { source_org_id, patient_consent_code, reason } = req.body;
      if (!source_org_id || !patient_consent_code) {
        return res.status(400).json({ error: 'source_org_id et patient_consent_code requis' });
      }

      // Find the patient by consent code
      const existing = await db('record_share_requests')
        .where({ patient_consent_code, source_org_id, status: 'pending' })
        .first();

      if (!existing) {
        return res.status(404).json({ error: 'Code de consentement invalide ou expiré' });
      }

      // Create new request
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const [request] = await db('record_share_requests')
        .insert({
          requesting_org_id: req.orgId,
          source_org_id,
          patient_id: existing.patient_id,
          requested_by: req.user.id,
          status: 'pending',
          reason: reason || null,
          patient_consent_code,
          expires_at: expiresAt,
        })
        .returning(['id', 'status', 'reason', 'expires_at', 'created_at']);

      res.status(201).json(request);
    } catch (err) {
      next(err);
    }
  });

  // ── POST generate consent code for a patient (source org side) ───────
  router.post('/consent-code', authorize('admin'), async (req, res, next) => {
    try {
      const { patient_id } = req.body;
      if (!patient_id) return res.status(400).json({ error: 'patient_id requis' });

      const patient = await db('patients').where({ id: patient_id, organization_id: req.orgId }).first();
      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

      // Generate 6-char alphanumeric code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create a pending placeholder so the requesting org can use it
      const [req_entry] = await db('record_share_requests')
        .insert({
          requesting_org_id: req.orgId, // will be overwritten when requesting org sends actual request
          source_org_id: req.orgId,
          patient_id,
          requested_by: req.user.id,
          status: 'pending',
          patient_consent_code: code,
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        })
        .returning(['id', 'patient_consent_code', 'expires_at']);

      res.status(201).json({
        consent_code: code,
        expires_at: req_entry.expires_at,
        instructions: `Donnez ce code au patient : ${code}. Il doit le transmettre à la clinique partenaire.`,
      });
    } catch (err) {
      next(err);
    }
  });

  // ── PATCH approve/deny a request ─────────────────────────────────────
  router.patch('/:id', authorize('admin'), async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ error: 'Statut invalide (approved|denied)' });
      }

      const request = await db('record_share_requests')
        .where({ id: req.params.id, source_org_id: req.orgId })
        .first();

      if (!request) return res.status(404).json({ error: 'Demande introuvable' });

      const updatePayload = { status, updated_at: db.fn.now() };
      // When approving, reset expiry to 7 days from now (not from code generation)
      if (status === 'approved') {
        updatePayload.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      const [updated] = await db('record_share_requests')
        .where({ id: req.params.id })
        .update(updatePayload)
        .returning(['id', 'status', 'updated_at', 'expires_at']);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // ── GET shared patient records (if approved) ─────────────────────────
  router.get('/:id/records', authorize('admin'), async (req, res, next) => {
    try {
      const request = await db('record_share_requests')
        .where({ id: req.params.id, requesting_org_id: req.orgId, status: 'approved' })
        .first();

      if (!request) return res.status(403).json({ error: 'Accès refusé ou demande non approuvée' });

      // Check expiry
      if (request.expires_at && new Date(request.expires_at) < new Date()) {
        return res.status(403).json({ error: 'Le partage a expiré' });
      }

      const [patient, consultations, prescriptions] = await Promise.all([
        db('patients').where({ id: request.patient_id }).select('id', 'first_name', 'last_name', 'date_of_birth', 'blood_type', 'allergies', 'chronic_diseases').first(),
        db('consultations').where({ patient_id: request.patient_id, organization_id: request.source_org_id })
          .select('id', 'chief_complaint', 'examination', 'diagnosis', 'notes', 'created_at').orderBy('created_at', 'desc').limit(20),
        db('prescriptions').where({ patient_id: request.patient_id, organization_id: request.source_org_id })
          .select('id', 'medications', 'notes', 'created_at').orderBy('created_at', 'desc').limit(20),
      ]);

      res.json({
        request_id: request.id,
        expires_at: request.expires_at,
        patient,
        consultations,
        prescriptions: prescriptions.map(p => ({
          ...p,
          medications: typeof p.medications === 'string' ? JSON.parse(p.medications) : p.medications,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
