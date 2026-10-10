/**
 * Sales Orders routes — stub.
 * Person B owns this module.
 * Implements: GET /, GET /:id, POST /, PATCH /:id/status
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok } from '../lib/response.js';

const router = Router();
router.use(authenticate);

/** GET /api/v1/sales-orders */
router.get('/', (_req, res) => {
  // TODO (Person B): list sales orders with filters and computed values
  ok(res, { _stub: true, message: 'Sales orders list — not yet implemented' });
});

/** GET /api/v1/sales-orders/:id */
router.get('/:id', (_req, res) => {
  // TODO (Person B): get order details with stages
  ok(res, { _stub: true, message: 'Sales order detail — not yet implemented' });
});

/** POST /api/v1/sales-orders */
router.post('/', authorize('admin', 'manager'), (_req, res) => {
  // TODO (Person B): create new sales order
  ok(res, { _stub: true, message: 'Create sales order — not yet implemented' }, 201);
});

/** PATCH /api/v1/sales-orders/:id/status */
router.patch('/:id/status', authorize('admin', 'manager'), (_req, res) => {
  // TODO (Person B): advance order status following workflow rules
  ok(res, { _stub: true, message: 'Update sales order status — not yet implemented' });
});

export default router;
