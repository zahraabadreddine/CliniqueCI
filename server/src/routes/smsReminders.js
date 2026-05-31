const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { sendSms } = require('../services/smsService');

module.exports = function smsRemindersRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  // ── GET all SMS reminders ─────────────────────────────────────────────
  router.get('/', authorize('admin', 'secretary'), async (req, res, next) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      let query = db('sms_reminders')
        .where('sms_reminders.organization_id', req.orgId)
        .join('appointments', 'sms_reminders.appointment_id', 'appointments.id')
        .join('patients', 'appointments.patient_id', 'patients.id')
        .select(
          'sms_reminders.id',
          'sms_reminders.phone',
          'sms_reminders.type',
          'sms_reminders.status',
          'sms_reminders.message',
          'sms_reminders.scheduled_at',
          'sms_reminders.sent_at',
          'sms_reminders.created_at',
          db.raw("patients.first_name || ' ' || patients.last_name as patient_name"),
          'appointments.scheduled_at as appointment_at'
        )
        .orderBy('sms_reminders.scheduled_at', 'desc')
        .limit(Number(limit))
        .offset(Number(offset));

      if (status) query = query.where('sms_reminders.status', status);

      const rows = await query;
      const [{ count }] = await db('sms_reminders').where({ organization_id: req.orgId }).count('id as count');

      res.json({ reminders: rows, total: Number(count) });
    } catch (err) {
      next(err);
    }
  });

  // ── GET stats ─────────────────────────────────────────────────────────
  router.get('/stats', authorize('admin', 'secretary'), async (req, res, next) => {
    try {
      const stats = await db('sms_reminders')
        .where({ organization_id: req.orgId })
        .select('status')
        .count('id as count')
        .groupBy('status');

      const result = { pending: 0, sent: 0, failed: 0 };
      stats.forEach(s => { result[s.status] = Number(s.count); });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // ── POST envoyer un SMS manuel (secrétaire) ───────────────────────────
  // Permet à la secrétaire de composer et envoyer un message libre à n'importe quel numéro
  router.post('/send', authorize('secretary'), async (req, res, next) => {
    try {
      const { phone, message } = req.body;
      if (!phone)             return res.status(400).json({ error: 'Numéro de téléphone requis' });
      if (!message?.trim())  return res.status(400).json({ error: 'Le message ne peut pas être vide' });
      if (message.length > 300) return res.status(400).json({ error: 'Message trop long (300 caractères max)' });

      // Signature automatique avec le nom de la clinique
      const org = await db('organizations').where({ id: req.orgId }).select('name').first();
      const orgName   = org?.name ?? 'Votre clinique';
      const signature = `\n— ${orgName}`;
      const fullMessage = message.trim() + signature;

      const result = await sendSms(phone.trim(), fullMessage);
      res.json({
        success:  result.success,
        message:  result.success ? 'SMS envoyé avec succès' : 'Échec de l\'envoi',
        mock:     result.mock ?? false,
        orgName,
      });
    } catch (err) {
      next(err);
    }
  });

  // ── POST send test SMS (admin uniquement) ─────────────────────────────
  router.post('/test', authorize('admin'), async (req, res, next) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ error: 'Numéro de téléphone requis' });

      const result = await sendSms(phone, `[CliniqueCI TEST] SMS de test envoyé le ${new Date().toLocaleString('fr-FR')}`);
      res.json({ message: 'SMS de test envoyé', result });
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE cancel a pending SMS (secrétaire uniquement) ─────────────
  router.delete('/:id', authorize('secretary'), async (req, res, next) => {
    try {
      const sms = await db('sms_reminders')
        .where({ id: req.params.id, organization_id: req.orgId, status: 'pending' })
        .first();
      if (!sms) return res.status(404).json({ error: 'SMS introuvable ou déjà envoyé' });

      await db('sms_reminders').where({ id: req.params.id }).delete();
      res.json({ message: 'SMS annulé' });
    } catch (err) {
      next(err);
    }
  });

  // ── POST retry a failed SMS ───────────────────────────────────────────
  router.post('/:id/retry', authorize('admin', 'secretary'), async (req, res, next) => {
    try {
      const sms = await db('sms_reminders').where({ id: req.params.id, organization_id: req.orgId, status: 'failed' }).first();
      if (!sms) return res.status(404).json({ error: 'SMS introuvable ou non en échec' });

      const result = await sendSms(sms.phone, sms.message);
      await db('sms_reminders').where({ id: sms.id }).update({
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? db.fn.now() : null,
        updated_at: db.fn.now(),
      });

      res.json({ message: result.success ? 'SMS renvoyé avec succès' : 'Échec du renvoi', result });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
