const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');

module.exports = function queueRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  // Helper: today's date string YYYY-MM-DD
  const today = () => new Date().toISOString().slice(0, 10);

  // ── GET today's queue ─────────────────────────────────────────────────
  router.get('/', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const date = req.query.date || today();
      const tokens = await db('queue_tokens')
        .where({ organization_id: req.orgId, date })
        .select('id', 'number', 'patient_name', 'reason', 'status', 'date', 'created_at')
        .orderBy('number');

      const waiting = tokens.filter(t => t.status === 'waiting').length;
      const called = tokens.find(t => t.status === 'called');

      res.json({ date, tokens, waiting_count: waiting, current: called || null });
    } catch (err) {
      next(err);
    }
  });

  // ── POST add patient to queue ─────────────────────────────────────────
  router.post('/', authorize('secretary'), async (req, res, next) => {
    try {
      const { patient_name, reason } = req.body;
      const date = today();

      // Next number = max existing today + 1
      const result = await db('queue_tokens')
        .where({ organization_id: req.orgId, date })
        .max('number as max')
        .first();

      const nextNumber = (result.max || 0) + 1;

      const [token] = await db('queue_tokens')
        .insert({
          organization_id: req.orgId,
          number: nextNumber,
          patient_name: patient_name || null,
          reason: reason || null,
          status: 'waiting',
          date,
        })
        .returning(['id', 'number', 'patient_name', 'reason', 'status', 'date', 'created_at']);

      res.status(201).json(token);
    } catch (err) {
      next(err);
    }
  });

  // ── PATCH update status (called / done / cancelled) ───────────────────
  router.patch('/:id', authorize('admin', 'secretary', 'doctor'), async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!['waiting', 'called', 'done', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Statut invalide' });
      }

      const token = await db('queue_tokens').where({ id: req.params.id, organization_id: req.orgId }).first();
      if (!token) return res.status(404).json({ error: 'Token introuvable' });

      // If calling, reset any previously called token to waiting
      if (status === 'called') {
        await db('queue_tokens')
          .where({ organization_id: req.orgId, date: token.date, status: 'called' })
          .update({ status: 'waiting', updated_at: db.fn.now() });
      }

      const [updated] = await db('queue_tokens')
        .where({ id: req.params.id, organization_id: req.orgId })
        .update({ status, updated_at: db.fn.now() })
        .returning(['id', 'number', 'patient_name', 'reason', 'status', 'date', 'updated_at']);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE a queue token ──────────────────────────────────────────────
  router.delete('/:id', authorize('admin', 'secretary'), async (req, res, next) => {
    try {
      const deleted = await db('queue_tokens').where({ id: req.params.id, organization_id: req.orgId }).delete();
      if (!deleted) return res.status(404).json({ error: 'Token introuvable' });
      res.json({ message: 'Supprimé' });
    } catch (err) {
      next(err);
    }
  });

  // ── POST call next (auto-call the first waiting token) ───────────────
  router.post('/next', authorize('doctor'), async (req, res, next) => {
    try {
      const date = today();

      // Reset any currently called token
      await db('queue_tokens')
        .where({ organization_id: req.orgId, date, status: 'called' })
        .update({ status: 'done', updated_at: db.fn.now() });

      // Get the next waiting token
      const next = await db('queue_tokens')
        .where({ organization_id: req.orgId, date, status: 'waiting' })
        .orderBy('number')
        .first();

      if (!next) return res.json({ message: 'Aucun patient en attente', current: null });

      const [called] = await db('queue_tokens')
        .where({ id: next.id })
        .update({ status: 'called', updated_at: db.fn.now() })
        .returning(['id', 'number', 'patient_name', 'reason', 'status']);

      res.json({ message: `Numéro ${called.number} appelé`, current: called });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
