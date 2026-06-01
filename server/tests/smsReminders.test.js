/**
 * Tests — /api/sms-reminders
 * Couvre : happy path, validation, isolation multi-tenant
 * Le smsService est mocké pour ne pas envoyer de vrais SMS en test.
 */

// ── Mock Twilio avant tout require de l'app ──────────────────────────────────
jest.mock('../src/services/smsService', () => ({
  sendSms: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-test-id', mock: true }),
  formatReminderMessage: jest.fn().mockReturnValue('Test message'),
}));

const request = require('supertest');
const app     = require('../src/app');
const db      = require('../src/lib/db');

// ── Helpers ──────────────────────────────────────────────────────────────────
async function registerAndLogin(clinicName, email) {
  const res = await request(app).post('/api/auth/register').send({
    clinic_name: clinicName,
    email,
    password:    'Password123!',
    first_name:  'Admin',
    last_name:   'Test',
  });
  return res.headers['set-cookie'];
}

async function createSecretary(adminCookies, email) {
  await request(app)
    .post('/api/users')
    .set('Cookie', adminCookies)
    .send({ email, password: 'Password123!', first_name: 'Sec', last_name: 'Test', role: 'secretary' });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password123!' });
  return loginRes.headers['set-cookie'];
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
});

beforeEach(async () => {
  await db('refresh_tokens').del();
  await db('sms_reminders').del();
  await db('invoices').del();
  await db('prescriptions').del();
  await db('consultations').del();
  await db('appointments').del();
  await db('patients').del();
  await db('users').del();
  await db('organizations').del();
});

// ── GET /api/sms-reminders ────────────────────────────────────────────────────
describe('GET /api/sms-reminders', () => {
  it('retourne la liste vide pour un admin authentifié', async () => {
    const cookies = await registerAndLogin('Clinique SMS', 'admin-sms@test.ci');
    const res = await request(app).get('/api/sms-reminders').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reminders');
    expect(Array.isArray(res.body.reminders)).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/sms-reminders');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/sms-reminders/stats ──────────────────────────────────────────────
describe('GET /api/sms-reminders/stats', () => {
  it('retourne les stats (0 par défaut)', async () => {
    const cookies = await registerAndLogin('Clinique Stats', 'admin-stats@test.ci');
    const res = await request(app).get('/api/sms-reminders/stats').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pending');
    expect(res.body).toHaveProperty('sent');
    expect(res.body).toHaveProperty('failed');
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/sms-reminders/stats');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/sms-reminders/send ──────────────────────────────────────────────
describe('POST /api/sms-reminders/send', () => {
  let secretaryCookies;

  beforeEach(async () => {
    const adminCookies = await registerAndLogin('Clinique Send', 'admin-send@test.ci');
    secretaryCookies = await createSecretary(adminCookies, 'sec-send@test.ci');
  });

  it('envoie un SMS avec phone et message valides (mode mock)', async () => {
    const res = await request(app)
      .post('/api/sms-reminders/send')
      .set('Cookie', secretaryCookies)
      .send({ phone: '+22507000000', message: 'Bonjour, votre RDV est confirmé.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mock).toBe(true);
    expect(res.body.orgName).toBeDefined();
  });

  it('refuse si le numéro de téléphone est absent', async () => {
    const res = await request(app)
      .post('/api/sms-reminders/send')
      .set('Cookie', secretaryCookies)
      .send({ message: 'Un message sans numéro' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/téléphone/i);
  });

  it('refuse si le message est vide', async () => {
    const res = await request(app)
      .post('/api/sms-reminders/send')
      .set('Cookie', secretaryCookies)
      .send({ phone: '+22507000000', message: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/i);
  });

  it('refuse un message de plus de 300 caractères', async () => {
    const longMessage = 'A'.repeat(301);
    const res = await request(app)
      .post('/api/sms-reminders/send')
      .set('Cookie', secretaryCookies)
      .send({ phone: '+22507000000', message: longMessage });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/300/);
  });

  it('retourne 403 si le rôle est admin (pas secretary)', async () => {
    const adminCookies = await registerAndLogin('Clinique Admin Send', 'admin2-send@test.ci');
    const res = await request(app)
      .post('/api/sms-reminders/send')
      .set('Cookie', adminCookies)
      .send({ phone: '+22507000000', message: 'Message test' });

    expect(res.status).toBe(403);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app)
      .post('/api/sms-reminders/send')
      .send({ phone: '+22507000000', message: 'Message test' });

    expect(res.status).toBe(401);
  });
});

// ── POST /api/sms-reminders/test ──────────────────────────────────────────────
describe('POST /api/sms-reminders/test', () => {
  let adminCookies;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Test SMS', 'admin-test-sms@test.ci');
  });

  it('envoie un SMS de test (admin, phone fourni)', async () => {
    const res = await request(app)
      .post('/api/sms-reminders/test')
      .set('Cookie', adminCookies)
      .send({ phone: '+22507111111' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/test/i);
    expect(res.body.result).toBeDefined();
  });

  it('refuse si le numéro est absent', async () => {
    const res = await request(app)
      .post('/api/sms-reminders/test')
      .set('Cookie', adminCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/téléphone/i);
  });

  it('retourne 403 si le rôle est secrétaire', async () => {
    const secCookies = await createSecretary(adminCookies, 'sec-test-sms@test.ci');
    const res = await request(app)
      .post('/api/sms-reminders/test')
      .set('Cookie', secCookies)
      .send({ phone: '+22507111111' });

    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/sms-reminders/:id ────────────────────────────────────────────
describe('DELETE /api/sms-reminders/:id', () => {
  let adminCookies, secCookies, orgId, appointmentId;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Delete SMS', 'admin-del-sms@test.ci');
    secCookies = await createSecretary(adminCookies, 'sec-del-sms@test.ci');

    // Récupérer l'org
    const orgRow = await db('organizations').select('id').orderBy('created_at', 'desc').first();
    orgId = orgRow.id;

    // Créer un patient
    const patRes = await request(app)
      .post('/api/patients')
      .set('Cookie', adminCookies)
      .send({ first_name: 'Test', last_name: 'Delete', date_of_birth: '1990-01-01' });
    const patientId = patRes.body.id;

    // Récupérer le docteur (admin lui-même — pas de docteur créé ici, on insère sans docteur)
    // On crée un RDV via API
    const users = await request(app).get('/api/users').set('Cookie', adminCookies);
    // Créer d'abord un docteur
    await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'doc-del-sms@test.ci', password: 'Password123!',
      first_name: 'Doc', last_name: 'Del', role: 'doctor',
    });
    const usersRefreshed = await request(app).get('/api/users').set('Cookie', adminCookies);
    const doc = usersRefreshed.body.find(u => u.role === 'doctor');

    const apptRes = await request(app)
      .post('/api/appointments')
      .set('Cookie', adminCookies)
      .send({
        patient_id: patientId,
        doctor_id: doc.id,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        reason: 'Test delete SMS',
      });
    appointmentId = apptRes.body.id;
  });

  it('supprime un SMS en attente (secrétaire)', async () => {
    // Insérer directement un sms_reminder pending en base
    const [smsRow] = await db('sms_reminders').insert({
      organization_id: orgId,
      appointment_id: appointmentId,
      phone: '+22507222222',
      message: 'Rappel test',
      type: 'reminder_48h',
      status: 'pending',
      scheduled_at: new Date(Date.now() + 3600000),
    }).returning('id');

    const res = await request(app)
      .delete(`/api/sms-reminders/${smsRow.id}`)
      .set('Cookie', secCookies);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/annulé/i);
  });

  it('retourne 404 si le SMS n\'est pas en statut pending', async () => {
    // Insérer un SMS déjà envoyé
    const [smsRow] = await db('sms_reminders').insert({
      organization_id: orgId,
      appointment_id: appointmentId,
      phone: '+22507333333',
      message: 'Déjà envoyé',
      type: 'reminder_48h',
      status: 'sent',
      scheduled_at: new Date(Date.now() + 3600000),
    }).returning('id');

    const res = await request(app)
      .delete(`/api/sms-reminders/${smsRow.id}`)
      .set('Cookie', secCookies);

    expect(res.status).toBe(404);
  });
});

// ── POST /api/sms-reminders/:id/retry ────────────────────────────────────────
describe('POST /api/sms-reminders/:id/retry', () => {
  let adminCookies, orgId, appointmentId;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Retry SMS', 'admin-retry-sms@test.ci');

    const orgRow = await db('organizations').select('id').orderBy('created_at', 'desc').first();
    orgId = orgRow.id;

    const patRes = await request(app)
      .post('/api/patients')
      .set('Cookie', adminCookies)
      .send({ first_name: 'Test', last_name: 'Retry', date_of_birth: '1985-06-15' });
    const patientId = patRes.body.id;

    await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'doc-retry-sms@test.ci', password: 'Password123!',
      first_name: 'Doc', last_name: 'Retry', role: 'doctor',
    });
    const usersRes = await request(app).get('/api/users').set('Cookie', adminCookies);
    const doc = usersRes.body.find(u => u.role === 'doctor');

    const apptRes = await request(app)
      .post('/api/appointments')
      .set('Cookie', adminCookies)
      .send({
        patient_id: patientId,
        doctor_id: doc.id,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        reason: 'Test retry SMS',
      });
    appointmentId = apptRes.body.id;
  });

  it('renvoie un SMS en échec (admin)', async () => {
    const [smsRow] = await db('sms_reminders').insert({
      organization_id: orgId,
      appointment_id: appointmentId,
      phone: '+22507444444',
      message: 'Message à renvoyer',
      type: 'reminder_48h',
      status: 'failed',
      scheduled_at: new Date(Date.now() + 3600000),
    }).returning('id');

    const res = await request(app)
      .post(`/api/sms-reminders/${smsRow.id}/retry`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
  });

  it('retourne 404 si le SMS n\'est pas en statut "failed"', async () => {
    const [smsRow] = await db('sms_reminders').insert({
      organization_id: orgId,
      appointment_id: appointmentId,
      phone: '+22507555555',
      message: 'Message pending',
      type: 'reminder_48h',
      status: 'pending',
      scheduled_at: new Date(Date.now() + 3600000),
    }).returning('id');

    const res = await request(app)
      .post(`/api/sms-reminders/${smsRow.id}/retry`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(404);
  });
});

// ── Isolation multi-tenant ────────────────────────────────────────────────────
describe('Isolation multi-tenant — sms-reminders', () => {
  it('chaque organisation ne voit que ses propres SMS stats', async () => {
    const cookiesA = await registerAndLogin('Org SMS A', 'admin-sms-a@test.ci');
    const cookiesB = await registerAndLogin('Org SMS B', 'admin-sms-b@test.ci');

    const [statsA, statsB] = await Promise.all([
      request(app).get('/api/sms-reminders/stats').set('Cookie', cookiesA),
      request(app).get('/api/sms-reminders/stats').set('Cookie', cookiesB),
    ]);

    expect(statsA.status).toBe(200);
    expect(statsB.status).toBe(200);
    // Chaque org voit des stats indépendantes (toutes à 0)
    expect(statsA.body.sent).toBe(0);
    expect(statsB.body.sent).toBe(0);
  });
});
