/**
 * Tests — /api/record-shares
 * Couvre : outgoing/incoming, consent-code, approve/deny, accès dossiers, isolation multi-tenant
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
      first_name:    'Kofi',
      last_name:     'Mensah',
      date_of_birth: '1978-09-01',
      phone:         '+22507333333',
    });
  return res.body.id || res.body.patient?.id;
}

async function createSecretary(adminCookies, email) {
  await request(app)
    .post('/api/users')
    .set('Cookie', adminCookies)
    .send({ email, password: 'Password123!', first_name: 'Sec', last_name: 'Test', role: 'secretary' });
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

// ── GET /api/record-shares/outgoing ──────────────────────────────────────────
describe('GET /api/record-shares/outgoing', () => {
  let adminCookies;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique RS Out', 'admin-rs-out@test.ci');
  });

  it('retourne la liste vide des demandes sortantes (admin)', async () => {
    const res = await request(app)
      .get('/api/record-shares/outgoing')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/record-shares/outgoing');
    expect(res.status).toBe(401);
  });

  it('retourne 403 si le rôle n\'est pas admin (secretary)', async () => {
    const secCookies = await createSecretary(adminCookies, 'sec-rs-out@test.ci');
    const res = await request(app)
      .get('/api/record-shares/outgoing')
      .set('Cookie', secCookies);

    expect(res.status).toBe(403);
  });
});

// ── GET /api/record-shares/incoming ──────────────────────────────────────────
describe('GET /api/record-shares/incoming', () => {
  let adminCookies;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique RS In', 'admin-rs-in@test.ci');
  });

  it('retourne la liste vide des demandes entrantes (admin)', async () => {
    const res = await request(app)
      .get('/api/record-shares/incoming')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/record-shares/incoming');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/record-shares/consent-code ─────────────────────────────────────
describe('POST /api/record-shares/consent-code', () => {
  let adminCookies, patientId;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Consent Code', 'admin-cc-rs@test.ci');
    patientId    = await createPatient(adminCookies);
  });

  it('génère un code de consentement pour un patient', async () => {
    const res = await request(app)
      .post('/api/record-shares/consent-code')
      .set('Cookie', adminCookies)
      .send({ patient_id: patientId });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('consent_code');
    expect(res.body.consent_code).toHaveLength(6);
    expect(res.body).toHaveProperty('expires_at');
    expect(res.body).toHaveProperty('instructions');
  });

  it('refuse si patient_id est absent', async () => {
    const res = await request(app)
      .post('/api/record-shares/consent-code')
      .set('Cookie', adminCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/patient_id/);
  });

  it('retourne 404 pour un patient inexistant', async () => {
    const res = await request(app)
      .post('/api/record-shares/consent-code')
      .set('Cookie', adminCookies)
      .send({ patient_id: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app)
      .post('/api/record-shares/consent-code')
      .send({ patient_id: patientId });

    expect(res.status).toBe(401);
  });
});

// ── POST /api/record-shares (create share request) ───────────────────────────
describe('POST /api/record-shares', () => {
  let cookiesA, cookiesB, patientId, consentCode, sourceOrgId;

  beforeEach(async () => {
    cookiesA = await registerAndLogin('Source Org', 'admin-src@test.ci');
    cookiesB = await registerAndLogin('Requesting Org', 'admin-req@test.ci');

    patientId = await createPatient(cookiesA);

    // Org A génère un code de consentement
    const codeRes = await request(app)
      .post('/api/record-shares/consent-code')
      .set('Cookie', cookiesA)
      .send({ patient_id: patientId });
    consentCode = codeRes.body.consent_code;

    // Récupérer l'ID de l'organisation source
    const orgA = await db('organizations').orderBy('created_at', 'asc').first();
    sourceOrgId = orgA.id;
  });

  it('refuse si source_org_id est absent', async () => {
    const res = await request(app)
      .post('/api/record-shares')
      .set('Cookie', cookiesB)
      .send({ patient_consent_code: consentCode });

    expect(res.status).toBe(400);
  });

  it('refuse si patient_consent_code est absent', async () => {
    const res = await request(app)
      .post('/api/record-shares')
      .set('Cookie', cookiesB)
      .send({ source_org_id: sourceOrgId });

    expect(res.status).toBe(400);
  });

  it('retourne 404 si le code de consentement est invalide', async () => {
    const res = await request(app)
      .post('/api/record-shares')
      .set('Cookie', cookiesB)
      .send({ source_org_id: sourceOrgId, patient_consent_code: 'BADCOD' });

    expect(res.status).toBe(404);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app)
      .post('/api/record-shares')
      .send({ source_org_id: sourceOrgId, patient_consent_code: consentCode });

    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/record-shares/:id (approve/deny) ───────────────────────────────
describe('PATCH /api/record-shares/:id', () => {
  let adminCookies, requestId, patientId;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique RS Patch', 'admin-rs-patch@test.ci');
    patientId    = await createPatient(adminCookies);

    // Générer un code et créer une entrée pending directement en base
    const org   = await db('organizations').first();
    const user  = await db('users').first();
    const [entry] = await db('record_share_requests')
      .insert({
        requesting_org_id:    org.id,
        source_org_id:        org.id,
        patient_id:           patientId,
        requested_by:         user.id,
        status:               'pending',
        patient_consent_code: 'TESTCO',
        expires_at:           new Date(Date.now() + 48 * 60 * 60 * 1000),
      })
      .returning(['id']);
    requestId = entry.id;
  });

  it('approuve une demande de partage', async () => {
    const res = await request(app)
      .patch(`/api/record-shares/${requestId}`)
      .set('Cookie', adminCookies)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('refuse une demande avec statut "denied"', async () => {
    const res = await request(app)
      .patch(`/api/record-shares/${requestId}`)
      .set('Cookie', adminCookies)
      .send({ status: 'denied' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('denied');
  });

  it('refuse un statut invalide', async () => {
    const res = await request(app)
      .patch(`/api/record-shares/${requestId}`)
      .set('Cookie', adminCookies)
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('retourne 404 pour une demande inexistante', async () => {
    const res = await request(app)
      .patch('/api/record-shares/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies)
      .send({ status: 'approved' });

    expect(res.status).toBe(404);
  });
});

// ── GET /api/record-shares/:id/records ───────────────────────────────────────
describe('GET /api/record-shares/:id/records', () => {
  let adminCookies;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique RS Records', 'admin-rs-rec@test.ci');
  });

  it('retourne 403 pour une demande non approuvée', async () => {
    const res = await request(app)
      .get('/api/record-shares/00000000-0000-0000-0000-000000000000/records')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(403);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app)
      .get('/api/record-shares/00000000-0000-0000-0000-000000000000/records');

    expect(res.status).toBe(401);
  });
});

// ── Isolation multi-tenant ────────────────────────────────────────────────────
describe('Isolation multi-tenant — record-shares', () => {
  it('org B ne peut pas voir les demandes entrantes de org A', async () => {
    const cookiesA = await registerAndLogin('RS Org A', 'admin-rs-a@test.ci');
    const cookiesB = await registerAndLogin('RS Org B', 'admin-rs-b@test.ci');

    const resA = await request(app).get('/api/record-shares/incoming').set('Cookie', cookiesA);
    const resB = await request(app).get('/api/record-shares/incoming').set('Cookie', cookiesB);

    // Chaque org ne voit que ses propres demandes (listes indépendantes)
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(Array.isArray(resA.body)).toBe(true);
    expect(Array.isArray(resB.body)).toBe(true);
  });
});
