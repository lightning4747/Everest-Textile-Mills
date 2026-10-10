/**
 * Yarn routes — stub.
 * Person A owns this module.
 * Implements: GET /stock, GET /stock/alerts, PATCH /stock/:id,
 *             GET /receipts, POST /receipts, GET /suppliers, POST /suppliers
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok } from '../lib/response.js';

const router = Router();
router.use(authenticate);

/** GET /api/v1/yarn/stock */
router.get('/stock', (_req, res) => {
  // TODO (Person A): list all yarn stock with calculated low-stock alerts
  ok(res, { _stub: true, message: 'Yarn stock list — not yet implemented' });
});

/** GET /api/v1/yarn/stock/alerts */
router.get('/stock/alerts', (_req, res) => {
  // TODO (Person A): return only low/critical items with supplier info
  ok(res, { _stub: true, message: 'Yarn low stock alerts — not yet implemented' });
});

/** PATCH /api/v1/yarn/stock/:id */
router.patch('/stock/:id', authorize('admin', 'manager'), (_req, res) => {
  // TODO (Person A): update yarn stock quantity/location/reorderLevel
  ok(res, { _stub: true, message: 'Update yarn stock — not yet implemented' });
});

/** GET /api/v1/yarn/receipts */
router.get('/receipts', (_req, res) => {
  // TODO (Person A): list yarn receipts
  ok(res, { _stub: true, message: 'Yarn receipts list — not yet implemented' });
});

/** POST /api/v1/yarn/receipts */
router.post('/receipts', authorize('admin', 'manager', 'operator'), (_req, res) => {
  // TODO (Person A): record receipt and update yarn_stock quantity in a transaction
  ok(res, { _stub: true, message: 'Record yarn receipt — not yet implemented' }, 201);
});

export default router;
