const cron = require('node-cron');
const { sendSms, formatReminderMessage } = require('./smsService');

/**
 * Démarre le cron job des rappels SMS
 * Tourne toutes les 15 minutes — vérifie les SMS pending à envoyer
 */
function startSmsCron(db) {
  // Toutes les 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();

      // Cherche tous les SMS pending dont scheduled_at <= maintenant
      const pending = await db('sms_reminders')
        .where({ status: 'pending' })
        .where('scheduled_at', '<=', now.toISOString())
        .select('id', 'phone', 'message', 'type', 'appointment_id', 'organization_id');

      // ── 1. SMS pending à envoyer ─────────────────────────────────────────
      if (pending.length > 0) {
        console.log(`[SMS CRON] ${pending.length} rappel(s) à envoyer`);
        for (const sms of pending) {
          try {
            const result = await sendSms(sms.phone, sms.message);
            await db('sms_reminders').where({ id: sms.id }).update({
              status:  result.success ? 'sent' : 'failed',
              sent_at: result.success ? db.fn.now() : null,
              updated_at: db.fn.now(),
            });
            console.log(`[SMS CRON] SMS ${sms.id} → ${result.success ? 'envoyé' : 'échoué'}`);
          } catch (err) {
            console.error(`[SMS CRON] Erreur SMS ${sms.id}:`, err.message);
            await db('sms_reminders').where({ id: sms.id }).update({
              status: 'failed',
              updated_at: db.fn.now(),
            }).catch(() => {});
          }
        }
      }

      // ── 2. Auto-retry des SMS failed (max 3 tentatives, espacées 30 min) ──
      const RETRY_DELAY_MS = 30 * 60 * 1000;
      const MAX_RETRIES    = 3;
      const retryThreshold = new Date(now.getTime() - RETRY_DELAY_MS);

      const toRetry = await db('sms_reminders')
        .where({ status: 'failed' })
        .where('retry_count', '<', MAX_RETRIES)
        .where('updated_at', '<=', retryThreshold.toISOString())
        .select('id', 'phone', 'message', 'retry_count', 'organization_id');

      if (toRetry.length > 0) {
        console.log(`[SMS CRON] ${toRetry.length} SMS en échec à ré-essayer`);
        for (const sms of toRetry) {
          try {
            const result = await sendSms(sms.phone, sms.message);
            await db('sms_reminders').where({ id: sms.id }).update({
              status:      result.success ? 'sent' : 'failed',
              sent_at:     result.success ? db.fn.now() : null,
              retry_count: sms.retry_count + 1,
              updated_at:  db.fn.now(),
            });
            console.log(`[SMS CRON] Retry ${sms.retry_count + 1}/${MAX_RETRIES} SMS ${sms.id} → ${result.success ? 'envoyé' : 'échoué'}`);
          } catch (err) {
            console.error(`[SMS CRON] Erreur retry SMS ${sms.id}:`, err.message);
            await db('sms_reminders').where({ id: sms.id }).update({
              retry_count: sms.retry_count + 1,
              updated_at:  db.fn.now(),
            }).catch(() => {});
          }
        }
      }

      if (pending.length === 0 && toRetry.length === 0) return;

    } catch (err) {
      console.error('[SMS CRON] Erreur globale:', err.message);
    }
  });

  console.log('[SMS CRON] Cron de rappels SMS démarré (toutes les 15 min)');
}

/**
 * Planifie les rappels pour un nouveau rendez-vous
 * @param {object} db — instance Knex
 * @param {object} appointment — { id, scheduled_at, organization_id }
 * @param {string} patientPhone
 * @param {string} patientName
 * @param {string} orgName
 */
async function scheduleRemindersForAppointment(db, appointment, patientPhone, patientName, orgName) {
  if (!patientPhone) {
    console.log(`[SMS] Patient sans téléphone — RDV ${appointment.id} ignoré`);
    return;
  }

  const now     = new Date();
  const apptDate = new Date(appointment.scheduled_at);
  const reminders = [];

  // ── SMS de confirmation immédiat ──────────────────────────────────────
  // Évite les doublons si un rappel de confirmation existe déjà pour ce RDV
  const existing = await db('sms_reminders')
    .where({ appointment_id: appointment.id, type: 'confirmation' })
    .first();

  if (!existing) {
    reminders.push({
      organization_id: appointment.organization_id,
      appointment_id:  appointment.id,
      phone:    patientPhone,
      type:     'confirmation',
      message:  formatReminderMessage('confirmation', appointment, patientName, orgName),
      scheduled_at: now.toISOString(),  // envoyé au prochain tick cron (≤ 15 min)
      status:   'pending',
    });
  }

  // ── Rappel 48h avant ──────────────────────────────────────────────────
  const t48h = new Date(apptDate.getTime() - 48 * 60 * 60 * 1000);
  if (t48h > now) {
    reminders.push({
      organization_id: appointment.organization_id,
      appointment_id:  appointment.id,
      phone:    patientPhone,
      type:     'reminder_48h',
      message:  formatReminderMessage('reminder_48h', appointment, patientName, orgName),
      scheduled_at: t48h.toISOString(),
      status:   'pending',
    });
  }

  // ── Rappel 2h avant ───────────────────────────────────────────────────
  const t2h = new Date(apptDate.getTime() - 2 * 60 * 60 * 1000);
  if (t2h > now) {
    reminders.push({
      organization_id: appointment.organization_id,
      appointment_id:  appointment.id,
      phone:    patientPhone,
      type:     'reminder_2h',
      message:  formatReminderMessage('reminder_2h', appointment, patientName, orgName),
      scheduled_at: t2h.toISOString(),
      status:   'pending',
    });
  }

  if (reminders.length > 0) {
    await db('sms_reminders').insert(reminders);
    console.log(`[SMS] ${reminders.length} rappel(s) planifiés pour RDV ${appointment.id}`);
  }
}

/**
 * Annule (supprime) tous les rappels SMS pending d'un rendez-vous
 * Appelé quand le RDV est annulé
 */
async function cancelRemindersForAppointment(db, appointmentId, orgId) {
  const deleted = await db('sms_reminders')
    .where({ appointment_id: appointmentId, organization_id: orgId, status: 'pending' })
    .delete();
  if (deleted > 0) {
    console.log(`[SMS] ${deleted} rappel(s) pending supprimés pour RDV annulé ${appointmentId}`);
  }
}

module.exports = { startSmsCron, scheduleRemindersForAppointment, cancelRemindersForAppointment };
