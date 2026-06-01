/**
 * SMS Service — Twilio avec fallback mock
 *
 * Variables d'env requises pour l'envoi réel :
 *   TWILIO_ACCOUNT_SID=ACxxxx...   (depuis console.twilio.com)
 *   TWILIO_AUTH_TOKEN=xxxxx...     (depuis console.twilio.com)
 *   TWILIO_FROM=+12015551234       (votre numéro Twilio)
 *
 * Sans ces variables → mode mock (log console uniquement).
 */

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_FROM;
const USE_REAL_SMS = !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);

if (USE_REAL_SMS) {
  console.log(`[SMS] Mode Twilio — from: ${TWILIO_FROM}`);
} else {
  console.log('[SMS] Mode MOCK — renseigner TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM dans .env');
}

/**
 * Envoie un SMS via Twilio ou log en console (mode mock)
 * @param {string} phone   — numéro au format +225XXXXXXXXXX
 * @param {string} message — texte du message (max 320 chars)
 * @returns {{ success: boolean, messageId: string, mock?: boolean }}
 */
/**
 * Normalise un numéro de téléphone au format E.164 (retire les espaces)
 * Ex: "+225 07 08 09 10 11" → "+22507080910111"
 */
function normalizePhone(phone) {
  return phone ? phone.replace(/\s+/g, '') : phone;
}

async function sendSms(phone, message) {
  const normalizedPhone = normalizePhone(phone);

  if (USE_REAL_SMS) {
    // ── Twilio REST API ───────────────────────────────────────────────
    const url  = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
    const body = new URLSearchParams({ To: normalizedPhone, From: TWILIO_FROM, Body: message });

    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[SMS] Twilio erreur :', data.message ?? data);
      return { success: false, messageId: null };
    }

    const ok = data.status !== 'failed';
    console.log(`[SMS] ${ok ? '✅' : '❌'} ${normalizedPhone} — sid: ${data.sid} — status: ${data.status}`);
    return { success: ok, messageId: data.sid };
  }

  // ── Mock ──────────────────────────────────────────────────────────────
  console.log(`[SMS MOCK] To: ${normalizedPhone} | Message: ${message}`);
  return {
    success: true,
    messageId: `mock-${Date.now()}`,
    mock: true,
  };
}

/**
 * Formate le message de rappel
 */
function formatReminderMessage(type, appointment, patientName, orgName) {
  const date = new Date(appointment.scheduled_at);
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  switch (type) {
    case 'reminder_48h':
      return `Bonjour ${patientName}, rappel de votre RDV à ${orgName} le ${dateStr} à ${timeStr}. Répondez STOP pour annuler.`;
    case 'reminder_2h':
      return `Bonjour ${patientName}, votre RDV à ${orgName} est dans 2h (${timeStr}). Bonne journée !`;
    case 'confirmation':
      return `Bonjour ${patientName}, votre RDV à ${orgName} le ${dateStr} à ${timeStr} est confirmé.`;
    default:
      return `Rappel RDV - ${orgName} - ${dateStr} ${timeStr}`;
  }
}

module.exports = { sendSms, formatReminderMessage };
