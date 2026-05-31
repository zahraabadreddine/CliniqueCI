const request = require('supertest');
const app = require('../src/app');
const db = require('../src/lib/db');

let orgACookies, orgBCookies;
let orgAPatientId, orgADoctorId;
let orgAAppointmentId, orgAConsultationId, orgAPrescriptionId, orgAInvoiceId;

beforeAll(async () => {
  await db.migrate.latest();
  await db('refresh_tokens').del();
  await db('invoices').del();
  await db('prescriptions').del();
  await db('consultations').del();
  await db('appointments').del();
  await db('patients').del();
  await db('users').del();
  await db('organizations').del();

  // ── Org A setup ──────────────────────────────────────────
  const resA = await request(app).post('/api/auth/register').send({
    clinic_name: 'Clinique A',
    email: 'admin@org-a.ci',
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'OrgA',
  });
  orgACookies = resA.headers['set-cookie'];

  // Create a doctor in Org A
  await request(app).post('/api/users').set('Cookie', orgACookies).send({
    email: 'doctor@org-a.ci',
    password: 'Password123!',
    first_name: 'Dr',
    last_name: 'OrgA',
    role: 'doctor',
  });
  const doctorList = await request(app).get('/api/users').set('Cookie', orgACookies);
  orgADoctorId = doctorList.body.find(u => u.role === 'doctor').id;

  // Create a patient in Org A
  const patRes = await request(app)
    .post('/api/patients')
    .set('Cookie', orgACookies)
    .send({ first_name: 'Patient', last_name: 'OrgA', date_of_birth: '1990-01-01' });
  orgAPatientId = patRes.body.id;

  // Create an appointment in Org A
  const apptRes = await request(app)
    .post('/api/appointments')
    .set('Cookie', orgACookies)
    .send({
      patient_id: orgAPatientId,
      doctor_id: orgADoctorId,
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      reason: 'Consultation test',
    });
  orgAAppointmentId = apptRes.body.id;

  // Log in as doctor to create consultation + prescription
  const doctorLogin = await request(app).post('/api/auth/login').send({
    email: 'doctor@org-a.ci',
    password: 'Password123!',
  });
  const orgADoctorCookies = doctorLogin.headers['set-cookie'];

  const consultRes = await request(app)
    .post('/api/consultations')
    .set('Cookie', orgADoctorCookies)
    .send({
      appointment_id: orgAAppointmentId,
      patient_id: orgAPatientId,
      chief_complaint: 'Fièvre',
      diagnosis: 'Paludisme',
    });
  orgAConsultationId = consultRes.body.id;

  const rxRes = await request(app)
    .post('/api/prescriptions')
    .set('Cookie', orgADoctorCookies)
    .send({
      consultation_id: orgAConsultationId,
      patient_id: orgAPatientId,
      medications: [{ name: 'Paracétamol', dosage: '500mg', frequency: '3×/jour', duration: '5 jours' }],
    });
  orgAPrescriptionId = rxRes.body.id;

  // Create an invoice in Org A
  const invRes = await request(app)
    .post('/api/invoices')
    .set('Cookie', orgACookies)
    .send({ patient_id: orgAPatientId, amount: 15000 });
  orgAInvoiceId = invRes.body.id;

  // ── Org B setup ──────────────────────────────────────────
  const resB = await request(app).post('/api/auth/register').send({
    clinic_name: 'Clinique B',
    email: 'admin@org-b.ci',
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'OrgB',
  });
  orgBCookies = resB.headers['set-cookie'];
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
});

// ─────────────────────────────────────────────────────────────
// Patients
// ─────────────────────────────────────────────────────────────
describe('Isolation multi-tenant — patients', () => {
  it('Org B ne peut pas lire les patients de Org A', async () => {
    const res = await request(app)
      .get(`/api/patients/${orgAPatientId}`)
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(404);
  });

  it('Org A peut lire ses propres patients', async () => {
    const res = await request(app)
      .get(`/api/patients/${orgAPatientId}`)
      .set('Cookie', orgACookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orgAPatientId);
  });

  it('Org B ne voit pas les patients de Org A dans la liste', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(200);
    const ids = res.body.map((p) => p.id);
    expect(ids).not.toContain(orgAPatientId);
  });
});

// ─────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────
describe('Isolation multi-tenant — appointments', () => {
  it('Org B ne peut pas lire le RDV de Org A par son ID', async () => {
    const res = await request(app)
      .get(`/api/appointments/${orgAAppointmentId}`)
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(404);
  });

  it('Org A peut lire son propre RDV par ID', async () => {
    const res = await request(app)
      .get(`/api/appointments/${orgAAppointmentId}`)
      .set('Cookie', orgACookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orgAAppointmentId);
  });

  it('Org B ne voit pas les RDV de Org A dans la liste', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(200);
    const ids = res.body.map((a) => a.id);
    expect(ids).not.toContain(orgAAppointmentId);
  });

  it('Org B ne peut pas modifier le statut du RDV de Org A', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${orgAAppointmentId}/status`)
      .set('Cookie', orgBCookies)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
// Consultations
// ─────────────────────────────────────────────────────────────
describe('Isolation multi-tenant — consultations', () => {
  it('Org B ne peut pas lire la consultation de Org A par ID', async () => {
    const res = await request(app)
      .get(`/api/consultations/${orgAConsultationId}`)
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(404);
  });

  it('Org A peut lire sa propre consultation par ID', async () => {
    const res = await request(app)
      .get(`/api/consultations/${orgAConsultationId}`)
      .set('Cookie', orgACookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orgAConsultationId);
  });

  it('Org B ne voit pas les consultations de Org A dans la liste', async () => {
    const res = await request(app)
      .get('/api/consultations')
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(200);
    const ids = res.body.map((c) => c.id);
    expect(ids).not.toContain(orgAConsultationId);
  });
});

// ─────────────────────────────────────────────────────────────
// Prescriptions
// ─────────────────────────────────────────────────────────────
describe('Isolation multi-tenant — prescriptions', () => {
  it('Org B ne peut pas lire l\'ordonnance de Org A par ID', async () => {
    const res = await request(app)
      .get(`/api/prescriptions/${orgAPrescriptionId}`)
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(404);
  });

  it('Org A peut lire sa propre ordonnance par ID', async () => {
    const res = await request(app)
      .get(`/api/prescriptions/${orgAPrescriptionId}`)
      .set('Cookie', orgACookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orgAPrescriptionId);
  });

  it('Org B ne voit pas les ordonnances de Org A dans la liste', async () => {
    const res = await request(app)
      .get('/api/prescriptions')
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(200);
    const ids = res.body.map((p) => p.id);
    expect(ids).not.toContain(orgAPrescriptionId);
  });
});

// ─────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────
describe('Isolation multi-tenant — factures', () => {
  it('Org B ne peut pas lire la facture de Org A par ID', async () => {
    const res = await request(app)
      .get(`/api/invoices/${orgAInvoiceId}`)
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(404);
  });

  it('Org A peut lire sa propre facture par ID', async () => {
    const res = await request(app)
      .get(`/api/invoices/${orgAInvoiceId}`)
      .set('Cookie', orgACookies);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orgAInvoiceId);
  });

  it('Org B ne voit pas les factures de Org A dans la liste', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Cookie', orgBCookies);
    expect(res.status).toBe(200);
    const ids = res.body.map((i) => i.id);
    expect(ids).not.toContain(orgAInvoiceId);
  });

  it('Org B ne peut pas payer la facture de Org A', async () => {
    const res = await request(app)
      .patch(`/api/invoices/${orgAInvoiceId}/pay`)
      .set('Cookie', orgBCookies)
      .send({ payment_method: 'cash' });
    expect(res.status).toBe(404);
  });
});
