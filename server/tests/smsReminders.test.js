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
