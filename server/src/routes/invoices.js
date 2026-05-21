const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');
const { createSchema, paySchema } = require('../validators/invoices');

module.exports = function invoicesRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.get('/', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const { status } = req.query;
      let query = db('invoices')
        .where('invoices.organization_id', req.orgId)
        .join('patients', 'invoices.patient_id', 'patients.id')
        .select(
          'invoices.id', 'invoices.amount', 'invoices.currency', 'invoices.status',
          'invoices.payment_method', 'invoices.notes', 'invoices.paid_at', 'invoices.created_at',
          'invoices.consultation_id', 'invoices.appointment_id',
          'patients.first_name as patient_first_name', 'patients.last_name as patient_last_name'
        )
        .orderBy('invoices.created_at', 'desc');

      if (status) query = query.where('invoices.status', status);

      res.json(await query);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authorize('admin', 'secretary'), async (req, res, next) => {
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
        .returning(['id', 'patient_id', 'amount', 'currency', 'status', 'payment_method', 'notes', 'paid_at', 'created_at']);

      res.status(201).json(invoice);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', authorize('admin', 'doctor', 'secretary', 'patient'), async (req, res, next) => {
    try {
      const invoice = await db('invoices')
        .where({ 'invoices.id': req.params.id, 'invoices.organization_id': req.orgId })
        .join('patients', 'invoices.patient_id', 'patients.id')
        .select(
          'invoices.id', 'invoices.patient_id', 'invoices.consultation_id', 'invoices.appointment_id',
          'invoices.amount', 'invoices.currency', 'invoices.status', 'invoices.payment_method',
          'invoices.notes', 'invoices.paid_at', 'invoices.created_at',
          'patients.first_name as patient_first_name', 'patients.last_name as patient_last_name'
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

  router.patch('/:id/pay', authorize('admin', 'secretary'), async (req, res, next) => {
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

      const [updated] = await db('invoices')
        .where({ id: req.params.id })
        .update({
          status: 'paid',
          payment_method: value.payment_method,
          paid_at: new Date(),
          updated_at: new Date(),
        })
        .returning(['id', 'amount', 'currency', 'status', 'payment_method', 'paid_at', 'created_at']);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id/cancel', authorize('admin', 'secretary'), async (req, res, next) => {
    try {
      const invoice = await db('invoices')
        .where({ id: req.params.id, organization_id: req.orgId })
        .first();
      if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });
      if (invoice.status !== 'pending') {
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
