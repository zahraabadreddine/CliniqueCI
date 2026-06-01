// ── Mock du SDK Anthropic (avant tout require de l'app) ──────────────────────
let mockCreate = jest.fn().mockResolvedValue({
  content: [{ text: 'Réponse Anthropic simulée' }],
});

jest.mock('@anthropic-ai/sdk', () => {
  function MockAnthropic() {}
  MockAnthropic.prototype.messages = {
    create: (...args) => mockCreate(...args),
  };
  MockAnthropic._setCreate = (fn) => { mockCreate = fn; };
  return MockAnthropic;
});

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

let adminCookies;

beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
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

  // ── Chemins getDemoResponse() selon mots-clés ────────────────────────────
  it('getDemoResponse — mot-clé "ordonnance" (mode démo)', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Comment rédiger une ordonnance ?' }],
        userRole: 'doctor',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
    expect(typeof res.body.content).toBe('string');
  });

  it('getDemoResponse — mot-clé "facture" (mode démo)', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Comment gérer la facturation ?' }],
        userRole: 'admin',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
  });

  it('getDemoResponse — mot-clé "patient" (mode démo)', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Cherche le dossier patient de Koné.' }],
        userRole: 'doctor',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
  });

  it('getDemoResponse — mot-clé "consultation" (mode démo)', async () => {
    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Aide-moi à rédiger une note de consultation.' }],
        userRole: 'doctor',
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
  });

  // ── Chemin Anthropic API réelle (clé présente) ───────────────────────────
  it('appelle l\'API Anthropic si ANTHROPIC_API_KEY est défini', async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-fake-key-for-test';
    mockCreate = jest.fn().mockResolvedValue({
      content: [{ text: 'Réponse Anthropic de test' }],
    });

    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Bonjour depuis le vrai SDK' }],
        userRole: 'admin',
      });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe('Réponse Anthropic de test');
    process.env.ANTHROPIC_API_KEY = original;
  });

  it('utilise le fallback démo si l\'API Anthropic retourne 429', async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-fake-key-for-test';
    const err429 = Object.assign(new Error('Rate limit'), { status: 429 });
    mockCreate = jest.fn().mockRejectedValue(err429);

    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Bonjour' }],
        userRole: 'admin',
      });

    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
    expect(typeof res.body.content).toBe('string');
    process.env.ANTHROPIC_API_KEY = original;
  });

  it('utilise le fallback démo si l\'API Anthropic retourne 400', async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-fake-key-for-test';
    const err400 = Object.assign(new Error('Bad request'), { status: 400 });
    mockCreate = jest.fn().mockRejectedValue(err400);

    const res = await request(app)
      .post('/api/awa/chat')
      .set('Cookie', adminCookies)
      .send({
        messages: [{ role: 'user', content: 'Test erreur 400' }],
        userRole: 'admin',
      });

    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
    process.env.ANTHROPIC_API_KEY = original;
  });
});
