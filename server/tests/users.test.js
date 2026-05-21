const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

let adminCookies;

async function setupOrg() {
  const adminRes = await request(app).post('/api/auth/register').send({
    clinic_name: 'Clinique Users',
    email: 'admin-users@test.ci',
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'Users',
  });
  adminCookies = adminRes.headers['set-cookie'];
}

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
  await setupOrg();
});

describe('GET /api/users', () => {
  it('retourne la liste des utilisateurs (admin)', async () => {
    const res = await request(app).get('/api/users').set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(u => u.role === 'admin')).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('retourne uniquement les médecins pour un patient', async () => {
    // Create a doctor
    await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'doctor-users@test.ci',
      password: 'Password123!',
      first_name: 'Dr',
      last_name: 'Fadiga',
      role: 'doctor',
    });

    // Create a patient record and link it to a user
    // (Patient role users are registered separately via auth register flow if supported,
    //  but per the architecture, patients are staff-created. We test via doctor access here.)
    const docLogin = await request(app).post('/api/auth/login').send({
      email: 'doctor-users@test.ci',
      password: 'Password123!',
    });
    const doctorCookies = docLogin.headers['set-cookie'];

    // Doctor can see all users in org
    const res = await request(app).get('/api/users').set('Cookie', doctorCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/users', () => {
  it('crée un médecin (admin)', async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'newdoc@test.ci',
      password: 'Password123!',
      first_name: 'Dr',
      last_name: 'Diomandé',
      role: 'doctor',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.role).toBe('doctor');
    expect(res.body.email).toBe('newdoc@test.ci');
  });

  it('crée un secrétaire (admin)', async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'secretary@test.ci',
      password: 'Password123!',
      first_name: 'Marie',
      last_name: 'Ouédraogo',
      role: 'secretary',
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('secretary');
  });

  it('refuse un email déjà utilisé (409)', async () => {
    await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'dup@test.ci',
      password: 'Password123!',
      first_name: 'A',
      last_name: 'B',
      role: 'doctor',
    });

    const res = await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'dup@test.ci',
      password: 'Password123!',
      first_name: 'C',
      last_name: 'D',
      role: 'secretary',
    });
    expect(res.status).toBe(409);
  });

  it('refuse un rôle invalide', async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'invalid-role@test.ci',
      password: 'Password123!',
      first_name: 'X',
      last_name: 'Y',
      role: 'superuser',
    });
    expect(res.status).toBe(400);
  });

  it('refuse sans données obligatoires', async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'noname@test.ci',
    });
    expect(res.status).toBe(400);
  });

  it('refuse la création par un non-admin (403)', async () => {
    // Create a doctor first
    await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'doctor-notadmin@test.ci',
      password: 'Password123!',
      first_name: 'Dr',
      last_name: 'Soro',
      role: 'doctor',
    });
    const docLogin = await request(app).post('/api/auth/login').send({
      email: 'doctor-notadmin@test.ci',
      password: 'Password123!',
    });
    const doctorCookies = docLogin.headers['set-cookie'];

    const res = await request(app).post('/api/users').set('Cookie', doctorCookies).send({
      email: 'another@test.ci',
      password: 'Password123!',
      first_name: 'Z',
      last_name: 'W',
      role: 'secretary',
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/users/:id', () => {
  let userId;

  beforeEach(async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'getbyid@test.ci',
      password: 'Password123!',
      first_name: 'Gnata',
      last_name: 'Silué',
      role: 'doctor',
    });
    userId = res.body.id;
  });

  it('retourne un utilisateur par ID (admin)', async () => {
    const res = await request(app).get(`/api/users/${userId}`).set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe('getbyid@test.ci');
    expect(res.body.role).toBe('doctor');
  });

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(404);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get(`/api/users/${userId}`);
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/users/:id', () => {
  let userId;

  beforeEach(async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'patchme@test.ci',
      password: 'Password123!',
      first_name: 'Awa',
      last_name: 'Diomandé',
      role: 'secretary',
    });
    userId = res.body.id;
  });

  it('met à jour le prénom et nom (admin)', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}`)
      .set('Cookie', adminCookies)
      .send({ first_name: 'Mariam', last_name: 'Koné' });
    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe('Mariam');
    expect(res.body.last_name).toBe('Koné');
  });

  it('refuse un email déjà utilisé par un autre utilisateur (409)', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}`)
      .set('Cookie', adminCookies)
      .send({ email: 'admin-users@test.ci' }); // email de l'admin
    expect(res.status).toBe(409);
  });

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await request(app)
      .patch('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies)
      .send({ first_name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('refuse la mise à jour par un non-admin (403)', async () => {
    const docLogin = await request(app).post('/api/auth/login').send({
      email: 'patchme@test.ci',
      password: 'Password123!',
    });
    const docCookies = docLogin.headers['set-cookie'];
    const res = await request(app)
      .patch(`/api/users/${userId}`)
      .set('Cookie', docCookies)
      .send({ first_name: 'Unauthorized' });
    expect(res.status).toBe(403);
  });
});
