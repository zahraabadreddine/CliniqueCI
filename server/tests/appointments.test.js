const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

let adminCookies, doctorCookies, patientId, doctorId;

async function setupOrg() {
  // Register admin
  const adminRes = await request(app).post('/api/auth/register').send({
    clinic_name: 'Clinique RDV',
    email: 'admin-rdv@test.ci',
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'RDV',
  });
  adminCookies = adminRes.headers['set-cookie'];

  // Create doctor
  await request(app).post('/api/users').set('Cookie', adminCookies).send({
    email: 'doctor-rdv@test.ci',
    password: 'Password123!',
    first_name: 'Dr',
    last_name: 'Koné',
    role: 'doctor',
  });

  const docLogin = await request(app).post('/api/auth/login').send({
    email: 'doctor-rdv@test.ci',
    password: 'Password123!',
  });
  doctorCookies = docLogin.headers['set-cookie'];

  // Get doctor ID
  const users = await request(app).get('/api/users').set('Cookie', adminCookies);
  const doc = users.body.find(u => u.role === 'doctor');
  doctorId = doc.id;

  // Create patient
  const patRes = await request(app).post('/api/patients').set('Cookie', adminCookies).send({
    first_name: 'Oumar',
    last_name: 'Bah',
    date_of_birth: '1990-06-15',
  });
  patientId = patRes.body.id;
}

beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
});

beforeEach(async () => {
  await db.raw('TRUNCATE TABLE organizations RESTART IDENTITY CASCADE');
  await setupOrg();
});

function futureDate(daysAhead = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

describe('GET /api/appointments', () => {
  it('retourne la liste des RDV (admin)', async () => {
    const res = await request(app).get('/api/appointments').set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filtre par date', async () => {
    const scheduled = futureDate(2);
    await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_at: scheduled,
      reason: 'Contrôle',
    });
    const dateOnly = scheduled.slice(0, 10);
    const res = await request(app)
      .get(`/api/appointments?date=${dateOnly}`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/appointments', () => {
  it('crée un RDV (admin)', async () => {
    const res = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_at: futureDate(3),
      reason: 'Consultation générale',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.id).toBeDefined();
  });

  it('refuse si le patient n\'existe pas', async () => {
    const res = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: '00000000-0000-0000-0000-000000000000',
      doctor_id: doctorId,
      scheduled_at: futureDate(3),
    });
    expect(res.status).toBe(404);
  });

  it('refuse si le médecin n\'existe pas', async () => {
    const res = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: patientId,
      doctor_id: '00000000-0000-0000-0000-000000000000',
      scheduled_at: futureDate(3),
    });
    expect(res.status).toBe(404);
  });

  it('refuse une date dans le passé', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const res = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_at: past,
    });
    expect(res.status).toBe(400);
  });

  it('refuse sans données obligatoires', async () => {
    const res = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: patientId,
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/appointments/:id/status', () => {
  let appointmentId;

  beforeEach(async () => {
    const res = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_at: futureDate(4),
      reason: 'Bilan',
    });
    appointmentId = res.body.id;
  });

  it('change le statut vers confirmed (secrétaire/admin)', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('change le statut vers in-room (médecin)', async () => {
    // pending → confirmed (requis par la machine d'état)
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'confirmed' });

    // confirmed → in-room (médecin uniquement)
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', doctorCookies)
      .send({ status: 'in-room' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in-room');
  });

  it('refuse un statut invalide', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });

  it('retourne 404 pour un RDV inexistant', async () => {
    const res = await request(app)
      .patch('/api/appointments/00000000-0000-0000-0000-000000000000/status')
      .set('Cookie', adminCookies)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(404);
  });
});
