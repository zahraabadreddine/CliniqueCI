const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');

module.exports = function consentRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  // ── GET all consent forms ─────────────────────────────────────────────
  router.get('/forms', authorize('secretary'), async (req, res, next) => {
    try {
      const forms = await db('consent_forms')
        .where({ organization_id: req.orgId, is_active: true })
        .select('id', 'title', 'category', 'is_active', 'created_at')
        .orderBy('category');
      res.json(forms);
    } catch (err) {
      next(err);
    }
  });

  // ── GET single form ───────────────────────────────────────────────────
  router.get('/forms/:id', authorize('secretary'), async (req, res, next) => {
    try {
      const form = await db('consent_forms')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select('id', 'title', 'content', 'category', 'is_active', 'created_at')
        .first();
      if (!form) return res.status(404).json({ error: 'Formulaire introuvable' });
      res.json(form);
    } catch (err) {
      next(err);
    }
  });

  // ── POST create form ──────────────────────────────────────────────────
  router.post('/forms', authorize('secretary'), async (req, res, next) => {
    try {
      const { title, content, category } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'Titre et contenu requis' });

      const [form] = await db('consent_forms')
        .insert({
          organization_id: req.orgId,
          title,
          content,
          category: category || 'general',
          is_active: true,
        })
        .returning(['id', 'title', 'category', 'is_active', 'created_at']);

      res.status(201).json(form);
    } catch (err) {
      next(err);
    }
  });

  // ── PATCH update form ─────────────────────────────────────────────────
  router.patch('/forms/:id', authorize('secretary'), async (req, res, next) => {
    try {
      const form = await db('consent_forms').where({ id: req.params.id, organization_id: req.orgId }).first();
      if (!form) return res.status(404).json({ error: 'Formulaire introuvable' });

      const { title, content, category, is_active } = req.body;
      const [updated] = await db('consent_forms')
        .where({ id: req.params.id, organization_id: req.orgId })
        .update({
          ...(title && { title }),
          ...(content && { content }),
          ...(category && { category }),
          ...(is_active !== undefined && { is_active }),
          updated_at: db.fn.now(),
        })
        .returning(['id', 'title', 'category', 'is_active', 'updated_at']);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // ── GET signatures for a patient ─────────────────────────────────────
  router.get('/signatures', authorize('secretary'), async (req, res, next) => {
    try {
      const { patient_id } = req.query;
      let query = db('consent_signatures')
        .where('consent_signatures.organization_id', req.orgId)
        .join('consent_forms', 'consent_signatures.consent_form_id', 'consent_forms.id')
        .join('patients', 'consent_signatures.patient_id', 'patients.id')
        .select(
          'consent_signatures.id',
          'consent_signatures.signed',
          'consent_signatures.signed_at',
          'consent_signatures.created_at',
          'consent_forms.title as form_title',
          'consent_forms.category as form_category',
          db.raw("patients.first_name || ' ' || patients.last_name as patient_name"),
          'consent_signatures.patient_id',
          'consent_signatures.consent_form_id'
        )
        .orderBy('consent_signatures.created_at', 'desc');

      if (patient_id) query = query.where('consent_signatures.patient_id', patient_id);
      const sigs = await query;
      res.json(sigs);
    } catch (err) {
      next(err);
    }
  });

  // ── POST request signature (create pending signature) ────────────────
  router.post('/signatures', authorize('secretary'), async (req, res, next) => {
    try {
      const { patient_id, consent_form_id } = req.body;
      if (!patient_id || !consent_form_id) return res.status(400).json({ error: 'patient_id et consent_form_id requis' });

      const patient = await db('patients').where({ id: patient_id, organization_id: req.orgId }).first();
      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

      const form = await db('consent_forms').where({ id: consent_form_id, organization_id: req.orgId }).first();
      if (!form) return res.status(404).json({ error: 'Formulaire introuvable' });

      const [sig] = await db('consent_signatures')
        .insert({
          organization_id: req.orgId,
          consent_form_id,
          patient_id,
          collected_by: req.user.id,
          signed: false,
        })
        .returning(['id', 'consent_form_id', 'patient_id', 'signed', 'created_at']);

      res.status(201).json(sig);
    } catch (err) {
      next(err);
    }
  });

  // ── PATCH sign consent ────────────────────────────────────────────────
  router.patch('/signatures/:id/sign', authorize('secretary'), async (req, res, next) => {
    try {
      const sig = await db('consent_signatures').where({ id: req.params.id, organization_id: req.orgId }).first();
      if (!sig) return res.status(404).json({ error: 'Signature introuvable' });

      const { signature_data } = req.body;

      const [updated] = await db('consent_signatures')
        .where({ id: req.params.id, organization_id: req.orgId })
        .update({
          signed: true,
          signed_at: db.fn.now(),
          signature_data: signature_data || null,
          updated_at: db.fn.now(),
        })
        .returning(['id', 'signed', 'signed_at', 'signature_data']);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
