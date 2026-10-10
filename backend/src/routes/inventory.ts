import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, created, badRequest } from '../lib/response.js';
import { inventoryService } from '../services/inventoryService.js';
import { db } from '../db/index.js';

const router = Router();
router.use(authenticate);

// ── Validation Schemas ────────────────────────────────────────────────────────
const getBalancesQuerySchema = z.object({
  state: z.string().optional(),
  item_type: z.string().optional(),
  search: z.string().optional(),
});

const getMovementsQuerySchema = z.object({
  item_id: z.string().optional(),
  state: z.string().optional(),
  reason: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

const adjustBalanceSchema = z.object({
  itemId: z.string().trim().min(1, 'Item ID is required'),
  state: z.enum(['raw_yarn', 'wip', 'fabric_pending_qc', 'finished_goods', 'scrap_fabric', 'scrap_yarn']),
  itemType: z.enum(['yarn', 'fabric', 'scrap']),
  skuName: z.string().trim().min(1, 'SKU name is required'),
  newQuantity: z.coerce.number().nonnegative('Quantity cannot be negative'),
  reasonNote: z.string().trim().min(3, 'Audited reason note is required (min 3 chars)'),
  unit: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

/**
 * GET /api/v1/inventory/balances
 * Retrieve real-time inventory balances with optional filters.
 */
router.get('/balances', validate(getBalancesQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { state, item_type, search } = req.query as unknown as z.infer<typeof getBalancesQuerySchema>;
    const balances = await inventoryService.getBalances({
      state,
      itemType: item_type,
      search,
    });
    ok(res, balances);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/inventory/movements
 * Paginated query across the immutable movement ledger.
 */
router.get('/movements', validate(getMovementsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { item_id, state, reason, page, limit } = req.query as unknown as z.infer<typeof getMovementsQuerySchema>;
    const result = await inventoryService.getMovements({
      itemId: item_id,
      state,
      reason,
      page,
      limit,
    });
    ok(res, result.items, 200, result.meta);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/inventory/reconciliation
 * Runs the 4-way inventory reconciliation integrity cross-checks and calculates variance.
 */
router.get('/reconciliation', async (_req, res, next) => {
  try {
    const report = await inventoryService.reconcileInventory();
    ok(res, report);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/inventory/adjust
 * Physical stock count adjustment with mandatory audited explanation (admin only).
 */
router.post(
  '/adjust',
  authorize('admin'),
  validate(adjustBalanceSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof adjustBalanceSchema>;
      const actor = req.user?.username ?? req.user?.name ?? 'admin';

      const result = await db.transaction(async (tx) => {
        return await inventoryService.adjustBalance(tx, {
          itemId: body.itemId,
          state: body.state,
          itemType: body.itemType,
          skuName: body.skuName,
          newQuantity: body.newQuantity,
          reasonNote: body.reasonNote,
          actor,
          unit: body.unit,
          idempotencyKey: body.idempotencyKey,
        });
      });

      created(res, result);
    } catch (err: any) {
      if (err.message?.includes('violates check constraint')) {
        badRequest(res, 'Balance adjustment violated non-negative stock constraint');
        return;
      }
      next(err);
    }
  },
);

export default router;
