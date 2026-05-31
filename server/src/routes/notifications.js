const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');

module.exports = function notificationsRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  // ── GET /api/notifications/vapid-public-key ───────────────────────────────
  // Returns the VAPID public key so the frontend can subscribe to push
  router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  // ── GET /api/notifications/unread-count ───────────────────────────────────
  // Lightweight endpoint polled every 30 s by the frontend TopBar
  router.get('/unread-count', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const row = await db('notifications')
        .where({ organization_id: req.orgId, user_id: req.user.id, is_read: false })
        .count('id as count')
        .first();
      res.json({ count: parseInt(row.count, 10) });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /api/notifications ────────────────────────────────────────────────
  // Returns paginated list of notifications for the current user
  router.get('/', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const [items, countRow] = await Promise.all([
        db('notifications')
          .where({ organization_id: req.orgId, user_id: req.user.id })
          .select('id', 'type', 'title', 'body', 'link', 'is_read', 'created_at')
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset),
        db('notifications')
          .where({ organization_id: req.orgId, user_id: req.user.id })
          .count('id as count')
          .first(),
      ]);

      res.json({
        data: items,
        total: parseInt(countRow.count, 10),
        page,
        limit,
      });
    } catch (err) {
      next(err);
    }
  });

  // ── PATCH /api/notifications/read-all ─────────────────────────────────────
  // Mark all unread notifications as read for the current user
  router.patch('/read-all', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      await db('notifications')
        .where({ organization_id: req.orgId, user_id: req.user.id, is_read: false })
        .update({ is_read: true, updated_at: new Date() });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // ── PATCH /api/notifications/:id/read ─────────────────────────────────────
  // Mark a single notification as read
  router.patch('/:id/read', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const updated = await db('notifications')
        .where({ id: req.params.id, organization_id: req.orgId, user_id: req.user.id })
        .update({ is_read: true, updated_at: new Date() });
      if (!updated) return res.status(404).json({ error: 'Notification introuvable' });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /api/notifications/push-subscribe ────────────────────────────────
  // Save (or update) a push subscription for the current user/device
  router.post('/push-subscribe', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return res.status(400).json({ error: 'Subscription invalide (endpoint ou keys manquants)' });
      }

      // Upsert: one row per endpoint (same device may re-subscribe)
      const existing = await db('push_subscriptions')
        .where({ user_id: req.user.id, endpoint })
        .first();

      if (existing) {
        await db('push_subscriptions')
          .where({ id: existing.id })
          .update({ keys: JSON.stringify(keys), updated_at: new Date() });
      } else {
        await db('push_subscriptions').insert({
          organization_id: req.orgId,
          user_id: req.user.id,
          endpoint,
          keys: JSON.stringify(keys),
        });
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE /api/notifications/push-subscribe ──────────────────────────────
  // Remove a push subscription (user disabled notifications or logged out)
  router.delete('/push-subscribe', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) return res.status(400).json({ error: 'endpoint manquant' });

      await db('push_subscriptions')
        .where({ user_id: req.user.id, endpoint })
        .delete();

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
