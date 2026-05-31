const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');
const authorize = require('../middleware/authorize');

module.exports = function stockRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  // ── GET all stock items ───────────────────────────────────────────────
  router.get('/', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const { category, lowStock } = req.query;
      let query = db('stock_items')
        .where('organization_id', req.orgId)
        .select('id', 'name', 'category', 'unit', 'quantity', 'min_quantity', 'unit_price', 'supplier', 'created_at', 'updated_at')
        .orderBy('name');

      if (category) query = query.where('category', category);
      if (lowStock === 'true') query = query.whereRaw('quantity <= min_quantity');

      const items = await query;
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // ── GET single stock item with movement history ───────────────────────
  router.get('/:id', authorize('admin', 'doctor', 'secretary'), async (req, res, next) => {
    try {
      const item = await db('stock_items')
        .where({ id: req.params.id, organization_id: req.orgId })
        .select('id', 'name', 'category', 'unit', 'quantity', 'min_quantity', 'unit_price', 'supplier', 'created_at')
        .first();

      if (!item) return res.status(404).json({ error: 'Article introuvable' });

      const movements = await db('stock_movements')
        .where({ stock_item_id: item.id, organization_id: req.orgId })
        .leftJoin('users', 'stock_movements.actor_id', 'users.id')
        .select(
          'stock_movements.id', 'stock_movements.type', 'stock_movements.quantity',
          'stock_movements.reason', 'stock_movements.created_at',
          db.raw("users.first_name || ' ' || users.last_name as actor_name")
        )
        .orderBy('stock_movements.created_at', 'desc')
        .limit(50);

      res.json({ ...item, movements });
    } catch (err) {
      next(err);
    }
  });

  // ── POST create stock item ────────────────────────────────────────────
  router.post('/', authorize('admin'), async (req, res, next) => {
    try {
      const { name, category, unit, quantity, min_quantity, unit_price, supplier } = req.body;
      if (!name) return res.status(400).json({ error: 'Le nom est requis' });

      const [item] = await db('stock_items')
        .insert({
          organization_id: req.orgId,
          name,
          category: category || 'medicament',
          unit: unit || 'unité',
          quantity: Number(quantity) || 0,
          min_quantity: Number(min_quantity) || 5,
          unit_price: unit_price ? Number(unit_price) : null,
          supplier: supplier || null,
        })
        .returning(['id', 'name', 'category', 'unit', 'quantity', 'min_quantity', 'unit_price', 'supplier', 'created_at']);

      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  });

  // ── PATCH update stock item ───────────────────────────────────────────
  router.patch('/:id', authorize('admin'), async (req, res, next) => {
    try {
      const item = await db('stock_items').where({ id: req.params.id, organization_id: req.orgId }).first();
      if (!item) return res.status(404).json({ error: 'Article introuvable' });

      const { name, category, unit, min_quantity, unit_price, supplier } = req.body;
      const [updated] = await db('stock_items')
        .where({ id: req.params.id, organization_id: req.orgId })
        .update({
          ...(name && { name }),
          ...(category && { category }),
          ...(unit && { unit }),
          ...(min_quantity !== undefined && { min_quantity: Number(min_quantity) }),
          ...(unit_price !== undefined && { unit_price: unit_price ? Number(unit_price) : null }),
          ...(supplier !== undefined && { supplier }),
          updated_at: db.fn.now(),
        })
        .returning(['id', 'name', 'category', 'unit', 'quantity', 'min_quantity', 'unit_price', 'supplier', 'updated_at']);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // ── POST movement (in / out / adjustment) ────────────────────────────
  router.post('/:id/movements', authorize('admin', 'secretary'), async (req, res, next) => {
    try {
      const { type, quantity, reason } = req.body;
      if (!type || !['in', 'out', 'adjustment'].includes(type)) {
        return res.status(400).json({ error: 'Type invalide (in|out|adjustment)' });
      }
      if (!quantity || isNaN(Number(quantity))) {
        return res.status(400).json({ error: 'Quantité invalide' });
      }

      const trx = await db.transaction();
      try {
        const item = await trx('stock_items').where({ id: req.params.id, organization_id: req.orgId }).first();
        if (!item) { await trx.rollback(); return res.status(404).json({ error: 'Article introuvable' }); }

        const qty = Number(quantity);
        let newQty = item.quantity;
        if (type === 'in') newQty += qty;
        else if (type === 'out') newQty = Math.max(0, newQty - qty);
        else newQty = qty; // adjustment = set absolute value

        await trx('stock_items').where({ id: item.id }).update({ quantity: newQty, updated_at: trx.fn.now() });

        const [movement] = await trx('stock_movements')
          .insert({
            organization_id: req.orgId,
            stock_item_id: item.id,
            actor_id: req.user.id,
            type,
            quantity: qty,
            reason: reason || null,
          })
          .returning(['id', 'type', 'quantity', 'reason', 'created_at']);

        await trx.commit();
        res.status(201).json({ movement, new_quantity: newQty });
      } catch (e) {
        await trx.rollback();
        throw e;
      }
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE stock item ─────────────────────────────────────────────────
  router.delete('/:id', authorize('admin'), async (req, res, next) => {
    try {
      const deleted = await db('stock_items').where({ id: req.params.id, organization_id: req.orgId }).delete();
      if (!deleted) return res.status(404).json({ error: 'Article introuvable' });
      res.json({ message: 'Article supprimé' });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
