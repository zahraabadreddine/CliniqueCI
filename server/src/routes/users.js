const express = require('express');
const bcrypt = require('bcrypt');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { inviteSchema, updateUserSchema } = require('../validators/users');

const SALT_ROUNDS = 12;

module.exports = function usersRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.get('/', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      // Patients can only see the list of doctors (for booking)
      if (req.user.role === 'patient') {
        const doctors = await db('users')
          .where({ organization_id: req.orgId, role: 'doctor' })
          .select('id', 'first_name', 'last_name', 'role')
          .orderBy('last_name', 'asc');
        return res.json(doctors);
      }

      const users = await db('users')
        .where({ organization_id: req.orgId })
        .select('id', 'email', 'first_name', 'last_name', 'role', 'created_at')
        .orderBy('last_name', 'asc');
      res.json(users);
    } catch (err) {
      next(err);
    }
  });

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
        .returning(['id', 'email', 'first_name', 'last_name', 'role', 'created_at']);

      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const user = await db('users')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select('id', 'email', 'first_name', 'last_name', 'role', 'created_at')
        .first();
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

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
        .returning(['id', 'email', 'first_name', 'last_name', 'role', 'created_at']);

      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
