const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

let adminCookies;

beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
  await db.destroy();
});

beforeEach(async () => {
  await db('refresh_tokens').del();
  await db('prescriptions').del();
  await db('consultations').del();
  await db('appointments').del();
  await db('patients').del();
  await db('users').del();
  await db('organizations').del();

  const res = await request(app).post('/api/auth/register').send({
    clinic_name: 'Clinique Awa',
    email: 'admin-awa@test.ci',
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'Awa',
  });
  adminCookies = res.headers['set-cookie'];
});

describe('POST /api/awa/chat', () => {
  it('retourne une réponse pour un message valide (mode démo)', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Bonjour, qui es-tu ?' }],
        userRole: 'admin',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
    expect(typeof res.body.content).toBe('string');
    expect(res.body.content.length).toBeGreaterThan(0);
  });

  it('retourne une réponse adaptée pour le rôle médecin', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Aide-moi avec un diagnostic différentiel pour une fièvre.' }],
        userRole: 'doctor',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
  });

  it('retourne une réponse adaptée pour le rôle secrétaire', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Gère les rendez-vous de demain.' }],
        userRole: 'secretary',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
  });

  it('retourne une réponse adaptée pour le rôle patient', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Comment prendre mon rendez-vous ?' }],
        userRole: 'patient',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
  });

  it('gère un historique de conversation multi-tours', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [
          { role: 'user', content: 'Bonjour' },
          { role: 'assistant', content: 'Bonjour ! Comment puis-je vous aider ?' },
          { role: 'user', content: 'Parle-moi des statistiques de la clinique.' },
        ],
        userRole: 'admin',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
  });

  it('retourne 400 si messages est un tableau vide', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({ messages: [], userRole: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('retourne 400 si messages est absent', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({ userRole: 'admin' });
    expect(res.status).toBe(400);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .send({
        messages: [{ role: 'user', content: 'Test' }],
        userRole: 'admin',
      });
    expect(res.status).toBe(401);
  });

  it('utilise le fallback démo si userRole est inconnu', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Bonjour' }],
        userRole: 'unknown_role',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
  });
});
