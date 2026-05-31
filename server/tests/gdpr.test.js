/**
 * Tests — /api/gdpr
 * Couvre : export données patient, anonymisation RGPD, isolation multi-tenant
 */
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

async function createPatient(adminCookies) {
  const res = await request(app)
    .post('/api/patients')
    .set('Cookie', adminCookies)
    .send({
      first_name:    'Fatou',
      last_name:     'Coulibaly',
      date_of_birth: '1985-03-15',
      phone:         '+22507111111',
      email:         `patient-${Date.now()}@test.ci`,
    });
  return res.body.id || res.body.patient?.id;
}

async function createDoctor(adminCookies, email) {
  await request(app)
    .post('/api/users')
    .set('Cookie', adminCookies)
    .send({ email, password: 'Password123!', first_name: 'Doc', last_name: 'RGPD', role: 'doctor' });
  const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
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
  await db('consent_signatures').del();
  await db('consent_forms').del();
  await db('audit_logs').del();
  await db('record_share_requests').del();
  await db('push_subscriptions').del();
  await db('notifications').del();
  await db('sms_reminders').del();
  await db('invoices').del();
  await db('prescriptions').del();
  await db('consultations').del();
  await db('appointments').del();
  await db('patients').del();
  await db('users').del();
  await db('organizations').del();
});

// ── GET /api/gdpr/export/:patientId ──────────────────────────────────────────
describe('GET /api/gdpr/export/:patientId', () => {
  let adminCookies, patientId;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique GDPR Export', 'admin-gdpr-exp@test.ci');
    patientId    = await createPatient(adminCookies);
  });

  it('exporte toutes les données du patient (admin)', async () => {
    const res = await request(app)
      .get(`/api/gdpr/export/${patientId}`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('patient');
    expect(res.body).toHaveProperty('appointments');
    expect(res.body).toHaveProperty('consultations');
    expect(res.body).toHaveProperty('prescriptions');
    expect(res.body).toHaveProperty('invoices');
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('exported_at');
    expect(res.body.patient.id).toBe(patientId);
  });

  it('retourne aussi les données (doctor)', async () => {
    const doctorCookies = await createDoctor(adminCookies, 'doc-gdpr@test.ci');
    const res = await request(app)
      .get(`/api/gdpr/export/${patientId}`)
      .set('Cookie', doctorCookies);

    expect(res.status).toBe(200);
    expect(res.body.patient.id).toBe(patientId);
  });

  it('retourne 404 pour un patient inexistant', async () => {
    const res = await request(app)
      .get('/api/gdpr/export/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(404);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get(`/api/gdpr/export/${patientId}`);
    expect(res.status).toBe(401);
  });
});

// ── POST /api/gdpr/anonymize/:patientId ──────────────────────────────────────
describe('POST /api/gdpr/anonymize/:patientId', () => {
  let adminCookies, patientId;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique GDPR Anon', 'admin-gdpr-anon@test.ci');
    patientId    = await createPatient(adminCookies);
  });

  it('anonymise le patient avec le bon code de confirmation', async () => {
    const res = await request(app)
      .post(`/api/gdpr/anonymize/${patientId}`)
      .set('Cookie', adminCookies)
      .send({ confirm: 'CONFIRMER_ANONYMISATION' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/anonymis/i);
    expect(res.body.patient_id).toBe(patientId);

    // Vérifier en base que les PII sont effacés
    const p = await db('patients').where({ id: patientId }).first();
    expect(p.first_name).toBe('Anonymisé');
    expect(p.phone).toBeNull();
    expect(p.email).toBeNull();
  });

  it('refuse si le code de confirmation est absent', async () => {
    const res = await request(app)
      .post(`/api/gdpr/anonymize/${patientId}`)
      .set('Cookie', adminCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/CONFIRMER_ANONYMISATION/);
  });

  it('refuse si le code de confirmation est incorrect', async () => {
    const res = await request(app)
      .post(`/api/gdpr/anonymize/${patientId}`)
      .set('Cookie', adminCookies)
      .send({ confirm: 'mauvais_code' });

    expect(res.status).toBe(400);
  });

  it('retourne 404 pour un patient inexistant', async () => {
    const res = await request(app)
      .post('/api/gdpr/anonymize/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies)
      .send({ confirm: 'CONFIRMER_ANONYMISATION' });

    expect(res.status).toBe(404);
  });

  it('retourne 403 si le rôle n\'est pas admin', async () => {
    const doctorCookies = await createDoctor(adminCookies, 'doc-anon@test.ci');
    const res = await request(app)
      .post(`/api/gdpr/anonymize/${patientId}`)
      .set('Cookie', doctorCookies)
      .send({ confirm: 'CONFIRMER_ANONYMISATION' });

    expect(res.status).toBe(403);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app)
      .post(`/api/gdpr/anonymize/${patientId}`)
      .send({ confirm: 'CONFIRMER_ANONYMISATION' });

    expect(res.status).toBe(401);
  });
});

// ── Isolation multi-tenant ────────────────────────────────────────────────────
describe('Isolation multi-tenant — gdpr', () => {
  it('org B ne peut pas exporter les données d\'un patient de org A', async () => {
    const cookiesA = await registerAndLogin('GDPR Org A', 'admin-gdpr-a@test.ci');
    const cookiesB = await registerAndLogin('GDPR Org B', 'admin-gdpr-b@test.ci');

    const patientId = await createPatient(cookiesA);

    const res = await request(app)
      .get(`/api/gdpr/export/${patientId}`)
      .set('Cookie', cookiesB);

    expect(res.status).toBe(404);
  });

  it('org B ne peut pas anonymiser un patient de org A', async () => {
    const cookiesA = await registerAndLogin('GDPR Org A2', 'admin-gdpr-a2@test.ci');
    const cookiesB = await registerAndLogin('GDPR Org B2', 'admin-gdpr-b2@test.ci');

    const patientId = await createPatient(cookiesA);

    const res = await request(app)
      .post(`/api/gdpr/anonymize/${patientId}`)
      .set('Cookie', cookiesB)
      .send({ confirm: 'CONFIRMER_ANONYMISATION' });

    expect(res.status).toBe(404);
  });
});
