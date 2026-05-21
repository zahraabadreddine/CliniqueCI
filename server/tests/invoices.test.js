const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

let adminCookies, doctorCookies, patientId, doctorId;

function futureDate(daysAhead = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

async function setupOrg() {
  const adminRes = await request(app).post('/api/auth/register').send({
    clinic_name: 'Clinique Facture',
    email: 'admin-facture@test.ci',
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'Facture',
  });
  adminCookies = adminRes.headers['set-cookie'];

  await request(app).post('/api/users').set('Cookie', adminCookies).send({
    email: 'doctor-facture@test.ci',
    password: 'Password123!',
    first_name: 'Dr',
    last_name: 'Yao',
    role: 'doctor',
  });

  const docLogin = await request(app).post('/api/auth/login').send({
    email: 'doctor-facture@test.ci',
    password: 'Password123!',
  });
  doctorCookies = docLogin.headers['set-cookie'];

  const users = await request(app).get('/api/users').set('Cookie', adminCookies);
  const doc = users.body.find(u => u.role === 'doctor');
  doctorId = doc.id;

  const patRes = await request(app).post('/api/patients').set('Cookie', adminCookies).send({
    first_name: 'Awa',
    last_name: 'Konaté',
    date_of_birth: '1995-11-30',
  });
  patientId = patRes.body.id;
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
  await db('invoices').del();
  await db('prescriptions').del();
  await db('consultations').del();
  await db('appointments').del();
  await db('patients').del();
  await db('users').del();
  await db('organizations').del();
  await setupOrg();
});

describe('GET /api/invoices', () => {
  it('retourne la liste des factures (admin)', async () => {
    const res = await request(app).get('/api/invoices').set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filtre par statut', async () => {
    await request(app).post('/api/invoices').set('Cookie', adminCookies).send({
      patient_id: patientId,
      amount: 15000,
    });
    const res = await request(app)
      .get('/api/invoices?status=pending')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.every(i => i.status === 'pending')).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/invoices');
    expect(res.status).toBe(401);
  });

  it('autorise le médecin (200)', async () => {
    const res = await request(app).get('/api/invoices').set('Cookie', doctorCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/invoices', () => {
  it('crée une facture (admin)', async () => {
    const res = await request(app).post('/api/invoices').set('Cookie', adminCookies).send({
      patient_id: patientId,
      amount: 25000,
      notes: 'Consultation générale',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('pending');
    expect(Number(res.body.amount)).toBe(25000);
  });

  it('refuse si le patient n\'existe pas', async () => {
    const res = await request(app).post('/api/invoices').set('Cookie', adminCookies).send({
      patient_id: '00000000-0000-0000-0000-000000000000',
      amount: 10000,
    });
    expect(res.status).toBe(404);
  });

  it('refuse sans montant', async () => {
    const res = await request(app).post('/api/invoices').set('Cookie', adminCookies).send({
      patient_id: patientId,
    });
    expect(res.status).toBe(400);
  });

  it('refuse montant négatif', async () => {
    const res = await request(app).post('/api/invoices').set('Cookie', adminCookies).send({
      patient_id: patientId,
      amount: -500,
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/invoices/:id', () => {
  let invoiceId;

  beforeEach(async () => {
    const res = await request(app).post('/api/invoices').set('Cookie', adminCookies).send({
      patient_id: patientId,
      amount: 12000,
    });
    invoiceId = res.body.id;
  });

  it('retourne une facture par ID', async () => {
    const res = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(invoiceId);
    expect(Number(res.body.amount)).toBe(12000);
  });

  it('retourne 404 pour une facture inexistante', async () => {
    const res = await request(app)
      .get('/api/invoices/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/invoices/:id/pay', () => {
  let invoiceId;

  beforeEach(async () => {
    const res = await request(app).post('/api/invoices').set('Cookie', adminCookies).send({
      patient_id: patientId,
      amount: 20000,
    });
    invoiceId = res.body.id;
  });

  it('marque une facture comme payée (cash)', async () => {
    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/pay`)
      .set('Cookie', adminCookies)
      .send({ payment_method: 'cash' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
    expect(res.body.payment_method).toBe('cash');
    expect(res.body.paid_at).toBeTruthy();
  });

  it('marque une facture comme payée (wave)', async () => {
    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/pay`)
      .set('Cookie', adminCookies)
      .send({ payment_method: 'wave' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
  });

  it('refuse un moyen de paiement invalide', async () => {
    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/pay`)
      .set('Cookie', adminCookies)
      .send({ payment_method: 'bitcoin' });
    expect(res.status).toBe(400);
  });

  it('refuse de payer une facture déjà payée (409)', async () => {
    await request(app)
      .patch(`/api/invoices/${invoiceId}/pay`)
      .set('Cookie', adminCookies)
      .send({ payment_method: 'cash' });

    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/pay`)
      .set('Cookie', adminCookies)
      .send({ payment_method: 'cash' });
    expect(res.status).toBe(409);
  });

  it('retourne 404 pour une facture inexistante', async () => {
    const res = await request(app)
      .patch('/api/invoices/00000000-0000-0000-0000-000000000000/pay')
      .set('Cookie', adminCookies)
      .send({ payment_method: 'cash' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/invoices/:id/cancel', () => {
  let invoiceId;

  beforeEach(async () => {
    const res = await request(app).post('/api/invoices').set('Cookie', adminCookies).send({
      patient_id: patientId,
      amount: 8000,
    });
    invoiceId = res.body.id;
  });

  it('annule une facture en attente', async () => {
    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/cancel`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('refuse d\'annuler une facture déjà annulée (409)', async () => {
    await request(app)
      .patch(`/api/invoices/${invoiceId}/cancel`)
      .set('Cookie', adminCookies);

    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/cancel`)
      .set('Cookie', adminCookies);
    expect(res.status).toBe(409);
  });

  it('retourne 404 pour une facture inexistante', async () => {
    const res = await request(app)
      .patch('/api/invoices/00000000-0000-0000-0000-000000000000/cancel')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(404);
  });
});
