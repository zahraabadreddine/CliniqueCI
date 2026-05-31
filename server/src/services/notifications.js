/**
 * In-app + Web Push notification service.
 * All functions are best-effort (never throw to callers).
 */

const webpush = require('web-push');

// Lazy VAPID setup — only configure once all env vars are present
let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const { VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_EMAIL || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidReady = true;
  return true;
}

/**
 * Send a Web Push notification to all subscriptions for a given userId.
 * Stale/expired subscriptions (410 Gone) are cleaned up automatically.
 */
async function sendPushToUser(db, userId, { title, body, link }) {
  if (!ensureVapid()) return; // VAPID env vars not set → skip silently
  try {
    const subs = await db('push_subscriptions')
      .where({ user_id: userId })
      .select('id', 'endpoint', 'keys');

    if (!subs.length) return;

    const payload = JSON.stringify({ title, body, link });

    await Promise.all(
      subs.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys,
        };
        try {
          await webpush.sendNotification(subscription, payload);
        } catch (err) {
          // 410 Gone = subscription expired / revoked → remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db('push_subscriptions').where({ id: sub.id }).delete();
          } else {
            console.error('[WebPush] Envoi échoué :', err.message);
          }
        }
      })
    );
  } catch (err) {
    console.error('[WebPush] Erreur sendPushToUser :', err.message);
  }
}

/**
 * Create a notification for a specific user (in-app DB row + Web Push).
 * @param {object} db     - Knex instance
 * @param {object} params
 * @param {string} params.orgId
 * @param {string} params.userId    - recipient user id
 * @param {string} params.type      - notification type key
 * @param {string} params.title
 * @param {string} params.body
 * @param {string} [params.link]    - optional frontend route
 */
async function createNotification(db, { orgId, userId, type, title, body, link = null }) {
  try {
    await db('notifications').insert({
      organization_id: orgId,
      user_id: userId,
      type,
      title,
      body,
      link,
    });
  } catch (err) {
    console.error('[Notifications] Erreur création notification :', err.message);
  }

  // Fire-and-forget: send Web Push in parallel (don't block the caller)
  sendPushToUser(db, userId, { title, body, link });
}

/**
 * Notify all users matching a role within the organisation.
 */
async function notifyRole(db, { orgId, role, type, title, body, link = null }) {
  try {
    const users = await db('users')
      .where({ organization_id: orgId, role, is_active: true })
      .select('id');
    await Promise.all(
      users.map((u) => createNotification(db, { orgId, userId: u.id, type, title, body, link }))
    );
  } catch (err) {
    console.error('[Notifications] Erreur notifyRole :', err.message);
  }
}

// ── Appointment event helpers ─────────────────────────────────────────────────

/**
 * New appointment booked → notify the doctor + all secretaries.
 */
async function onAppointmentCreated(db, { orgId, appointment, patient, doctor }) {
  const scheduledAt = new Date(appointment.scheduled_at);
  const dateStr = scheduledAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const patientName = `${patient.first_name} ${patient.last_name}`;
  const doctorName = `Dr ${doctor.first_name} ${doctor.last_name}`;

  // Notify the doctor
  await createNotification(db, {
    orgId,
    userId: doctor.id,
    type: 'new_appointment',
    title: 'Nouveau rendez-vous',
    body: `${patientName} — ${dateStr} à ${timeStr}`,
    link: '/appointments',
  });

  // Notify secretaries
  await notifyRole(db, {
    orgId,
    role: 'secretary',
    type: 'new_appointment',
    title: 'Nouveau rendez-vous enregistré',
    body: `${patientName} avec ${doctorName} le ${dateStr} à ${timeStr}`,
    link: '/secretary-home',
  });
}

/**
 * Appointment cancelled → notify doctor + all secretaries.
 */
async function onAppointmentCancelled(db, { orgId, appointment, patient, doctor }) {
  const scheduledAt = new Date(appointment.scheduled_at);
  const dateStr = scheduledAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const patientName = `${patient.first_name} ${patient.last_name}`;

  await createNotification(db, {
    orgId,
    userId: doctor.id,
    type: 'appointment_cancelled',
    title: 'Rendez-vous annulé',
    body: `Le RDV de ${patientName} du ${dateStr} à ${timeStr} a été annulé`,
    link: '/appointments',
  });

  await notifyRole(db, {
    orgId,
    role: 'secretary',
    type: 'appointment_cancelled',
    title: 'Rendez-vous annulé',
    body: `RDV de ${patientName} du ${dateStr} à ${timeStr} annulé`,
    link: '/secretary-home',
  });
}

/**
 * Patient arrived (waiting) → notify the doctor.
 */
async function onPatientArrived(db, { orgId, appointment, patient, doctor }) {
  const patientName = `${patient.first_name} ${patient.last_name}`;
  await createNotification(db, {
    orgId,
    userId: doctor.id,
    type: 'patient_arrived',
    title: 'Patient en salle d\'attente',
    body: `${patientName} est arrivé(e) et attend en salle`,
    link: '/doctor-home',
  });
}

/**
 * Patient called in (in-room) → notify secretaries.
 */
async function onPatientInRoom(db, { orgId, appointment, patient, doctor }) {
  const patientName = `${patient.first_name} ${patient.last_name}`;
  const doctorName = `Dr ${doctor.first_name} ${doctor.last_name}`;
  await notifyRole(db, {
    orgId,
    role: 'secretary',
    type: 'patient_in_room',
    title: 'Patient en consultation',
    body: `${patientName} est maintenant en consultation avec ${doctorName}`,
    link: '/secretary-home',
  });
}

/**
 * Appointment completed → notify secretaries (for billing follow-up).
 */
async function onAppointmentCompleted(db, { orgId, appointment, patient, doctor }) {
  const patientName = `${patient.first_name} ${patient.last_name}`;
  const doctorName = `Dr ${doctor.first_name} ${doctor.last_name}`;
  await notifyRole(db, {
    orgId,
    role: 'secretary',
    type: 'appointment_completed',
    title: 'Consultation terminée',
    body: `${patientName} avec ${doctorName} — facturation en attente`,
    link: '/invoices',
  });
}

module.exports = {
  createNotification,
  notifyRole,
  onAppointmentCreated,
  onAppointmentCancelled,
  onPatientArrived,
  onPatientInRoom,
  onAppointmentCompleted,
};
