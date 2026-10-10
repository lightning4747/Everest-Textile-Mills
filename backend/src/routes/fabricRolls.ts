/**
 * Fabric Rolls & Quality Control routes — stub.
 * Person B owns this module.
 * Implements: GET /, GET /pending, GET /stats, GET /:id, POST /, PATCH /:id/qc
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok } from '../lib/response.js';

const router = Router();
router.use(authenticate);

/** GET /api/v1/fabric-rolls */
router.get('/', (_req, res) => {
  // TODO (Person B): list rolls with qc filters
  ok(res, { _stub: true, message: 'Fabric rolls list — not yet implemented' });
});

/** GET /api/v1/fabric-rolls/pending */
router.get('/pending', (_req, res) => {
  // TODO (Person B): list rolls awaiting inspection
  ok(res, { _stub: true, message: 'Pending QC rolls — not yet implemented' });
});

/** GET /api/v1/fabric-rolls/stats */
router.get('/stats', (_req, res) => {
  // TODO (Person B): roll counts and pass/rejection rates
  ok(res, { _stub: true, message: 'QC stats — not yet implemented' });
});

/** GET /api/v1/fabric-rolls/:id */
router.get('/:id', (_req, res) => {
  ok(res, { _stub: true, message: 'Fabric roll detail — not yet implemented' });
});

/** POST /api/v1/fabric-rolls */
router.post('/', authorize('admin', 'manager', 'operator', 'qc_inspector'), (_req, res) => {
  // TODO (Person B): log created roll
  ok(res, { _stub: true, message: 'Create fabric roll — not yet implemented' }, 201);
});

/** PATCH /api/v1/fabric-rolls/:id/qc */
router.patch('/:id/qc', authorize('admin', 'manager', 'qc_inspector'), (_req, res) => {
  // TODO (Person B): submit QC decision with guard (WHERE qc_result = 'pending')
  ok(res, { _stub: true, message: 'Submit QC decision — not yet implemented' });
});

export default router;
