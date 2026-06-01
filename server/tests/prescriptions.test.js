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
  await db.raw('TRUNCATE TABLE organizations RESTART IDENTITY CASCADE');
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

describe('GET /api/prescriptions/verify/:token (public)', () => {
  let qrToken;

  beforeEach(async () => {
    const res = await request(app).post('/api/prescriptions').set('Cookie', doctorCookies).send({
      consultation_id: consultationId,
      patient_id: patientId,
      medications: sampleMedications,
      notes: 'Vérification QR',
    });
    qrToken = res.body.qr_token;
  });

  it('retourne l\'ordonnance pour un token UUID valide (sans auth)', async () => {
    const res = await request(app).get(`/api/prescriptions/verify/${qrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.prescription).toBeDefined();
    expect(res.body.prescription.id).toBeDefined();
    expect(Array.isArray(res.body.prescription.medications)).toBe(true);
    expect(res.body.prescription.patient_first_name).toBeDefined();
    expect(res.body.prescription.doctor_name).toBeDefined();
  });

  it('retourne 404 pour un token au format invalide (non-UUID)', async () => {
    const res = await request(app).get('/api/prescriptions/verify/not-a-uuid');
    expect(res.status).toBe(404);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toMatch(/introuvable|invalide/i);
  });

  it('retourne 404 pour un UUID valide mais inexistant en base', async () => {
    const res = await request(app).get('/api/prescriptions/verify/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.valid).toBe(false);
  });
});

describe('GET /api/prescriptions?patientId=', () => {
  it('filtre les ordonnances par patientId', async () => {
    // Créer une ordonnance pour le patient courant
    await request(app).post('/api/prescriptions').set('Cookie', doctorCookies).send({
      consultation_id: consultationId,
      patient_id: patientId,
      medications: sampleMedications,
    });

    const res = await request(app)
      .get(`/api/prescriptions?patientId=${patientId}`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every(p => p.patient_id === patientId)).toBe(true);
  });

  it('retourne un tableau vide pour un patientId sans ordonnances', async () => {
    const res = await request(app)
      .get('/api/prescriptions?patientId=00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});
