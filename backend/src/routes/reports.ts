/**
 * Reports routes — stub.
 * Shared / Final Phase (requires data from both sides).
 * Implements: GET /order-costs, PUT /order-costs/:order_id,
 *             GET /machine-performance, GET /monthly, PUT /monthly/:year/:month
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok } from '../lib/response.js';

const router = Router();
router.use(authenticate);

/** GET /api/v1/reports/order-costs */
router.get('/order-costs', (_req, res) => {
  ok(res, { _stub: true, message: 'Order costs report — not yet implemented' });
});

/** PUT /api/v1/reports/order-costs/:order_id */
router.put('/order-costs/:order_id', authorize('admin', 'manager'), (_req, res) => {
  ok(res, { _stub: true, message: 'Upsert order cost — not yet implemented' });
});

/** GET /api/v1/reports/machine-performance */
router.get('/machine-performance', (_req, res) => {
  ok(res, { _stub: true, message: 'Machine performance report — not yet implemented' });
});

/** GET /api/v1/reports/monthly */
router.get('/monthly', (_req, res) => {
  ok(res, { _stub: true, message: 'Monthly summary report — not yet implemented' });
});

/** PUT /api/v1/reports/monthly/:year/:month */
router.put('/monthly/:year/:month', authorize('admin', 'manager'), (_req, res) => {
  ok(res, { _stub: true, message: 'Upsert monthly snapshot — not yet implemented' });
});

export default router;
