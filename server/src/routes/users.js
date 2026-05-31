const express = require('express');
const bcrypt = require('bcrypt');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');
const { inviteSchema, updateUserSchema } = require('../validators/users');

const SALT_ROUNDS = 12;

module.exports = function usersRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  // ─── GET /  ─────────────────────────────────────────────────────────────────
  router.get('/', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      // Patients can only see the list of active doctors (for booking)
      if (req.user.role === 'patient') {
        const doctors = await db('users')
          .where({ organization_id: req.orgId, role: 'doctor', is_active: true })
          .select('id', 'first_name', 'last_name', 'role', 'specialty')
          .orderBy('last_name', 'asc');
        return res.json(doctors);
      }

      const users = await db('users')
        .where({ organization_id: req.orgId })
        .select('id', 'email', 'first_name', 'last_name', 'role', 'specialty', 'is_active', 'created_at')
        .orderBy('last_name', 'asc');
      res.json(users);
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /  (admin creates staff account) ───────────────────────────────────
  router.post('/', authorize('admin'), async (req, res, next) => {
    try {
      const { error, value } = inviteSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const existing = await db('users').where({ email: value.email }).first();
      if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

      const { password, ...userData } = value;
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const [user] = await db('users')
        .insert({ ...userData, password_hash, organization_id: req.orgId })
        .returning(['id', 'email', 'first_name', 'last_name', 'role', 'specialty', 'is_active', 'created_at']);

      await auditLog(db, req, 'USER_CREATED', 'user', user.id, {
        email: user.email,
        role: user.role,
      });

      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /:id ────────────────────────────────────────────────────────────────
  router.get('/:id', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const user = await db('users')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select('id', 'email', 'first_name', 'last_name', 'role', 'specialty', 'is_active', 'created_at')
        .first();
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  // ─── PATCH /:id  (update profile fields) ────────────────────────────────────
  router.patch('/:id', authorize('admin'), async (req, res, next) => {
    try {
      const { error, value } = updateUserSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      if (value.email) {
        const existing = await db('users')
          .where({ email: value.email })
          .whereNot({ id: req.params.id })
          .first();
        if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });
      }

      const [user] = await db('users')
        .where({ id: req.params.id, organization_id: req.orgId })
        .update({ ...value, updated_at: new Date() })
        .returning(['id', 'email', 'first_name', 'last_name', 'role', 'specialty', 'is_active', 'created_at']);

      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

      await auditLog(db, req, 'USER_UPDATED', 'user', user.id, value);

      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  // ─── PATCH /:id/status  (suspend / reactivate) ──────────────────────────────
  router.patch('/:id/status', authorize('admin'), async (req, res, next) => {
    try {
      const { is_active } = req.body;
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active (boolean) requis' });
      }

      // Prevent admin from suspending themselves
      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas suspendre votre propre compte' });
      }

      const [user] = await db('users')
        .where({ id: req.params.id, organization_id: req.orgId })
        .update({ is_active, updated_at: new Date() })
        .returning(['id', 'email', 'first_name', 'last_name', 'role', 'is_active']);

      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

      // Revoke all refresh tokens when suspending (immediate effect on next refresh)
      if (!is_active) {
        await db('refresh_tokens').where({ user_id: req.params.id }).del();
      }

      await auditLog(db, req, is_active ? 'USER_REACTIVATED' : 'USER_SUSPENDED', 'user', user.id, {
        email: user.email,
      });

      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
