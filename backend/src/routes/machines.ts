/**
 * Machine routes — stub.
 * Person A owns this module.
 * Implements: GET /, GET /:id, POST /, PATCH /:id/status,
 *             GET /:id/output-log, POST /:id/output
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok } from '../lib/response.js';

const router = Router();
router.use(authenticate);

/** GET /api/v1/machines  — filter by ?type= ?status= */
router.get('/', (_req, res) => {
  // TODO (Person A): JOIN machines + latest machine_status_log + today's output_log
  ok(res, { _stub: true, message: 'Machines list — not yet implemented' });
});

/** GET /api/v1/machines/:id */
router.get('/:id', (_req, res) => {
  // TODO (Person A): single machine with current status
  ok(res, { _stub: true, message: 'Machine detail — not yet implemented' });
});

/** POST /api/v1/machines  — admin/manager only */
router.post('/', authorize('admin', 'manager'), (_req, res) => {
  // TODO (Person A): validate CreateMachineBody, insert machine
  ok(res, { _stub: true, message: 'Create machine — not yet implemented' }, 201);
});

/** PATCH /api/v1/machines/:id/status — admin/manager/operator */
router.patch('/:id/status', authorize('admin', 'manager', 'operator'), (_req, res) => {
  // TODO (Person A): insert machine_status_log row
  ok(res, { _stub: true, message: 'Update machine status — not yet implemented' });
});

/** GET /api/v1/machines/:id/output-log  — ?from= ?to= */
router.get('/:id/output-log', (_req, res) => {
  // TODO (Person A): SELECT machine_output_log WHERE machine_id = :id AND date BETWEEN
  ok(res, { _stub: true, message: 'Machine output log — not yet implemented' });
});

/** POST /api/v1/machines/:id/output  — admin/manager/operator */
router.post('/:id/output', authorize('admin', 'manager', 'operator'), (_req, res) => {
  // TODO (Person A): upsert machine_output_log for given date
  ok(res, { _stub: true, message: 'Log machine output — not yet implemented' }, 201);
});

export default router;
