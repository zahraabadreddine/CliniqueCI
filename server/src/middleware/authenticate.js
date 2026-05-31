const jwt = require('jsonwebtoken');

/**
 * authenticate — verify JWT and check account is not suspended.
 *
 * Usage in app.js:
 *   const authenticate = require('./middleware/authenticate');
 *   authenticate.init(db);           // call once before mounting routes
 *
 * Usage in route files (unchanged):
 *   const authenticate = require('../middleware/authenticate');
 *   router.use(authenticate, tenant);
 */

let _db = null;

async function authenticate(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  // is_active check — only when db has been initialised (always in production)
  if (_db) {
    try {
      const user = await _db('users').where({ id: payload.id }).select('is_active').first();
      if (!user || user.is_active === false) {
        return res.status(403).json({ error: 'Compte suspendu. Contactez votre administrateur.' });
      }
    } catch (err) {
      return next(err);
    }
  }

  req.user = payload;
  // Expose real IP for audit logs (works behind nginx / load-balancer)
  req.ip_address =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress;

  next();
}

/** Call once at app start-up to enable DB-backed is_active checks. */
authenticate.init = function (db) {
  _db = db;
};

module.exports = authenticate;
