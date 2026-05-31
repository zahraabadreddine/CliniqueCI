const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema, paySchema } = require('../validators/invoices');

module.exports = function invoicesRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  // ── GET / ─────────────────────────────────────────────────────────────────────
  // Retourne toutes les factures avec noms patient + secrétaire encaisseuse + admin validateur
  router.get('/', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const { status } = req.query;

      let query = db('invoices')
        .where('invoices.organization_id', req.orgId)
        .join('patients', 'invoices.patient_id', 'patients.id')
        .leftJoin('users as collector', 'invoices.collected_by_id', 'collector.id')
        .leftJoin('users as validator', 'invoices.validated_by_id', 'validator.id')
        .select(
          'invoices.id',
          'invoices.amount',
          'invoices.currency',
          'invoices.status',
          'invoices.payment_method',
          'invoices.notes',
          'invoices.paid_at',
          'invoices.collected_at',
          'invoices.created_at',
          'invoices.consultation_id',
          'invoices.appointment_id',
          'patients.id as patient_id',
          'patients.first_name as patient_first_name',
          'patients.last_name as patient_last_name',
          'collector.id as collected_by_id',
          'collector.first_name as collected_by_first_name',
          'collector.last_name as collected_by_last_name',
          'validator.id as validated_by_id',
          'validator.first_name as validated_by_first_name',
          'validator.last_name as validated_by_last_name'
        )
        .orderBy('invoices.created_at', 'desc');

      if (status) query = query.where('invoices.status', status);

      res.json(await query);
    } catch (err) {
      next(err);
    }
  });

  // ── POST / ────────────────────────────────────────────────────────────────────
  router.post('/', authorize('secretary', 'admin'), async (req, res, next) => {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const patient = await db('patients')
        .where({ id: value.patient_id, organization_id: req.orgId })
        .first();
      if (!patient) return res.status(404).json({ error: 'Patient introuvable' });

      const [invoice] = await db('invoices')
        .insert({
          patient_id: value.patient_id,
          consultation_id: value.consultation_id || null,
          appointment_id: value.appointment_id || null,
          amount: value.amount,
          notes: value.notes || null,
          organization_id: req.orgId,
        })
        .returning([
          'id', 'patient_id', 'amount', 'currency', 'status',
          'payment_method', 'notes', 'paid_at', 'collected_at', 'created_at',
        ]);

      res.status(201).json(invoice);
    } catch (err) {
      next(err);
    }
  });

  // ── GET /my-stats ─────────────────────────────────────────────────────────────
  router.get('/my-stats', authorize('doctor'), async (req, res, next) => {
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday  = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const paidBase = () =>
        db('invoices')
          .join('consultations', 'invoices.consultation_id', 'consultations.id')
          .where('invoices.organization_id', req.orgId)
          .where('consultations.doctor_id', req.user.id)
          .where('invoices.status', 'paid');

      const monthly = await paidBase()
        .where('invoices.paid_at', '>=', sixMonthsAgo)
        .select(
          db.raw("TO_CHAR(DATE_TRUNC('month', invoices.paid_at), 'YYYY-MM') as month"),
          db.raw('SUM(invoices.amount)::integer as revenue'),
          db.raw('COUNT(*)::integer as count')
        )
        .groupByRaw("DATE_TRUNC('month', invoices.paid_at)")
        .orderByRaw("DATE_TRUNC('month', invoices.paid_at) ASC");

      const monthRow = await paidBase()
        .where('invoices.paid_at', '>=', startOfMonth)
        .select(db.raw('COALESCE(SUM(invoices.amount), 0)::integer as total'))
        .first();
      const month_revenue = Number(monthRow?.total ?? 0);

      const todayRow = await paidBase()
        .where('invoices.paid_at', '>=', startOfToday)
        .select(db.raw('COALESCE(SUM(invoices.amount), 0)::integer as total'))
        .first();
      const today_revenue = Number(todayRow?.total ?? 0);

      const pendingAgg = await db('invoices')
        .join('consultations', 'invoices.consultation_id', 'consultations.id')
        .where('invoices.organization_id', req.orgId)
        .where('consultations.doctor_id', req.user.id)
        .whereIn('invoices.status', ['pending', 'collected'])
        .select(
          db.raw('COUNT(*)::integer as count'),
          db.raw('COALESCE(SUM(invoices.amount), 0)::integer as amount')
        )
        .first();

      const pending = pendingAgg || { count: 0, amount: 0 };

      res.json({
        monthly,
        pending,
        today_revenue,
        month_revenue,
        unpaid_count: Number(pending.count),
      });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /admin-stats ─────────────────────────────────────────────────────────
  router.get('/admin-stats', authorize('admin'), async (req, res, next) => {
    try {
      const now            = new Date();
      const sixMonthsAgo   = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMo  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMo    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const startOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // ── Monthly revenue (paid, 6 months) ────────────────────────────────────
      const monthly = await db('invoices')
        .where('organization_id', req.orgId)
        .where('status', 'paid')
        .where('paid_at', '>=', sixMonthsAgo)
        .select(
          db.raw("TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') as month"),
          db.raw('SUM(amount)::integer as revenue'),
          db.raw('COUNT(*)::integer as count')
        )
        .groupByRaw("DATE_TRUNC('month', paid_at)")
        .orderByRaw("DATE_TRUNC('month', paid_at) ASC");

      // ── This month ──────────────────────────────────────────────────────────
      const thisMonthRow = await db('invoices')
        .where({ organization_id: req.orgId, status: 'paid' })
        .where('paid_at', '>=', startOfMonth)
        .select(
          db.raw('COALESCE(SUM(amount), 0)::integer as total'),
          db.raw('COUNT(*)::integer as count')
        )
        .first();

      // ── Last month ──────────────────────────────────────────────────────────
      const lastMonthRow = await db('invoices')
        .where({ organization_id: req.orgId, status: 'paid' })
        .whereBetween('paid_at', [startOfLastMo, endOfLastMo])
        .select(db.raw('COALESCE(SUM(amount), 0)::integer as total'))
        .first();

      // ── Today ───────────────────────────────────────────────────────────────
      const todayRow = await db('invoices')
        .where({ organization_id: req.orgId, status: 'paid' })
        .where('paid_at', '>=', startOfToday)
        .select(db.raw('COALESCE(SUM(amount), 0)::integer as total'))
        .first();

      // ── Pending validation (collected) ───────────────────────────────────────
      const pendingRow = await db('invoices')
        .where({ organization_id: req.orgId, status: 'collected' })
        .select(
          db.raw('COALESCE(SUM(amount), 0)::integer as amount'),
          db.raw('COUNT(*)::integer as count')
        )
        .first();

      // ── Payment method breakdown (paid, 6 months) ───────────────────────────
      const byMethod = await db('invoices')
        .where('organization_id', req.orgId)
        .where('status', 'paid')
        .where('paid_at', '>=', sixMonthsAgo)
        .select(
          db.raw("COALESCE(payment_method, 'cash') as method"),
          db.raw('COUNT(*)::integer as count'),
          db.raw('SUM(amount)::integer as total')
        )
        .groupBy(db.raw("COALESCE(payment_method, 'cash')"))
        .orderBy('total', 'desc');

      // ── Top doctors by revenue (paid, 6 months, via consultations) ──────────
      const byDoctor = await db('invoices')
        .join('consultations', 'invoices.consultation_id', 'consultations.id')
        .join('users', 'consultations.doctor_id', 'users.id')
        .where('invoices.organization_id', req.orgId)
        .where('invoices.status', 'paid')
        .where('invoices.paid_at', '>=', sixMonthsAgo)
        .select(
          'users.id as doctor_id',
          'users.first_name',
          'users.last_name',
          db.raw('COUNT(*)::integer as count'),
          db.raw('SUM(invoices.amount)::integer as total')
        )
        .groupBy('users.id', 'users.first_name', 'users.last_name')
        .orderBy('total', 'desc')
        .limit(5);

      res.json({
        monthly,
        this_month:  { revenue: Number(thisMonthRow?.total ?? 0), count: Number(thisMonthRow?.count ?? 0) },
        last_month:  { revenue: Number(lastMonthRow?.total ?? 0) },
        today:       { revenue: Number(todayRow?.total ?? 0) },
        pending:     { amount: Number(pendingRow?.amount ?? 0), count: Number(pendingRow?.count ?? 0) },
        by_method:   byMethod,
        by_doctor:   byDoctor,
      });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /:id ──────────────────────────────────────────────────────────────────
  router.get('/:id', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const invoice = await db('invoices')
        .where({ 'invoices.id': req.params.id, 'invoices.organization_id': req.orgId })
        .join('patients', 'invoices.patient_id', 'patients.id')
        .leftJoin('users as collector', 'invoices.collected_by_id', 'collector.id')
        .leftJoin('users as validator', 'invoices.validated_by_id', 'validator.id')
        .select(
          'invoices.id', 'invoices.patient_id', 'invoices.consultation_id', 'invoices.appointment_id',
          'invoices.amount', 'invoices.currency', 'invoices.status', 'invoices.payment_method',
          'invoices.notes', 'invoices.paid_at', 'invoices.collected_at', 'invoices.created_at',
          'patients.first_name as patient_first_name', 'patients.last_name as patient_last_name',
          'collector.first_name as collected_by_first_name', 'collector.last_name as collected_by_last_name',
          'validator.first_name as validated_by_first_name', 'validator.last_name as validated_by_last_name'
        )
        .first();

      if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });

      if (req.user.role === 'patient') {
        const ownPatient = await db('patients')
          .where({ id: invoice.patient_id, user_id: req.user.id })
          .first();
        if (!ownPatient) return res.status(403).json({ error: 'Accès refusé' });
      }

      res.json(invoice);
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /:id/pay
   * Admin : pending → paid (directement, avec paid_at)
   * Secrétaire : pending → collected (encaissement, validation admin requise)
   */
  router.patch('/:id/pay', authorize('secretary', 'admin'), async (req, res, next) => {
    try {
      const { error, value } = paySchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const invoice = await db('invoices')
        .where({ id: req.params.id, organization_id: req.orgId })
        .first();
      if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });
      if (invoice.status !== 'pending') {
        return res.status(409).json({ error: 'Cette facture ne peut plus être modifiée' });
      }

      const isAdmin = req.user.role === 'admin';
      const updateFields = isAdmin
        ? {
            status:          'paid',
            payment_method:  value.payment_method,
            validated_by_id: req.user.id,
            paid_at:         new Date(),
            updated_at:      new Date(),
          }
        : {
            status:          'collected',
            payment_method:  value.payment_method,
            collected_by_id: req.user.id,
            collected_at:    new Date(),
            updated_at:      new Date(),
          };

      const [updated] = await db('invoices')
        .where({ id: req.params.id })
        .update(updateFields)
        .returning([
          'id', 'amount', 'currency', 'status', 'payment_method',
          'paid_at', 'collected_at', 'created_at',
        ]);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /:id/validate
   * Admin valide un encaissement : collected → paid
   * Enregistre l'admin validateur et la date de paiement officielle.
   */
  router.patch('/:id/validate', authorize('admin'), async (req, res, next) => {
    try {
      const invoice = await db('invoices')
        .where({ id: req.params.id, organization_id: req.orgId })
        .first();
      if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });
      if (invoice.status !== 'collected') {
        return res.status(409).json({
          error: `Impossible de valider : statut actuel "${invoice.status}" (attendu : "collected")`,
        });
      }

      const [updated] = await db('invoices')
        .where({ id: req.params.id })
        .update({
          status:           'paid',
          validated_by_id:  req.user.id,
          paid_at:          new Date(),
          updated_at:       new Date(),
        })
        .returning([
          'id', 'amount', 'currency', 'status', 'payment_method',
          'paid_at', 'collected_at', 'created_at',
        ]);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /:id/cancel
   * Admin ou secrétaire peut annuler une facture pending ou collected.
   */
  router.patch('/:id/cancel', authorize('admin', 'secretary'), async (req, res, next) => {
    try {
      const invoice = await db('invoices')
        .where({ id: req.params.id, organization_id: req.orgId })
        .first();
      if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });
      if (!['pending', 'collected'].includes(invoice.status)) {
        return res.status(409).json({ error: 'Cette facture ne peut plus être modifiée' });
      }

      const [updated] = await db('invoices')
        .where({ id: req.params.id })
        .update({ status: 'cancelled', updated_at: new Date() })
        .returning(['id', 'amount', 'currency', 'status', 'payment_method', 'paid_at', 'created_at']);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
