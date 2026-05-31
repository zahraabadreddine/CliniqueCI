const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');

/**
 * GET /api/audit-logs
 * Admin-only read access. Returns paginated audit entries for the org.
 *
 * Query params:
 *   ?page=1&limit=50&action=USER_SUSPENDED&actor_id=<uuid>
 */
module.exports = function auditLogsRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.get('/', authorize('admin'), async (req, res, next) => {
    try {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;

      let query = db('audit_logs as al')
        .leftJoin('users as u', 'u.id', 'al.actor_id')
        .where('al.organization_id', req.orgId)
        .select(
          'al.id',
          'al.action',
          'al.target_type',
          'al.target_id',
          'al.ip_address',
          'al.details',
          'al.created_at',
          'u.first_name as actor_first_name',
          'u.last_name  as actor_last_name',
          'u.role       as actor_role',
        )
        .orderBy('al.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      if (req.query.action) query = query.where('al.action', req.query.action);
      if (req.query.actor_id) query = query.where('al.actor_id', req.query.actor_id);

      const [logs, [{ count }]] = await Promise.all([
        query,
        db('audit_logs').where('organization_id', req.orgId).count('id as count'),
      ]);

      res.json({ logs, total: Number(count), page, limit });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
