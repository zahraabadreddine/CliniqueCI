/**
 * Tests — /api/queue
 * Couvre : gestion de la file d'attente, isolation multi-tenant
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

async function createUser(adminCookies, email, role) {
  await request(app)
    .post('/api/users')
    .set('Cookie', adminCookies)
    .send({ email, password: 'Password123!', first_name: 'User', last_name: 'Test', role });
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
  await db.raw('TRUNCATE TABLE organizations RESTART IDENTITY CASCADE');
});

// ── GET /api/queue ────────────────────────────────────────────────────────────
describe('GET /api/queue', () => {
  it('retourne la file d\'attente vide (admin)', async () => {
    const cookies = await registerAndLogin('Clinique Queue', 'admin-queue@test.ci');
    const res = await request(app).get('/api/queue').set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tokens');
    expect(Array.isArray(res.body.tokens)).toBe(true);
    expect(res.body.waiting_count).toBe(0);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/queue');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/queue ───────────────────────────────────────────────────────────
describe('POST /api/queue', () => {
  let adminCookies, secCookies;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Queue Add', 'admin-q-add@test.ci');
    secCookies   = await createUser(adminCookies, 'sec-q-add@test.ci', 'secretary');
  });

  it('ajoute un patient en file (secretary)', async () => {
    const res = await request(app)
      .post('/api/queue')
      .set('Cookie', secCookies)
      .send({ patient_name: 'Kofi Boateng', reason: 'Consultation générale' });

    expect(res.status).toBe(201);
    expect(res.body.number).toBe(1);
    expect(res.body.patient_name).toBe('Kofi Boateng');
    expect(res.body.status).toBe('waiting');
  });

  it('attribue des numéros incrémentaux', async () => {
    await request(app).post('/api/queue').set('Cookie', secCookies).send({ patient_name: 'Patient 1' });
    const res = await request(app).post('/api/queue').set('Cookie', secCookies).send({ patient_name: 'Patient 2' });

    expect(res.status).toBe(201);
    expect(res.body.number).toBe(2);
  });

  it('retourne 403 si le rôle est admin (pas secretary)', async () => {
    const res = await request(app)
      .post('/api/queue')
      .set('Cookie', adminCookies)
      .send({ patient_name: 'Patient Admin' });

    expect(res.status).toBe(403);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).post('/api/queue').send({ patient_name: 'X' });
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/queue/:id ──────────────────────────────────────────────────────
describe('PATCH /api/queue/:id', () => {
  let adminCookies, secCookies, tokenId;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Queue Patch', 'admin-q-patch@test.ci');
    secCookies   = await createUser(adminCookies, 'sec-q-patch@test.ci', 'secretary');
    const res    = await request(app)
      .post('/api/queue')
      .set('Cookie', secCookies)
      .send({ patient_name: 'Aya Touré' });
    tokenId = res.body.id;
  });

  it('met à jour le statut en "called" (admin)', async () => {
    const res = await request(app)
      .patch(`/api/queue/${tokenId}`)
      .set('Cookie', adminCookies)
      .send({ status: 'called' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('called');
  });

  it('met à jour le statut en "done"', async () => {
    const res = await request(app)
      .patch(`/api/queue/${tokenId}`)
      .set('Cookie', adminCookies)
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  it('refuse un statut invalide', async () => {
    const res = await request(app)
      .patch(`/api/queue/${tokenId}`)
      .set('Cookie', adminCookies)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
  });

  it('retourne 404 pour un token inexistant', async () => {
    const res = await request(app)
      .patch('/api/queue/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies)
      .send({ status: 'done' });

    expect(res.status).toBe(404);
  });
});

// ── POST /api/queue/next ──────────────────────────────────────────────────────
describe('POST /api/queue/next', () => {
  let adminCookies, secCookies, doctorCookies;

  beforeEach(async () => {
    adminCookies  = await registerAndLogin('Clinique Queue Next', 'admin-q-next@test.ci');
    secCookies    = await createUser(adminCookies, 'sec-q-next@test.ci', 'secretary');
    doctorCookies = await createUser(adminCookies, 'doc-q-next@test.ci', 'doctor');
  });

  it('appelle le prochain patient en attente (doctor)', async () => {
    // Ajouter un patient en file
    await request(app).post('/api/queue').set('Cookie', secCookies).send({ patient_name: 'Premier patient' });

    const res = await request(app).post('/api/queue/next').set('Cookie', doctorCookies);

    expect(res.status).toBe(200);
    expect(res.body.current).not.toBeNull();
    expect(res.body.current.status).toBe('called');
  });

  it('retourne null si aucun patient en attente', async () => {
    const res = await request(app).post('/api/queue/next').set('Cookie', doctorCookies);

    expect(res.status).toBe(200);
    expect(res.body.current).toBeNull();
  });

  it('retourne 403 si le rôle n\'est pas doctor', async () => {
    const res = await request(app).post('/api/queue/next').set('Cookie', secCookies);
    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/queue/:id ─────────────────────────────────────────────────────
describe('DELETE /api/queue/:id', () => {
  let adminCookies, secCookies, tokenId;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Queue Del', 'admin-q-del@test.ci');
    secCookies   = await createUser(adminCookies, 'sec-q-del@test.ci', 'secretary');
    const res    = await request(app)
      .post('/api/queue')
      .set('Cookie', secCookies)
      .send({ patient_name: 'Patient à supprimer' });
    tokenId = res.body.id;
  });

  it('supprime un token de file (secretary)', async () => {
    const res = await request(app).delete(`/api/queue/${tokenId}`).set('Cookie', secCookies);
    expect(res.status).toBe(200);
  });

  it('retourne 404 pour un token inexistant', async () => {
    const res = await request(app)
      .delete('/api/queue/00000000-0000-0000-0000-000000000000')
      .set('Cookie', secCookies);
    expect(res.status).toBe(404);
  });
});

// ── Isolation multi-tenant ────────────────────────────────────────────────────
describe('Isolation multi-tenant — queue', () => {
  it('org B ne peut pas modifier un token de org A', async () => {
    const cookiesA   = await registerAndLogin('Queue Org A', 'admin-q-a@test.ci');
    const cookiesB   = await registerAndLogin('Queue Org B', 'admin-q-b@test.ci');
    const secACookies = await createUser(cookiesA, 'sec-q-a@test.ci', 'secretary');

    // Org A ajoute un token
    const tokenRes = await request(app)
      .post('/api/queue')
      .set('Cookie', secACookies)
      .send({ patient_name: 'Patient Org A' });
    const tokenId = tokenRes.body.id;

    // Org B tente de modifier ce token
    const res = await request(app)
      .patch(`/api/queue/${tokenId}`)
      .set('Cookie', cookiesB)
      .send({ status: 'done' });

    expect(res.status).toBe(404);
  });
});
