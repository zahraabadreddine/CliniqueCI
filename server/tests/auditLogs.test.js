/**
 * Tests — /api/audit-logs
 * Couvre : liste paginée (admin only), filtres, isolation multi-tenant
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

async function createDoctor(adminCookies, email) {
  await request(app)
    .post('/api/users')
    .set('Cookie', adminCookies)
    .send({ email, password: 'Password123!', first_name: 'Doc', last_name: 'Test', role: 'doctor' });
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
  await db('audit_logs').del();
  await db('invoices').del();
  await db('prescriptions').del();
  await db('consultations').del();
  await db('appointments').del();
  await db('patients').del();
  await db('users').del();
  await db('organizations').del();
});

// ── GET /api/audit-logs ───────────────────────────────────────────────────────
describe('GET /api/audit-logs', () => {
  let adminCookies;

  beforeEach(async () => {
    adminCookies = await registerAndLogin('Clinique Audit', 'admin-audit@test.ci');
  });

  it('retourne la liste paginée des logs (vide au départ)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('logs');
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
  });

  it('accepte les paramètres de pagination ?page et ?limit', async () => {
    const res = await request(app)
      .get('/api/audit-logs?page=1&limit=10')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it('retourne des logs filtrés par ?action', async () => {
    const res = await request(app)
      .get('/api/audit-logs?action=USER_LOGIN')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
    // Tous les logs retournés doivent avoir l'action USER_LOGIN (ou liste vide)
    res.body.logs.forEach(log => {
      expect(log.action).toBe('USER_LOGIN');
    });
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(401);
  });

  it('retourne 403 si le rôle n\'est pas admin (doctor)', async () => {
    const doctorCookies = await createDoctor(adminCookies, 'doc-audit@test.ci');
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', doctorCookies);

    expect(res.status).toBe(403);
  });
});

// ── Isolation multi-tenant ────────────────────────────────────────────────────
describe('Isolation multi-tenant — audit-logs', () => {
  it('chaque org ne voit que ses propres logs', async () => {
    const cookiesA = await registerAndLogin('Audit Org A', 'admin-audit-a@test.ci');
    const cookiesB = await registerAndLogin('Audit Org B', 'admin-audit-b@test.ci');

    const orgA = await db('organizations').orderBy('created_at', 'asc').first();
    const userA = await db('users').where('organization_id', orgA.id).first();

    // Insérer un log pour l'org A
    await db('audit_logs').insert({
      organization_id: orgA.id,
      actor_id:        userA.id,
      action:          'TEST_ACTION_ORGA',
      target_type:     'user',
      target_id:       userA.id,
      ip_address:      '127.0.0.1',
    });

    // Org B ne doit pas voir le log de Org A
    const resB = await request(app).get('/api/audit-logs').set('Cookie', cookiesB);
    expect(resB.status).toBe(200);
    const hasOrgALog = resB.body.logs.some(l => l.action === 'TEST_ACTION_ORGA');
    expect(hasOrgALog).toBe(false);

    // Org A voit bien son propre log
    const resA = await request(app).get('/api/audit-logs').set('Cookie', cookiesA);
    expect(resA.status).toBe(200);
    const hasOrgALogInA = resA.body.logs.some(l => l.action === 'TEST_ACTION_ORGA');
    expect(hasOrgALogInA).toBe(true);
  });
});
