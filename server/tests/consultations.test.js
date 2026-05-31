const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

let adminCookies, doctorCookies, patientId, doctorId, appointmentId;

function futureDate(daysAhead = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

async function setupOrg() {
  const adminRes = await request(app).post('/api/auth/register').send({
    clinic_name: 'Clinique Consult',
    email: 'admin-consult@test.ci',
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'Consult',
  });
  adminCookies = adminRes.headers['set-cookie'];

  await request(app).post('/api/users').set('Cookie', adminCookies).send({
    email: 'doctor-consult@test.ci',
    password: 'Password123!',
    first_name: 'Dr',
    last_name: 'Ouattara',
    role: 'doctor',
  });

  const docLogin = await request(app).post('/api/auth/login').send({
    email: 'doctor-consult@test.ci',
    password: 'Password123!',
  });
  doctorCookies = docLogin.headers['set-cookie'];

  const users = await request(app).get('/api/users').set('Cookie', adminCookies);
  const doc = users.body.find(u => u.role === 'doctor');
  doctorId = doc.id;

  const patRes = await request(app).post('/api/patients').set('Cookie', adminCookies).send({
    first_name: 'Mariam',
    last_name: 'Sanogo',
    date_of_birth: '1987-09-22',
  });
  patientId = patRes.body.id;

  const apptRes = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
    patient_id: patientId,
    doctor_id: doctorId,
    scheduled_at: futureDate(1),
    reason: 'Fièvre',
  });
  appointmentId = apptRes.body.id;
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
  await setupOrg();
});

describe('GET /api/consultations', () => {
  it('retourne la liste des consultations (admin)', async () => {
    const res = await request(app).get('/api/consultations').set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/consultations');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/consultations', () => {
  it('crée une consultation (médecin)', async () => {
    const res = await request(app).post('/api/consultations').set('Cookie', doctorCookies).send({
      appointment_id: appointmentId,
      patient_id: patientId,
      chief_complaint: 'Fièvre depuis 3 jours',
      diagnosis: 'Paludisme simple',
      notes: 'Traitement antipaludéen prescrit',
    });
    expect(res.status).toBe(201);
    expect(res.body.diagnosis).toBe('Paludisme simple');
    expect(res.body.id).toBeDefined();
  });

  it('marque le RDV comme terminé après la consultation', async () => {
    await request(app).post('/api/consultations').set('Cookie', doctorCookies).send({
      appointment_id: appointmentId,
      patient_id: patientId,
      chief_complaint: 'Douleur abdominale',
      diagnosis: 'Gastrite',
    });
    // Check that appointment is now completed
    const appts = await request(app).get('/api/appointments').set('Cookie', adminCookies);
    const appt = appts.body.find(a => a.id === appointmentId);
    expect(appt?.status).toBe('completed');
  });

  it('refuse si le RDV n\'appartient pas au médecin', async () => {
    // Create another doctor
    await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'doctor2-consult@test.ci',
      password: 'Password123!',
      first_name: 'Dr2',
      last_name: 'Kone',
      role: 'doctor',
    });
    const doc2Login = await request(app).post('/api/auth/login').send({
      email: 'doctor2-consult@test.ci',
      password: 'Password123!',
    });
    const doc2Cookies = doc2Login.headers['set-cookie'];

    const res = await request(app).post('/api/consultations').set('Cookie', doc2Cookies).send({
      appointment_id: appointmentId,
      patient_id: patientId,
      chief_complaint: 'Tentative',
      diagnosis: 'Refusé',
    });
    expect(res.status).toBe(404);
  });

  it('refuse sans données obligatoires', async () => {
    const res = await request(app).post('/api/consultations').set('Cookie', doctorCookies).send({
      appointment_id: appointmentId,
      patient_id: patientId,
    });
    expect(res.status).toBe(400);
  });

  it('refuse l\'accès aux non-médecins', async () => {
    const res = await request(app).post('/api/consultations').set('Cookie', adminCookies).send({
      appointment_id: appointmentId,
      patient_id: patientId,
      chief_complaint: 'Toux',
      diagnosis: 'Rhume',
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/consultations/:id', () => {
  let consultationId;

  beforeEach(async () => {
    const res = await request(app).post('/api/consultations').set('Cookie', doctorCookies).send({
      appointment_id: appointmentId,
      patient_id: patientId,
      chief_complaint: 'Mal de tête',
      diagnosis: 'Migraine',
    });
    consultationId = res.body.id;
  });

  it('retourne une consultation par ID', async () => {
    const res = await request(app).get(`/api/consultations/${consultationId}`).set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(consultationId);
    expect(res.body.diagnosis).toBe('Migraine');
  });

  it('retourne 404 pour une consultation inexistante', async () => {
    const res = await request(app)
      .get('/api/consultations/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(404);
  });
});
