/**
 * Tests — /api/stock
 * Couvre : CRUD articles, mouvements de stock, isolation multi-tenant
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

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
});

beforeEach(async () => {
  await db('refresh_tokens').del();
  await db('stock_movements').del();
  await db('stock_items').del();
  await db('invoices').del();
  await db('prescriptions').del();
  await db('consultations').del();
  await db('appointments').del();
  await db('patients').del();
  await db('users').del();
  await db('organizations').del();
});

// ── GET /api/stock ────────────────────────────────────────────────────────────
describe('GET /api/stock', () => {
  it('retourne la liste vide (admin)', async () => {
    const cookies = await registerAndLogin('Clinique Stock', 'admin-stock@test.ci');
    const res = await request(app).get('/api/stock').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/stock');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/stock ───────────────────────────────────────────────────────────
describe('POST /api/stock', () => {
  let cookies;

  beforeEach(async () => {
    cookies = await registerAndLogin('Clinique Stock Create', 'admin-stock-c@test.ci');
  });

  it('crée un article avec les données minimales', async () => {
    const res = await request(app)
      .post('/api/stock')
      .set('Cookie', cookies)
      .send({ name: 'Paracétamol 500mg', quantity: 100, min_quantity: 20 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Paracétamol 500mg');
    expect(res.body.id).toBeDefined();
  });

  it('crée un article avec toutes les données', async () => {
    const res = await request(app)
      .post('/api/stock')
      .set('Cookie', cookies)
      .send({
        name: 'Amoxicilline 250mg',
        category: 'medicament',
        unit: 'comprimé',
        quantity: 200,
        min_quantity: 30,
        unit_price: 150,
        supplier: 'Pharma CI',
      });

    expect(res.status).toBe(201);
    expect(res.body.supplier).toBe('Pharma CI');
    expect(res.body.unit_price).toBe('150');
  });

  it('refuse si le nom est absent', async () => {
    const res = await request(app)
      .post('/api/stock')
      .set('Cookie', cookies)
      .send({ quantity: 50 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nom/i);
  });

  it('refuse si le rôle n\'est pas admin (secretary)', async () => {
    const secCookies = await createSecretary(cookies, 'sec-stock@test.ci');
    const res = await request(app)
      .post('/api/stock')
      .set('Cookie', secCookies)
      .send({ name: 'Ibuprofène', quantity: 50 });

    expect(res.status).toBe(403);
  });
});

// ── GET /api/stock/:id ────────────────────────────────────────────────────────
describe('GET /api/stock/:id', () => {
  let cookies, itemId;

  beforeEach(async () => {
    cookies = await registerAndLogin('Clinique Stock Get', 'admin-stock-g@test.ci');
    const res = await request(app)
      .post('/api/stock')
      .set('Cookie', cookies)
      .send({ name: 'Sérum physiologique', quantity: 50 });
    itemId = res.body.id;
  });

  it('retourne un article par ID avec son historique de mouvements', async () => {
    const res = await request(app).get(`/api/stock/${itemId}`).set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(itemId);
    expect(res.body.name).toBe('Sérum physiologique');
    expect(Array.isArray(res.body.movements)).toBe(true);
  });

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await request(app)
      .get('/api/stock/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
  });
});

// ── POST /api/stock/:id/movements ─────────────────────────────────────────────
describe('POST /api/stock/:id/movements', () => {
  let cookies, itemId;

  beforeEach(async () => {
    cookies = await registerAndLogin('Clinique Mouvement', 'admin-mouv@test.ci');
    const res = await request(app)
      .post('/api/stock')
      .set('Cookie', cookies)
      .send({ name: 'Gants latex', quantity: 100, min_quantity: 20 });
    itemId = res.body.id;
  });

  it('enregistre un mouvement de type "in"', async () => {
    const res = await request(app)
      .post(`/api/stock/${itemId}/movements`)
      .set('Cookie', cookies)
      .send({ type: 'in', quantity: 50, reason: 'Commande reçue' });

    expect(res.status).toBe(201);
    expect(res.body.movement.type).toBe('in');
    expect(res.body.new_quantity).toBe(150);
  });

  it('enregistre un mouvement de type "out"', async () => {
    const res = await request(app)
      .post(`/api/stock/${itemId}/movements`)
      .set('Cookie', cookies)
      .send({ type: 'out', quantity: 30 });

    expect(res.status).toBe(201);
    expect(res.body.new_quantity).toBe(70);
  });

  it('enregistre un ajustement absolu', async () => {
    const res = await request(app)
      .post(`/api/stock/${itemId}/movements`)
      .set('Cookie', cookies)
      .send({ type: 'adjustment', quantity: 42 });

    expect(res.status).toBe(201);
    expect(res.body.new_quantity).toBe(42);
  });

  it('refuse un type invalide', async () => {
    const res = await request(app)
      .post(`/api/stock/${itemId}/movements`)
      .set('Cookie', cookies)
      .send({ type: 'invalid', quantity: 10 });

    expect(res.status).toBe(400);
  });

  it('refuse une quantité invalide', async () => {
    const res = await request(app)
      .post(`/api/stock/${itemId}/movements`)
      .set('Cookie', cookies)
      .send({ type: 'in', quantity: 'abc' });

    expect(res.status).toBe(400);
  });
});

// ── PATCH /api/stock/:id ──────────────────────────────────────────────────────
describe('PATCH /api/stock/:id', () => {
  let cookies, itemId;

  beforeEach(async () => {
    cookies = await registerAndLogin('Clinique Patch Stock', 'admin-patch-stock@test.ci');
    const res = await request(app)
      .post('/api/stock')
      .set('Cookie', cookies)
      .send({ name: 'Bandages', quantity: 60 });
    itemId = res.body.id;
  });

  it('met à jour un article', async () => {
    const res = await request(app)
      .patch(`/api/stock/${itemId}`)
      .set('Cookie', cookies)
      .send({ name: 'Bandages stériles', supplier: 'MediSupply' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Bandages stériles');
    expect(res.body.supplier).toBe('MediSupply');
  });

  it('retourne 404 pour un article inexistant', async () => {
    const res = await request(app)
      .patch('/api/stock/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookies)
      .send({ name: 'Nouveau nom' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/stock/:id ─────────────────────────────────────────────────────
describe('DELETE /api/stock/:id', () => {
  let cookies, itemId;

  beforeEach(async () => {
    cookies = await registerAndLogin('Clinique Del Stock', 'admin-del-stock@test.ci');
    const res = await request(app)
      .post('/api/stock')
      .set('Cookie', cookies)
      .send({ name: 'Article à supprimer', quantity: 5 });
    itemId = res.body.id;
  });

  it('supprime un article existant', async () => {
    const res = await request(app).delete(`/api/stock/${itemId}`).set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('retourne 404 si l\'article n\'existe pas', async () => {
    const res = await request(app)
      .delete('/api/stock/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
  });
});

// ── Isolation multi-tenant ────────────────────────────────────────────────────
describe('Isolation multi-tenant — stock', () => {
  it('org B ne peut pas accéder aux articles de org A', async () => {
    const cookiesA = await registerAndLogin('Stock Org A', 'admin-stock-a@test.ci');
    const cookiesB = await registerAndLogin('Stock Org B', 'admin-stock-b@test.ci');

    // Org A crée un article
    const createRes = await request(app)
      .post('/api/stock')
      .set('Cookie', cookiesA)
      .send({ name: 'Article confidentiel A', quantity: 10 });
    const itemId = createRes.body.id;

    // Org B tente d'accéder à l'article de Org A
    const res = await request(app).get(`/api/stock/${itemId}`).set('Cookie', cookiesB);
    expect(res.status).toBe(404);
  });
});
