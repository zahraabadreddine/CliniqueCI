/**
 * auditLog — helper to insert an immutable record into audit_logs.
 *
 * Usage (inside a route handler):
 *   const auditLog = require('../middleware/auditLog');
 *   await auditLog(db, req, 'USER_SUSPENDED', 'user', targetUserId, { reason: 'admin action' });
 *
 * Or use the Express middleware factory for automatic logging on a route:
 *   router.patch('/:id/status', authorize('admin'), auditLog.middleware(db, 'USER_STATUS_CHANGED'), handler);
 */

async function auditLog(db, req, action, targetType = null, targetId = null, details = null) {
  try {
    await db('audit_logs').insert({
      organization_id: req.orgId || req.user?.organization_id,
      actor_id: req.user?.id || null,
      action,
      target_type: targetType,
      target_id: targetId || null,
      ip_address: req.ip_address || null,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (err) {
    // Audit failures must never crash the main request — log to stderr only
    console.error('[audit_log] Failed to write audit entry:', err.message);
  }
}

module.exports = auditLog;
