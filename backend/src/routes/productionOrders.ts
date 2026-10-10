/**
 * Production Orders routes — stub.
 * Person B owns this module.
 * Implements: GET /, GET /:id, POST /, PATCH /:id
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok } from '../lib/response.js';

const router = Router();
router.use(authenticate);

/** GET /api/v1/production-orders */
router.get('/', (_req, res) => {
  // TODO (Person B): list production orders joined with machines and sales orders
  ok(res, { _stub: true, message: 'Production orders list — not yet implemented' });
});

/** GET /api/v1/production-orders/:id */
router.get('/:id', (_req, res) => {
  ok(res, { _stub: true, message: 'Production order detail — not yet implemented' });
});

/** POST /api/v1/production-orders */
router.post('/', authorize('admin', 'manager', 'operator'), (_req, res) => {
  // TODO (Person B): create production order and link machine to sales order
  ok(res, { _stub: true, message: 'Create production order — not yet implemented' }, 201);
});

/** PATCH /api/v1/production-orders/:id */
router.patch('/:id', authorize('admin', 'manager', 'operator'), (_req, res) => {
  // TODO (Person B): update progress/output
  ok(res, { _stub: true, message: 'Update production order — not yet implemented' });
});

export default router;
