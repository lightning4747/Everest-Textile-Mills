import { Router } from 'express';
import { z } from 'zod';
import { eq, and, inArray, notInArray, sql, desc } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, created, notFound, badRequest } from '../lib/response.js';
import { db } from '../db/index.js';
import {
  dispatches,
  dispatchRolls,
  salesOrders,
  fabricRolls,
  type Dispatch,
} from '../db/schema.js';
import { ordersDispatchedTotal } from '../metrics.js';

const router = Router();
router.use(authenticate);

const DISPATCH_STATUSES = ['prepared', 'loaded', 'delivered'] as const;

// ── Validation Schemas ────────────────────────────────────────────────────────
const listDispatchesQuerySchema = z.object({
  status: z.enum(DISPATCH_STATUSES).optional(),
  order_id: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

const createDispatchSchema = z.object({
  orderId: z.string().trim().min(1, 'Order ID is required'),
  dispatchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dispatch date must be YYYY-MM-DD'),
  truckNo: z.string().trim().min(1, 'Truck number is required'),
  invoiceNo: z.string().trim().min(1, 'Invoice number is required'),
  rollIds: z.array(z.string().trim().min(1)).optional(),
});

const updateDispatchStatusSchema = z.object({
  status: z.enum(DISPATCH_STATUSES),
});

function formatDispatch(d: Dispatch, rollIds: string[] = []) {
  return {
    id: d.id,
    orderId: d.orderId,
    buyer: d.buyer,
    rollIds,
    totalMetres: Number(d.totalMetres),
    dispatchDate: d.dispatchDate,
    invoiceNo: d.invoiceNo,
    truckNo: d.truckNo,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/**
 * GET /api/v1/dispatches
 * List dispatch history with roll counts and status filter.
 */
router.get('/', validate(listDispatchesQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { status, order_id, page, limit } = req.query as unknown as z.infer<
      typeof listDispatchesQuerySchema
    >;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(dispatches.status, status));
    if (order_id) conditions.push(eq(dispatches.orderId, order_id));

    const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const [totalRecord] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dispatches)
      .where(whereClause);

    const rows = await db
      .select()
      .from(dispatches)
      .where(whereClause)
      .orderBy(desc(dispatches.dispatchDate), desc(dispatches.id))
      .limit(limit)
      .offset(offset);

    // Fetch linked rolls for each dispatch
    const dispatchIds = rows.map((r) => r.id);
    let rollsByDispatch: Record<string, string[]> = {};

    if (dispatchIds.length > 0) {
      const junctionRows = await db
        .select({
          dispatchId: dispatchRolls.dispatchId,
          rollId: dispatchRolls.rollId,
        })
        .from(dispatchRolls)
        .where(inArray(dispatchRolls.dispatchId, dispatchIds));

      for (const jr of junctionRows) {
        if (!rollsByDispatch[jr.dispatchId]) {
          rollsByDispatch[jr.dispatchId] = [];
        }
        rollsByDispatch[jr.dispatchId].push(jr.rollId);
      }
    }

    const data = rows.map((r) => formatDispatch(r, rollsByDispatch[r.id] ?? []));

    ok(res, data, 200, {
      page,
      limit,
      total: Number(totalRecord?.count ?? data.length),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/dispatches/:id
 * Single dispatch details with associated fabric rolls.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);

    const [dispatch] = await db
      .select()
      .from(dispatches)
      .where(eq(dispatches.id, id))
      .limit(1);

    if (!dispatch) {
      notFound(res, `Dispatch '${id}' not found`);
      return;
    }

    const junctionRows = await db
      .select({
        rollId: dispatchRolls.rollId,
        metres: fabricRolls.metres,
        producedDate: fabricRolls.producedDate,
        qcResult: fabricRolls.qcResult,
      })
      .from(dispatchRolls)
      .leftJoin(fabricRolls, eq(dispatchRolls.rollId, fabricRolls.id))
      .where(eq(dispatchRolls.dispatchId, id));

    const rollIds = junctionRows.map((r) => r.rollId);

    ok(res, {
      ...formatDispatch(dispatch, rollIds),
      rolls: junctionRows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/dispatches
 * Create dispatch in an atomic database transaction:
 * 1. Validate sales order is 'ready_to_ship'.
 * 2. Resolve fabric rolls (explicit rollIds or auto-select passed rolls for the order).
 * 3. Calculate totalMetres.
 * 4. Generate sequential DSP-NNN ID.
 * 5. Insert dispatches row and dispatch_rolls junction rows.
 * 6. Mark sales_orders.status = 'dispatched'.
 * 7. Increment ordersDispatchedTotal counter.
 */
router.post(
  '/',
  authorize('admin', 'manager'),
  validate(createDispatchSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createDispatchSchema>;

      // 1. Verify sales order exists
      const [order] = await db
        .select()
        .from(salesOrders)
        .where(eq(salesOrders.id, body.orderId))
        .limit(1);

      if (!order) {
        notFound(res, `Sales order '${body.orderId}' not found`);
        return;
      }

      if (order.status !== 'ready_to_ship') {
        badRequest(
          res,
          `Cannot create dispatch: sales order '${body.orderId}' is currently '${order.status}' (must be 'ready_to_ship')`,
        );
        return;
      }

      // 2. Resolve rolls to dispatch
      let selectedRolls: { id: string; metres: string }[] = [];

      if (body.rollIds && body.rollIds.length > 0) {
        // Verify specified rolls belong to order, passed QC, and have not yet been dispatched
        const alreadyDispatched = await db
          .select({ rollId: dispatchRolls.rollId })
          .from(dispatchRolls)
          .where(inArray(dispatchRolls.rollId, body.rollIds));

        if (alreadyDispatched.length > 0) {
          badRequest(
            res,
            `Cannot dispatch: rolls [${alreadyDispatched.map(r => r.rollId).join(', ')}] have already been dispatched.`,
          );
          return;
        }

        selectedRolls = await db
          .select({ id: fabricRolls.id, metres: fabricRolls.metres })
          .from(fabricRolls)
          .where(
            and(
              inArray(fabricRolls.id, body.rollIds),
              eq(fabricRolls.orderId, body.orderId),
              eq(fabricRolls.qcResult, 'passed'),
            ),
          );

        if (selectedRolls.length !== body.rollIds.length) {
          badRequest(
            res,
            'One or more specified rolls do not belong to this order or have not passed quality inspection',
          );
          return;
        }
      } else {
        // Auto-select all passed rolls for this order that have NOT already been dispatched
        const dispatchedRollSubquery = db.select({ rollId: dispatchRolls.rollId }).from(dispatchRolls);

        selectedRolls = await db
          .select({ id: fabricRolls.id, metres: fabricRolls.metres })
          .from(fabricRolls)
          .where(
            and(
              eq(fabricRolls.orderId, body.orderId),
              eq(fabricRolls.qcResult, 'passed'),
              notInArray(fabricRolls.id, dispatchedRollSubquery),
            ),
          );

        if (selectedRolls.length === 0) {
          badRequest(res, `No available (un-dispatched, passed) fabric rolls found for sales order '${body.orderId}'`);
          return;
        }
      }

      const totalMetres = selectedRolls.reduce((sum, r) => sum + Number(r.metres), 0);

      // 3. Generate sequential DSP-NNN ID atomically via sequence
      const nextValRes = await db.execute(sql<{ nextval: string }>`SELECT nextval('dispatches_seq') as nextval;`);
      const nextNum = nextValRes.rows[0]?.nextval ?? Date.now();
      const newDispatchId = `DSP-${nextNum}`;

      // 4. Perform atomic transaction
      const result = await db.transaction(async (tx) => {
        const [newDispatch] = await tx
          .insert(dispatches)
          .values({
            id: newDispatchId,
            orderId: body.orderId,
            buyer: order.buyer,
            totalMetres: String(totalMetres),
            dispatchDate: body.dispatchDate,
            invoiceNo: body.invoiceNo,
            truckNo: body.truckNo,
            status: 'prepared',
          })
          .returning();

        // Insert junction rows
        const junctionInserts = selectedRolls.map((r) => ({
          dispatchId: newDispatchId,
          rollId: r.id,
        }));
        await tx.insert(dispatchRolls).values(junctionInserts);

        // Update sales order status to 'dispatched'
        await tx
          .update(salesOrders)
          .set({
            status: 'dispatched',
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, body.orderId));

        return newDispatch;
      });

      ordersDispatchedTotal.inc();

      created(
        res,
        formatDispatch(
          result,
          selectedRolls.map((r) => r.id),
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/v1/dispatches/:id/status
 * Update dispatch status ('prepared' -> 'loaded' -> 'delivered').
 */
router.patch(
  '/:id/status',
  authorize('admin', 'manager'),
  validate(updateDispatchStatusSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const { status } = req.body as z.infer<typeof updateDispatchStatusSchema>;

      const [existing] = await db
        .select()
        .from(dispatches)
        .where(eq(dispatches.id, id))
        .limit(1);

      if (!existing) {
        notFound(res, `Dispatch '${id}' not found`);
        return;
      }

      const [updated] = await db
        .update(dispatches)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(dispatches.id, id))
        .returning();

      const junctionRows = await db
        .select({ rollId: dispatchRolls.rollId })
        .from(dispatchRolls)
        .where(eq(dispatchRolls.dispatchId, id));

      ok(
        res,
        formatDispatch(
          updated,
          junctionRows.map((r) => r.rollId),
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

export default router;
