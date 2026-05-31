const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

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
});

describe('POST /api/auth/register', () => {
  it('crée une organisation et un admin', async () => {
    const res = await request(app).post('/api/auth/register').send({
      clinic_name: 'Clinique Test',
      email: 'admin@test.ci',
      password: 'Password123!',
      first_name: 'Admin',
      last_name: 'Test',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.organization.name).toBe('Clinique Test');
  });

  it('refuse un email déjà utilisé', async () => {
    await request(app).post('/api/auth/register').send({
      clinic_name: 'Clinique A',
      email: 'dup@test.ci',
      password: 'Password123!',
      first_name: 'A',
      last_name: 'B',
    });
    const res = await request(app).post('/api/auth/register').send({
      clinic_name: 'Clinique B',
      email: 'dup@test.ci',
      password: 'Password123!',
      first_name: 'C',
      last_name: 'D',
    });
    expect(res.status).toBe(409);
  });

  it('refuse un mot de passe trop court', async () => {
    const res = await request(app).post('/api/auth/register').send({
      clinic_name: 'Clinique C',
      email: 'short@test.ci',
      password: '123',
      first_name: 'X',
      last_name: 'Y',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      clinic_name: 'Clinique Login',
      email: 'login@test.ci',
      password: 'Password123!',
      first_name: 'Login',
      last_name: 'User',
    });
  });

  it('retourne un cookie access_token valide', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.ci',
      password: 'Password123!',
    });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('refuse des identifiants invalides', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.ci',
      password: 'mauvais',
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  let loginCookies;

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      clinic_name: 'Clinique Logout',
      email: 'logout@test.ci',
      password: 'Password123!',
      first_name: 'Log',
      last_name: 'Out',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'logout@test.ci',
      password: 'Password123!',
    });
    loginCookies = res.headers['set-cookie'];
  });

  it('déconnecte et retourne un message de confirmation', async () => {
    const res = await request(app).post('/api/auth/logout').set('Cookie', loginCookies);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('révoque le refresh token en base après logout', async () => {
    const before = await db('refresh_tokens').count('id as n').first();
    await request(app).post('/api/auth/logout').set('Cookie', loginCookies);
    const after = await db('refresh_tokens').count('id as n').first();
    expect(Number(after.n)).toBe(Number(before.n) - 1);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  let allCookies;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      clinic_name: 'Clinique Refresh',
      email: 'refresh@test.ci',
      password: 'Password123!',
      first_name: 'Ref',
      last_name: 'Resh',
    });
    allCookies = res.headers['set-cookie'];
  });

  it('renouvelle le token à partir d\'un refresh_token valide', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Cookie', allCookies);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    // Un nouveau cookie access_token doit être émis
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('retourne 401 sans refresh_token', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('retourne 401 avec un refresh_token invalide', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refresh_token=token-invalide; Path=/; HttpOnly']);
    expect(res.status).toBe(401);
  });
});
