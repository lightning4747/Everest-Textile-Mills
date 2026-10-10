/**
 * Suppliers routes — stub.
 * Person A owns this module.
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok } from '../lib/response.js';

const router = Router();
router.use(authenticate);

/** GET /api/v1/suppliers */
router.get('/', (_req, res) => {
  ok(res, { _stub: true, message: 'Suppliers list — not yet implemented' });
});

/** POST /api/v1/suppliers */
router.post('/', authorize('admin', 'manager'), (_req, res) => {
  ok(res, { _stub: true, message: 'Create supplier — not yet implemented' }, 201);
});

export default router;
