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

/**
 * Retry TRUNCATE on deadlock — after a PATCH /status, the route fires
 * async notifications (best-effort, post-res.json) that hold short-lived
 * DB connections.  Under --coverage the instrumentation overhead makes
 * those operations overlap with the next beforeEach TRUNCATE, occasionally
 * producing a PostgreSQL deadlock.  A brief pause + retry resolves it.
 */
async function truncateWithRetry(maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await db.raw('TRUNCATE TABLE organizations RESTART IDENTITY CASCADE');
      return;
    } catch (err) {
      const isDeadlock = err.message && err.message.includes('deadlock');
      if (isDeadlock && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
      } else {
        throw err;
      }
    }
  }
}

beforeEach(async () => {
  await truncateWithRetry();
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

describe('GET /api/appointments/slots', () => {
  it('retourne les créneaux disponibles pour un médecin (date future)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/appointments/slots?doctor_id=${doctorId}&date=${date}`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.date).toBe(date);
    expect(res.body.doctor_id).toBe(doctorId);
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBeGreaterThan(0);
  });

  it('retourne 400 sans les paramètres requis', async () => {
    const res = await request(app)
      .get('/api/appointments/slots')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(400);
  });

  it('retourne 404 si le médecin est introuvable', async () => {
    const res = await request(app)
      .get('/api/appointments/slots?doctor_id=00000000-0000-0000-0000-000000000000&date=2030-01-01')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/appointments/:id', () => {
  let appointmentId;

  beforeEach(async () => {
    const res = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_at: futureDate(5),
      reason: 'Bilan sanguin',
    });
    appointmentId = res.body.id;
  });

  it('retourne un RDV par son ID avec les infos patient et médecin', async () => {
    const res = await request(app)
      .get(`/api/appointments/${appointmentId}`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(appointmentId);
    expect(res.body.reason).toBe('Bilan sanguin');
    expect(res.body.patient_first_name).toBeDefined();
    expect(res.body.doctor_first_name).toBeDefined();
  });

  it('retourne 404 pour un RDV inexistant', async () => {
    const res = await request(app)
      .get('/api/appointments/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/appointments (filtres supplémentaires)', () => {
  beforeEach(async () => {
    await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_at: futureDate(3),
      reason: 'Test filtres avancés',
    });
  });

  it('filtre par doctor_id', async () => {
    const res = await request(app)
      .get(`/api/appointments?doctor_id=${doctorId}`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('filtre par patientId', async () => {
    const res = await request(app)
      .get(`/api/appointments?patientId=${patientId}`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('filtre par date_from et date_to', async () => {
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/appointments?date_from=${from}&date_to=${to}`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filtre par statut pending', async () => {
    const res = await request(app)
      .get('/api/appointments?status=pending')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every(a => a.status === 'pending')).toBe(true);
  });
});

describe('PATCH /api/appointments/:id/status (transitions supplémentaires)', () => {
  let appointmentId;

  beforeEach(async () => {
    const res = await request(app).post('/api/appointments').set('Cookie', adminCookies).send({
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_at: futureDate(7),
      reason: 'Test transitions statut',
    });
    appointmentId = res.body.id;
  });

  it('transition pending → cancelled', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('transition confirmed → waiting', async () => {
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'confirmed' });
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'waiting' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('waiting');
  });

  it('transition in-room → completed (médecin)', async () => {
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'confirmed' });
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', doctorCookies)
      .send({ status: 'in-room' });
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', doctorCookies)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('refuse une transition invalide (pending → completed) → 422', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'completed' });
    expect(res.status).toBe(422);
  });
});
