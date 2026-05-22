const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/authenticate');
const { registerSchema, loginSchema } = require('../validators/auth');

const SALT_ROUNDS = 12;

function issueTokens(user, res) {
  const accessToken = jwt.sign(
    { id: user.id, organization_id: user.organization_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = uuidv4();

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  return refreshToken;
}

module.exports = function authRoutes(db) {
  const router = express.Router();

  router.post('/register', async (req, res, next) => {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const { clinic_name, email, password, first_name, last_name } = value;

      const existing = await db('users').where({ email }).first();
      if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

      let responsePayload;
      await db.transaction(async (trx) => {
        const [org] = await trx('organizations')
          .insert({ name: clinic_name })
          .returning(['id', 'name']);

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        const [user] = await trx('users')
          .insert({ organization_id: org.id, email, password_hash, first_name, last_name, role: 'admin' })
          .returning(['id', 'organization_id', 'role', 'email', 'first_name', 'last_name']);

        const refreshToken = issueTokens(user, res);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await trx('refresh_tokens').insert({ user_id: user.id, token: refreshToken, expires_at: expiresAt });

        res.cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        responsePayload = { user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name, organization: org } };
      });

      res.status(201).json(responsePayload);
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const { email, password } = value;
      const user = await db('users')
        .where({ email })
        .select('id', 'organization_id', 'role', 'email', 'first_name', 'last_name', 'password_hash')
        .first();

      if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

      const refreshToken = issueTokens(user, res);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db('refresh_tokens').insert({ user_id: user.id, token: refreshToken, expires_at: expiresAt });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name } });
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', authenticate, async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      // Tenter la suppression par token ; si aucune ligne affectée, révoquer par user_id
      const deleted = refreshToken
        ? await db('refresh_tokens').where({ token: refreshToken }).del()
        : 0;
      if (deleted === 0) {
        await db('refresh_tokens').where({ user_id: req.user.id }).del();
      }
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.json({ message: 'Déconnecté' });
    } catch (err) {
      next(err);
    }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) return res.status(401).json({ error: 'Refresh token manquant' });

      const stored = await db('refresh_tokens')
        .where({ token: refreshToken })
        .where('expires_at', '>', new Date())
        .first();

      if (!stored) return res.status(401).json({ error: 'Refresh token invalide ou expiré' });

      const user = await db('users')
        .where({ id: stored.user_id })
        .select('id', 'organization_id', 'role')
        .first();

      const newRefreshToken = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.transaction(async (trx) => {
        await trx('refresh_tokens').where({ token: refreshToken }).delete();
        await trx('refresh_tokens').insert({ user_id: user.id, token: newRefreshToken, expires_at: expiresAt });
      });

      issueTokens(user, res);
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ message: 'Token renouvelé' });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
