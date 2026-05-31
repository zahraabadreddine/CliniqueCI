/**
 * Tests — /api/notifications
 * Couvre : compteur non-lus, liste, marquer comme lu, push subscribe
 */
const request = require('supertest');
const app     = require('../src/app');
const db      = require('../src/lib/db');

// ── Helpers ──────────────────────────────────────────────────────────────────
async function registerAndLogin(clinicName, email) {
  const res = await request(app).post('/api/auth/register').send({
    clinic_name: clinicName,
    email,
    password:    'Password123!',
    first_name:  'Admin',
    last_name:   'Test',
  });
  return res.headers['set-cookie'];
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
});

beforeEach(async () => {
  await db('refresh_tokens').del();
  await db('push_subscriptions').del();
  await db('notifications').del();
  await db('invoices').del();
  await db('prescriptions').del();
  await db('consultations').del();
  await db('appointments').del();
  await db('patients').del();
  await db('users').del();
  await db('organizations').del();
});

// ── GET /api/notifications/vapid-public-key ───────────────────────────────────
describe('GET /api/notifications/vapid-public-key', () => {
  it('retourne la clé VAPID publique', async () => {
    const cookies = await registerAndLogin('Clinique Notif VAPID', 'admin-vapid@test.ci');
    const res = await request(app)
      .get('/api/notifications/vapid-public-key')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('publicKey');
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/notifications/vapid-public-key');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/notifications/unread-count ──────────────────────────────────────
describe('GET /api/notifications/unread-count', () => {
  it('retourne 0 si pas de notifications non lues', async () => {
    const cookies = await registerAndLogin('Clinique Notif Count', 'admin-notif-count@test.ci');
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/notifications ────────────────────────────────────────────────────
describe('GET /api/notifications', () => {
  it('retourne la liste paginée (vide)', async () => {
    const cookies = await registerAndLogin('Clinique Notif List', 'admin-notif-list@test.ci');
    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body.total).toBe(0);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
describe('PATCH /api/notifications/read-all', () => {
  it('marque toutes les notifications comme lues', async () => {
    const cookies = await registerAndLogin('Clinique Read All', 'admin-read-all@test.ci');
    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app).patch('/api/notifications/read-all');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
describe('PATCH /api/notifications/:id/read', () => {
  let cookies, userId, orgId;

  beforeEach(async () => {
    cookies = await registerAndLogin('Clinique Read One', 'admin-read-one@test.ci');
    const org  = await db('organizations').first();
    const user = await db('users').first();
    orgId  = org.id;
    userId = user.id;
  });

  it('retourne 404 pour une notification inexistante', async () => {
    const res = await request(app)
      .patch('/api/notifications/00000000-0000-0000-0000-000000000000/read')
      .set('Cookie', cookies);

    expect(res.status).toBe(404);
  });

  it('marque une notification existante comme lue', async () => {
    // Insérer directement une notification en base
    const [notif] = await db('notifications')
      .insert({
        organization_id: orgId,
        user_id:         userId,
        type:            'info',
        title:           'Test',
        body:            'Notification de test',
        is_read:         false,
      })
      .returning(['id']);

    const res = await request(app)
      .patch(`/api/notifications/${notif.id}/read`)
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── POST /api/notifications/push-subscribe ────────────────────────────────────
describe('POST /api/notifications/push-subscribe', () => {
  let cookies;

  beforeEach(async () => {
    cookies = await registerAndLogin('Clinique Push Sub', 'admin-push@test.ci');
  });

  it('enregistre une subscription push valide', async () => {
    const res = await request(app)
      .post('/api/notifications/push-subscribe')
      .set('Cookie', cookies)
      .send({
        endpoint: 'https://push.example.com/test-endpoint',
        keys: { p256dh: 'dummyP256dhKey==', auth: 'dummyAuthKey==' },
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('refuse si l\'endpoint est manquant', async () => {
    const res = await request(app)
      .post('/api/notifications/push-subscribe')
      .set('Cookie', cookies)
      .send({ keys: { p256dh: 'key', auth: 'auth' } });

    expect(res.status).toBe(400);
  });

  it('refuse si les keys sont incomplètes', async () => {
    const res = await request(app)
      .post('/api/notifications/push-subscribe')
      .set('Cookie', cookies)
      .send({ endpoint: 'https://push.example.com/x', keys: { p256dh: 'key' } });

    expect(res.status).toBe(400);
  });

  it('retourne 401 sans authentification', async () => {
    const res = await request(app)
      .post('/api/notifications/push-subscribe')
      .send({ endpoint: 'https://x.com', keys: { p256dh: 'k', auth: 'a' } });

    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/notifications/push-subscribe ──────────────────────────────────
describe('DELETE /api/notifications/push-subscribe', () => {
  let cookies;

  beforeEach(async () => {
    cookies = await registerAndLogin('Clinique Push Del', 'admin-push-del@test.ci');
  });

  it('supprime une subscription (endpoint inexistant = ok)', async () => {
    const res = await request(app)
      .delete('/api/notifications/push-subscribe')
      .set('Cookie', cookies)
      .send({ endpoint: 'https://push.example.com/nonexistent' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('refuse si l\'endpoint est manquant', async () => {
    const res = await request(app)
      .delete('/api/notifications/push-subscribe')
      .set('Cookie', cookies)
      .send({});

    expect(res.status).toBe(400);
  });
});
