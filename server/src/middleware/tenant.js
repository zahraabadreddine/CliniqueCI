module.exports = function tenant(req, res, next) {
  if (!req.user?.organization_id) {
    return res.status(403).json({ error: 'Organisation non identifiée' });
  }
  req.orgId = req.user.organization_id;
  next();
};
