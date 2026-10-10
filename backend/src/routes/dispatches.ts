/**
 * Dispatches routes — stub.
 * Person B owns this module.
 * Implements: GET /, GET /:id, POST /, PATCH /:id/status
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok } from '../lib/response.js';

const router = Router();
router.use(authenticate);

/** GET /api/v1/dispatches */
router.get('/', (_req, res) => {
  // TODO (Person B): list dispatches
  ok(res, { _stub: true, message: 'Dispatches list — not yet implemented' });
});

/** GET /api/v1/dispatches/:id */
router.get('/:id', (_req, res) => {
  ok(res, { _stub: true, message: 'Dispatch detail — not yet implemented' });
});

/** POST /api/v1/dispatches */
router.post('/', authorize('admin', 'manager'), (_req, res) => {
  // TODO (Person B): create dispatch transaction and update order status to 'dispatched'
  ok(res, { _stub: true, message: 'Create dispatch — not yet implemented' }, 201);
});

/** PATCH /api/v1/dispatches/:id/status */
router.patch('/:id/status', authorize('admin', 'manager'), (_req, res) => {
  ok(res, { _stub: true, message: 'Update dispatch status — not yet implemented' });
});

export default router;
