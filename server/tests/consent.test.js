/**
 * Tests — /api/consent
 * Couvre : CRUD formulaires, signatures, isolation multi-tenant
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

async function createSecretary(adminCookies, email) {
  await request(app)
    .post('/api/users')
    .set('Cookie', adminCookies)
    .send({ email, password: 'Password123!', first_name: 'Sec', last_name: 'Test', role: 'secretary' });
  const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
  return loginRes.headers['set-cookie'];
}

async function createPatient(adminCookies) {
  const res = await request(app)
    .post('/api/patients')
    .set('Cookie', adminCookies)
    .send({
      first_name:    'Aïcha',
      last_name:     'Traoré',
      date_of_birth: '1990-06-20',
      phone:         '+22507222222',
    });
  return res.body.id || res.body.patient?.id;
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
});

beforeEach(async () => {
  await db.raw('TRUNCATE TABLE organizations RESTART IDENTITY CASCADE');
});

// ── GET /api/consent/forms ────────────────────────────────────────────────────
describe('GET /api/consent/forms', () => {
  let secCookies;

  beforeEach(async () => {
    const adminCookies = await registerAndLogin('Clinique Consent Forms', 'admin-cf@test.ci');
    secCookies = await createSecretary(adminCookies, 'sec-cf@test.ci');
  });

  it('retourne la liste vide des formulaires (secretary)', async () => {
    const res = await request(app)
      .get('/api/consent/forms')
      .set('Cookie', secCookies);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/consent/forms');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/consent/forms ───────────────────────────────────────────────────
describe('POST /api/consent/forms', () => {
  let adminCookies, secCookies;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Consent Create', 'admin-cc@test.ci');
    secCookies   = await createSecretary(adminCookies, 'sec-cc@test.ci');
  });

  it('crée un formulaire de consentement (secretary)', async () => {
    const res = await request(app)
      .post('/api/consent/forms')
      .set('Cookie', secCookies)
      .send({ title: 'Consentement opération', content: 'Je consens...', category: 'chirurgie' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Consentement opération');
    expect(res.body.id).toBeDefined();
  });

  it('refuse si le titre est absent', async () => {
    const res = await request(app)
      .post('/api/consent/forms')
      .set('Cookie', secCookies)
      .send({ content: 'Contenu sans titre' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/titre/i);
  });

  it('refuse si le contenu est absent', async () => {
    const res = await request(app)
      .post('/api/consent/forms')
      .set('Cookie', secCookies)
      .send({ title: 'Titre sans contenu' });

    expect(res.status).toBe(400);
  });

  it('retourne 403 si le rôle est admin', async () => {
    const res = await request(app)
      .post('/api/consent/forms')
      .set('Cookie', adminCookies)
      .send({ title: 'Test admin', content: 'Contenu' });

    expect(res.status).toBe(403);
  });
});

// ── GET /api/consent/forms/:id ────────────────────────────────────────────────
describe('GET /api/consent/forms/:id', () => {
  let secCookies, formId;

  beforeEach(async () => {
    const adminCookies = await registerAndLogin('Clinique Consent Get', 'admin-cg@test.ci');
    secCookies = await createSecretary(adminCookies, 'sec-cg@test.ci');

    const res = await request(app)
      .post('/api/consent/forms')
      .set('Cookie', secCookies)
      .send({ title: 'Formulaire de test', content: 'Contenu de test' });
    formId = res.body.id;
  });

  it('retourne un formulaire par ID', async () => {
    const res = await request(app)
      .get(`/api/consent/forms/${formId}`)
      .set('Cookie', secCookies);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(formId);
    expect(res.body.title).toBe('Formulaire de test');
    expect(res.body).toHaveProperty('content');
  });

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await request(app)
      .get('/api/consent/forms/00000000-0000-0000-0000-000000000000')
      .set('Cookie', secCookies);

    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/consent/forms/:id ─────────────────────────────────────────────
describe('PATCH /api/consent/forms/:id', () => {
  let secCookies, formId;

  beforeEach(async () => {
    const adminCookies = await registerAndLogin('Clinique Consent Patch', 'admin-cp@test.ci');
    secCookies = await createSecretary(adminCookies, 'sec-cp@test.ci');

    const res = await request(app)
      .post('/api/consent/forms')
      .set('Cookie', secCookies)
      .send({ title: 'Formulaire original', content: 'Contenu original' });
    formId = res.body.id;
  });

  it('met à jour un formulaire', async () => {
    const res = await request(app)
      .patch(`/api/consent/forms/${formId}`)
      .set('Cookie', secCookies)
      .send({ title: 'Formulaire mis à jour', is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Formulaire mis à jour');
    expect(res.body.is_active).toBe(false);
  });

  it('retourne 404 pour un formulaire inexistant', async () => {
    const res = await request(app)
      .patch('/api/consent/forms/00000000-0000-0000-0000-000000000000')
      .set('Cookie', secCookies)
      .send({ title: 'Nouveau titre' });

    expect(res.status).toBe(404);
  });
});

// ── POST /api/consent/signatures ──────────────────────────────────────────────
describe('POST /api/consent/signatures', () => {
  let adminCookies, secCookies, patientId, formId;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Consent Sig', 'admin-cs@test.ci');
    secCookies   = await createSecretary(adminCookies, 'sec-cs@test.ci');
    patientId    = await createPatient(adminCookies);

    const formRes = await request(app)
      .post('/api/consent/forms')
      .set('Cookie', secCookies)
      .send({ title: 'Consentement anesthésie', content: 'Je consens à l\'anesthésie' });
    formId = formRes.body.id;
  });

  it('crée une demande de signature', async () => {
    const res = await request(app)
      .post('/api/consent/signatures')
      .set('Cookie', secCookies)
      .send({ patient_id: patientId, consent_form_id: formId });

    expect(res.status).toBe(201);
    expect(res.body.patient_id).toBe(patientId);
    expect(res.body.consent_form_id).toBe(formId);
    expect(res.body.signed).toBe(false);
  });

  it('refuse si patient_id est absent', async () => {
    const res = await request(app)
      .post('/api/consent/signatures')
      .set('Cookie', secCookies)
      .send({ consent_form_id: formId });

    expect(res.status).toBe(400);
  });

  it('refuse si consent_form_id est absent', async () => {
    const res = await request(app)
      .post('/api/consent/signatures')
      .set('Cookie', secCookies)
      .send({ patient_id: patientId });

    expect(res.status).toBe(400);
  });

  it('retourne 404 pour un patient inexistant', async () => {
    const res = await request(app)
      .post('/api/consent/signatures')
      .set('Cookie', secCookies)
      .send({
        patient_id: '00000000-0000-0000-0000-000000000000',
        consent_form_id: formId,
      });

    expect(res.status).toBe(404);
  });
});

// ── GET /api/consent/signatures ───────────────────────────────────────────────
describe('GET /api/consent/signatures', () => {
  let secCookies;

  beforeEach(async () => {
    const adminCookies = await registerAndLogin('Clinique Consent List Sig', 'admin-cls@test.ci');
    secCookies = await createSecretary(adminCookies, 'sec-cls@test.ci');
  });

  it('retourne la liste des signatures', async () => {
    const res = await request(app)
      .get('/api/consent/signatures')
      .set('Cookie', secCookies);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/consent/signatures');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/consent/signatures/:id/sign ────────────────────────────────────
describe('PATCH /api/consent/signatures/:id/sign', () => {
  let secCookies, sigId;

  beforeEach(async () => {
    const adminCookies = await registerAndLogin('Clinique Consent Sign', 'admin-sign@test.ci');
    secCookies   = await createSecretary(adminCookies, 'sec-sign@test.ci');
    const patientId = await createPatient(adminCookies);

    const formRes = await request(app)
      .post('/api/consent/forms')
      .set('Cookie', secCookies)
      .send({ title: 'Consentement chirurgie', content: 'Contenu chirurgie' });
    const formId = formRes.body.id;

    const sigRes = await request(app)
      .post('/api/consent/signatures')
      .set('Cookie', secCookies)
      .send({ patient_id: patientId, consent_form_id: formId });
    sigId = sigRes.body.id;
  });

  it('marque une signature comme signée', async () => {
    const res = await request(app)
      .patch(`/api/consent/signatures/${sigId}/sign`)
      .set('Cookie', secCookies)
      .send({ signature_data: 'data:image/png;base64,abc123' });

    expect(res.status).toBe(200);
    expect(res.body.signed).toBe(true);
    expect(res.body.signed_at).toBeDefined();
  });

  it('marque comme signé sans signature_data', async () => {
    const res = await request(app)
      .patch(`/api/consent/signatures/${sigId}/sign`)
      .set('Cookie', secCookies)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.signed).toBe(true);
  });

  it('retourne 404 pour une signature inexistante', async () => {
    const res = await request(app)
      .patch('/api/consent/signatures/00000000-0000-0000-0000-000000000000/sign')
      .set('Cookie', secCookies)
      .send({});

    expect(res.status).toBe(404);
  });
});

// ── Isolation multi-tenant ────────────────────────────────────────────────────
describe('Isolation multi-tenant — consent', () => {
  it('org B ne peut pas voir les formulaires de org A', async () => {
    const adminA = await registerAndLogin('Consent Org A', 'admin-cons-a@test.ci');
    const adminB = await registerAndLogin('Consent Org B', 'admin-cons-b@test.ci');
    const secA   = await createSecretary(adminA, 'sec-cons-a@test.ci');
    const secB   = await createSecretary(adminB, 'sec-cons-b@test.ci');

    // Org A crée un formulaire
    const formRes = await request(app)
      .post('/api/consent/forms')
      .set('Cookie', secA)
      .send({ title: 'Formulaire confidentiel Org A', content: 'Confidentiel' });
    const formId = formRes.body.id;

    // Org B tente d'accéder au formulaire de Org A
    const res = await request(app)
      .get(`/api/consent/forms/${formId}`)
      .set('Cookie', secB);

    expect(res.status).toBe(404);
  });
});
