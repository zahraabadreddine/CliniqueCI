const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

let cookies, orgId, doctorCookies;

async function registerAndLogin(clinicName, email) {
  const res = await request(app).post('/api/auth/register').send({
    clinic_name: clinicName,
    email,
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'Test',
  });
  return res.headers['set-cookie'];
}

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

  cookies = await registerAndLogin('Clinique Patients', 'admin-patients@test.ci');

  // Create a doctor in the same org
  const adminRes = await request(app)
    .get('/api/users')
    .set('Cookie', cookies);
  // Create a doctor user
  await request(app)
    .post('/api/users')
    .set('Cookie', cookies)
    .send({
      email: 'doctor-patients@test.ci',
      password: 'Password123!',
      first_name: 'Dr',
      last_name: 'Test',
      role: 'doctor',
    });
  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'doctor-patients@test.ci',
    password: 'Password123!',
  });
  doctorCookies = loginRes.headers['set-cookie'];
});

describe('GET /api/patients', () => {
  it('retourne la liste des patients (admin)', async () => {
    const res = await request(app).get('/api/patients').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  it('filtre par recherche', async () => {
    await request(app).post('/api/patients').set('Cookie', cookies).send({
      first_name: 'Konan',
      last_name: 'Yao',
      date_of_birth: '1990-05-15',
    });
    const res = await request(app).get('/api/patients?search=Konan').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.some(p => p.first_name === 'Konan')).toBe(true);
  });
});

describe('POST /api/patients', () => {
  it('crée un patient avec les données minimales', async () => {
    const res = await request(app).post('/api/patients').set('Cookie', cookies).send({
      first_name: 'Aminata',
      last_name: 'Coulibaly',
      date_of_birth: '1985-03-20',
    });
    expect(res.status).toBe(201);
    expect(res.body.first_name).toBe('Aminata');
    expect(res.body.id).toBeDefined();
  });

  it('crée un patient avec toutes les données', async () => {
    const res = await request(app).post('/api/patients').set('Cookie', cookies).send({
      first_name: 'Koffi',
      last_name: 'Assi',
      date_of_birth: '1978-11-10',
      phone: '+225 07 07 07 07',
      email: 'koffi@test.ci',
      address: 'Cocody, Abidjan',
      blood_type: 'O+',
      allergies: 'Pénicilline',
    });
    expect(res.status).toBe(201);
    expect(res.body.blood_type).toBe('O+');
  });

  it('refuse les données invalides (date_of_birth manquante)', async () => {
    const res = await request(app).post('/api/patients').set('Cookie', cookies).send({
      first_name: 'X',
      last_name: 'Y',
    });
    expect(res.status).toBe(400);
  });

  it('refuse un groupe sanguin invalide', async () => {
    const res = await request(app).post('/api/patients').set('Cookie', cookies).send({
      first_name: 'Z',
      last_name: 'W',
      date_of_birth: '1990-01-01',
      blood_type: 'X+',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/patients/:id', () => {
  let patientId;

  beforeEach(async () => {
    const res = await request(app).post('/api/patients').set('Cookie', cookies).send({
      first_name: 'Fatou',
      last_name: 'Diallo',
      date_of_birth: '1992-07-08',
    });
    patientId = res.body.id;
  });

  it('retourne un patient par ID', async () => {
    const res = await request(app).get(`/api/patients/${patientId}`).set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(patientId);
    expect(res.body.first_name).toBe('Fatou');
  });

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await request(app)
      .get('/api/patients/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/patients/:id/history', () => {
  let patientId;

  beforeEach(async () => {
    const res = await request(app).post('/api/patients').set('Cookie', cookies).send({
      first_name: 'Ibrahim',
      last_name: 'Traoré',
      date_of_birth: '1988-12-01',
    });
    patientId = res.body.id;
  });

  it('retourne l\'historique d\'un patient', async () => {
    const res = await request(app).get(`/api/patients/${patientId}/history`).set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('appointments');
    expect(res.body).toHaveProperty('consultations');
    expect(res.body).toHaveProperty('prescriptions');
  });

  it('retourne 404 pour un patient inexistant', async () => {
    const res = await request(app)
      .get('/api/patients/00000000-0000-0000-0000-000000000000/history')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/patients/:id', () => {
  let patientId;

  beforeEach(async () => {
    const res = await request(app).post('/api/patients').set('Cookie', cookies).send({
      first_name: 'Moussa',
      last_name: 'Bamba',
      date_of_birth: '1970-06-15',
    });
    patientId = res.body.id;
  });

  it('met à jour un patient (admin)', async () => {
    const res = await request(app)
      .patch(`/api/patients/${patientId}`)
      .set('Cookie', cookies)
      .send({ phone: '+225 05 05 05 05', allergies: 'Aspirine' });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+225 05 05 05 05');
    expect(res.body.allergies).toBe('Aspirine');
  });

  it('met à jour uniquement les champs fournis', async () => {
    const res = await request(app)
      .patch(`/api/patients/${patientId}`)
      .set('Cookie', cookies)
      .send({ blood_type: 'B+' });
    expect(res.status).toBe(200);
    expect(res.body.blood_type).toBe('B+');
    expect(res.body.last_name).toBe('Bamba');
  });

  it('refuse un groupe sanguin invalide', async () => {
    const res = await request(app)
      .patch(`/api/patients/${patientId}`)
      .set('Cookie', cookies)
      .send({ blood_type: 'Z+' });
    expect(res.status).toBe(400);
  });

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await request(app)
      .patch('/api/patients/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookies)
      .send({ phone: '0000' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/patients/me & PATCH /api/patients/me (rôle patient)', () => {
  let patientCookies;

  beforeEach(async () => {
    const bcrypt = require('bcrypt');
    // Récupérer l'organisation créée par l'admin
    const org = await db('organizations').first();
    // Créer un utilisateur avec le rôle patient directement en base
    const passwordHash = await bcrypt.hash('Password123!', 12);
    const [patientUser] = await db('users')
      .insert({
        organization_id: org.id,
        email: 'patient-me@test.ci',
        password_hash: passwordHash,
        first_name: 'Nadège',
        last_name: 'Kouamé',
        role: 'patient',
      })
      .returning(['id']);
    // Lier un dossier patient à ce compte utilisateur
    await db('patients').insert({
      organization_id: org.id,
      user_id: patientUser.id,
      first_name: 'Nadège',
      last_name: 'Kouamé',
      date_of_birth: '1995-03-20',
    });
    // Se connecter en tant que patient
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'patient-me@test.ci',
      password: 'Password123!',
    });
    patientCookies = loginRes.headers['set-cookie'];
  });

  it('GET /api/patients/me retourne le dossier du patient connecté', async () => {
    const res = await request(app).get('/api/patients/me').set('Cookie', patientCookies);
    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe('Nadège');
    expect(res.body.last_name).toBe('Kouamé');
  });

  it('GET /api/patients/me retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/patients/me');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/patients/me met à jour le dossier du patient connecté', async () => {
    const res = await request(app)
      .patch('/api/patients/me')
      .set('Cookie', patientCookies)
      .send({ phone: '+225 07 77 77 77' });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+225 07 77 77 77');
  });

  it('PATCH /api/patients/me refuse un groupe sanguin invalide', async () => {
    const res = await request(app)
      .patch('/api/patients/me')
      .set('Cookie', patientCookies)
      .send({ blood_type: 'XX' });
    expect(res.status).toBe(400);
  });
});
