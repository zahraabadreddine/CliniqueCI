module.exports = function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.isJoi) {
    return res.status(400).json({ error: err.details[0].message });
  }

  const status = err.status || 500;
  const message = err.message || 'Erreur interne du serveur';
  res.status(status).json({ error: message });
};
