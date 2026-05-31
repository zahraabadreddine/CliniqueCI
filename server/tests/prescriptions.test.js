const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

let adminCookies, doctorCookies, patientId, doctorId, consultationId;

function futureDate(daysAhead = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

async function setupOrg() {
  const adminRes = await request(app).post('/api/auth/register').send({
    clinic_name: 'Clinique Prescription',
    email: 'admin-rx@test.ci',
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'Rx',
  });
  adminCookies = adminRes.headers['set-cookie'];

  await request(app).post('/api/users').set('Cookie', adminCookies).send({
    email: 'doctor-rx@test.ci',
    password: 'Password123!',
    first_name: 'Dr',
    last_name: 'Bamba',
    role: 'doctor',
  });

  const docLogin = await request(app).post('/api/auth/login').send({
    email: 'doctor-rx@test.ci',
    password: 'Password123!',
  });
  doctorCookies = docLogin.headers['set-cookie'];

  const users = await request(app).get('/api/users').set('Cookie', adminCookies);
  const doc = users.body.find(u => u.role === 'doctor');
  doctorId = doc.id;

  const patRes = await request(app).post('/api/patients').set('Cookie', adminCookies).send({
    first_name: 'Seydou',
    last_name: 'Diabaté',
    date_of_birth: '1980-04-12',
  });
  patientId = patRes.body.id;

  const apptRes = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
    patient_id: patientId,
    doctor_id: doctorId,
    scheduled_at: futureDate(1),
    reason: 'Contrôle',
  });
  const appointmentId = apptRes.body.id;

  const consultRes = await request(app).post('/api/consultations').set('Cookie', doctorCookies).send({
    appointment_id: appointmentId,
    patient_id: patientId,
    chief_complaint: 'Toux persistante',
    diagnosis: 'Bronchite',
  });
  consultationId = consultRes.body.id;
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

const sampleMedications = [
  { name: 'Amoxicilline', dosage: '500mg', frequency: '3x/jour', duration: '7 jours' },
];

describe('GET /api/prescriptions', () => {
  it('retourne la liste des ordonnances (admin)', async () => {
    const res = await request(app).get('/api/prescriptions').set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/prescriptions');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/prescriptions', () => {
  it('crée une ordonnance (médecin)', async () => {
    const res = await request(app).post('/api/prescriptions').set('Cookie', doctorCookies).send({
      consultation_id: consultationId,
      patient_id: patientId,
      medications: sampleMedications,
      notes: 'Prendre après les repas',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(Array.isArray(res.body.medications)).toBe(true);
    expect(res.body.medications[0].name).toBe('Amoxicilline');
  });

  it('refuse si la consultation n\'appartient pas au médecin', async () => {
    await request(app).post('/api/users').set('Cookie', adminCookies).send({
      email: 'doctor2-rx@test.ci',
      password: 'Password123!',
      first_name: 'Dr2',
      last_name: 'Coulibaly',
      role: 'doctor',
    });
    const doc2Login = await request(app).post('/api/auth/login').send({
      email: 'doctor2-rx@test.ci',
      password: 'Password123!',
    });
    const doc2Cookies = doc2Login.headers['set-cookie'];

    const res = await request(app).post('/api/prescriptions').set('Cookie', doc2Cookies).send({
      consultation_id: consultationId,
      patient_id: patientId,
      medications: sampleMedications,
    });
    expect(res.status).toBe(404);
  });

  it('refuse sans médicaments', async () => {
    const res = await request(app).post('/api/prescriptions').set('Cookie', doctorCookies).send({
      consultation_id: consultationId,
      patient_id: patientId,
      medications: [],
    });
    expect(res.status).toBe(400);
  });

  it('refuse avec médicament incomplet', async () => {
    const res = await request(app).post('/api/prescriptions').set('Cookie', doctorCookies).send({
      consultation_id: consultationId,
      patient_id: patientId,
      medications: [{ name: 'Paracétamol' }],
    });
    expect(res.status).toBe(400);
  });

  it('refuse l\'accès aux non-médecins', async () => {
    const res = await request(app).post('/api/prescriptions').set('Cookie', adminCookies).send({
      consultation_id: consultationId,
      patient_id: patientId,
      medications: sampleMedications,
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/prescriptions/:id', () => {
  let prescriptionId;

  beforeEach(async () => {
    const res = await request(app).post('/api/prescriptions').set('Cookie', doctorCookies).send({
      consultation_id: consultationId,
      patient_id: patientId,
      medications: sampleMedications,
    });
    prescriptionId = res.body.id;
  });

  it('retourne une ordonnance par ID', async () => {
    const res = await request(app)
      .get(`/api/prescriptions/${prescriptionId}`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(prescriptionId);
    expect(Array.isArray(res.body.medications)).toBe(true);
  });

  it('retourne 404 pour une ordonnance inexistante', async () => {
    const res = await request(app)
      .get('/api/prescriptions/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(404);
  });
});
