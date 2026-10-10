import { Router } from 'express';
import { z } from 'zod';
import { eq, and, sql, desc } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, created, notFound, badRequest } from '../lib/response.js';
import { db } from '../db/index.js';
import {
  fabricRolls,
  salesOrders,
  machines,
  type FabricRoll,
  type SalesOrder,
  type Machine,
} from '../db/schema.js';
import { qcDecisionsTotal } from '../metrics.js';

const router = Router();
router.use(authenticate);

const QC_RESULTS = ['passed', 'rejected', 'pending'] as const;
type QCResult = (typeof QC_RESULTS)[number];

// ── Validation Schemas ────────────────────────────────────────────────────────
const listFabricRollsQuerySchema = z.object({
  order_id: z.string().optional(),
  qc_result: z.enum(QC_RESULTS).optional(),
  machine_id: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

const createFabricRollSchema = z.object({
  orderId: z.string().trim().min(1, 'Order ID is required'),
  machineId: z.string().trim().min(1, 'Machine ID is required'),
  metres: z.coerce.number().positive('Metres must be greater than 0'),
  producedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Produced date must be YYYY-MM-DD')
    .optional(),
});

const qcDecisionSchema = z
  .object({
    qc_result: z.enum(['passed', 'rejected']),
    checked_by: z.string().trim().min(1, 'Checked by is required'),
    defects: z.array(z.string().trim().min(1)).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.qc_result === 'rejected' && (!data.defects || data.defects.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Defects must be specified when result is rejected',
        path: ['defects'],
      });
    }
  });

function formatFabricRoll(
  roll: FabricRoll,
  so?: Pick<SalesOrder, 'buyer'> | null,
  mach?: Pick<Machine, 'name' | 'type'> | null,
) {
  const metres = Number(roll.metres);
  return {
    id: roll.id,
    orderId: roll.orderId,
    buyer: so?.buyer ?? null,
    machineId: roll.machineId,
    machineName: mach?.name ?? null,
    machineType: mach?.type ?? null,
    metres,
    producedDate: roll.producedDate,
    qcResult: roll.qcResult,
    defects: (roll.defects as string[] | null) ?? [],
    checkedBy: roll.checkedBy ?? null,
    checkedAt: roll.checkedAt ?? null,
    createdAt: roll.createdAt,
  };
}

/**
 * GET /api/v1/fabric-rolls/pending
 * Rolls awaiting QC inspection.
 */
router.get('/pending', async (req, res, next) => {
  try {
    const rows = await db
      .select({
        roll: fabricRolls,
        so: { buyer: salesOrders.buyer },
        mach: { name: machines.name, type: machines.type },
      })
      .from(fabricRolls)
      .leftJoin(salesOrders, eq(fabricRolls.orderId, salesOrders.id))
      .leftJoin(machines, eq(fabricRolls.machineId, machines.id))
      .where(eq(fabricRolls.qcResult, 'pending'))
      .orderBy(desc(fabricRolls.producedDate), desc(fabricRolls.id));

    ok(res, rows.map((r) => formatFabricRoll(r.roll, r.so, r.mach)));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/fabric-rolls/stats
 * Aggregate roll counts and pass/rejection metrics.
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const rolls = await db
      .select({
        qcResult: fabricRolls.qcResult,
        metres: fabricRolls.metres,
      })
      .from(fabricRolls);

    const totalRolls = rolls.length;
    const totalMetres = rolls.reduce((sum, r) => sum + Number(r.metres), 0);

    const passedCount = rolls.filter((r) => r.qcResult === 'passed').length;
    const rejectedCount = rolls.filter((r) => r.qcResult === 'rejected').length;
    const pendingCount = rolls.filter((r) => r.qcResult === 'pending').length;

    const inspectedCount = totalRolls - pendingCount;
    const passRate = inspectedCount > 0 ? Math.round((passedCount / inspectedCount) * 100) : 0;
    const rejectionRate = inspectedCount > 0 ? Math.round((rejectedCount / inspectedCount) * 100) : 0;

    ok(res, {
      totalRolls,
      totalMetres,
      passedCount,
      rejectedCount,
      pendingCount,
      passRate,
      rejectionRate,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/fabric-rolls
 * Roll traceability listing with filters and pagination.
 */
router.get('/', validate(listFabricRollsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { order_id, qc_result, machine_id, page, limit } = req.query as unknown as z.infer<
      typeof listFabricRollsQuerySchema
    >;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (order_id) conditions.push(eq(fabricRolls.orderId, order_id));
    if (qc_result) conditions.push(eq(fabricRolls.qcResult, qc_result));
    if (machine_id) conditions.push(eq(fabricRolls.machineId, machine_id));

    const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const [totalRecord] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fabricRolls)
      .where(whereClause);

    const rows = await db
      .select({
        roll: fabricRolls,
        so: { buyer: salesOrders.buyer },
        mach: { name: machines.name, type: machines.type },
      })
      .from(fabricRolls)
      .leftJoin(salesOrders, eq(fabricRolls.orderId, salesOrders.id))
      .leftJoin(machines, eq(fabricRolls.machineId, machines.id))
      .where(whereClause)
      .orderBy(desc(fabricRolls.producedDate), desc(fabricRolls.id))
      .limit(limit)
      .offset(offset);

    const data = rows.map((r) => formatFabricRoll(r.roll, r.so, r.mach));

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
 * GET /api/v1/fabric-rolls/:id
 * Single roll profile.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);

    const [record] = await db
      .select({
        roll: fabricRolls,
        so: { buyer: salesOrders.buyer },
        mach: { name: machines.name, type: machines.type },
      })
      .from(fabricRolls)
      .leftJoin(salesOrders, eq(fabricRolls.orderId, salesOrders.id))
      .leftJoin(machines, eq(fabricRolls.machineId, machines.id))
      .where(eq(fabricRolls.id, id))
      .limit(1);

    if (!record) {
      notFound(res, `Fabric roll '${id}' not found`);
      return;
    }

    ok(res, formatFabricRoll(record.roll, record.so, record.mach));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/fabric-rolls
 * Log a freshly produced fabric roll.
 * Generates sequential FR-NNNN identifier.
 */
router.post(
  '/',
  authorize('admin', 'manager', 'operator', 'qc_inspector'),
  validate(createFabricRollSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createFabricRollSchema>;

      // Validate sales order
      const [order] = await db
        .select()
        .from(salesOrders)
        .where(eq(salesOrders.id, body.orderId))
        .limit(1);

      if (!order) {
        notFound(res, `Sales order '${body.orderId}' not found`);
        return;
      }

      // Validate machine
      const [machine] = await db
        .select()
        .from(machines)
        .where(eq(machines.id, body.machineId))
        .limit(1);

      if (!machine) {
        notFound(res, `Machine '${body.machineId}' not found`);
        return;
      }

      // Sequential FR-NNNN generation
      const [latest] = await db
        .select({ id: fabricRolls.id })
        .from(fabricRolls)
        .where(sql`${fabricRolls.id} ~ '^FR-[0-9]+$'`)
        .orderBy(desc(sql`CAST(SUBSTRING(${fabricRolls.id} FROM 4) AS INTEGER)`))
        .limit(1);

      let nextNum = 5501;
      if (latest?.id) {
        const numPart = parseInt(latest.id.replace('FR-', ''), 10);
        if (!isNaN(numPart)) {
          nextNum = numPart + 1;
        }
      }
      const newId = `FR-${nextNum}`;
      const producedDate = body.producedDate ?? new Date().toISOString().split('T')[0];

      // 3. Insert roll and update completed_metres on sales order in transaction
      const { inserted, orderUpdated } = await db.transaction(async (tx) => {
        const [insertedRoll] = await tx
          .insert(fabricRolls)
          .values({
            id: newId,
            orderId: body.orderId,
            machineId: body.machineId,
            metres: String(body.metres),
            producedDate,
            qcResult: 'pending',
            defects: null,
          })
          .returning();

        // Increment order completedMetres to reflect real-time production
        const currentCompleted = Number(order.completedMetres) + Number(body.metres);
        const target = Number(order.quantityMetres);

        // If in spinning, weaving, or dyeing, transition to quality_check if target reached
        let newStatus = order.status;
        if (currentCompleted >= target && ['spinning', 'weaving', 'dyeing'].includes(order.status)) {
          newStatus = 'quality_check';
        }

        const [soUpdated] = await tx
          .update(salesOrders)
          .set({
            completedMetres: String(currentCompleted),
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, order.id))
          .returning();

        return { inserted: insertedRoll, orderUpdated: soUpdated };
      });

      created(
        res,
        formatFabricRoll(inserted, { buyer: orderUpdated?.buyer ?? order.buyer }, { name: machine.name, type: machine.type }),
      );
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/v1/fabric-rolls/:id/qc
 * Submit QC decision ('passed', 'rejected') with concurrency guard:
 * WHERE qc_result = 'pending' to prevent double submission.
 */
router.patch(
  '/:id/qc',
  authorize('admin', 'manager', 'qc_inspector'),
  validate(qcDecisionSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = req.body as z.infer<typeof qcDecisionSchema>;

      // 1. Check if roll exists
      const [existing] = await db
        .select()
        .from(fabricRolls)
        .where(eq(fabricRolls.id, id))
        .limit(1);

      if (!existing) {
        notFound(res, `Fabric roll '${id}' not found`);
        return;
      }

      if (existing.qcResult !== 'pending') {
        badRequest(
          res,
          `Cannot submit QC decision: roll '${id}' has already been evaluated with result '${existing.qcResult}'`,
        );
        return;
      }

      // 2. Perform atomic update guarded by qcResult = 'pending'
      const result = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(fabricRolls)
          .set({
            qcResult: body.qc_result,
            checkedBy: body.checked_by,
            checkedAt: new Date(),
            defects: body.defects ?? null,
          })
          .where(and(eq(fabricRolls.id, id), eq(fabricRolls.qcResult, 'pending')))
          .returning();

        if (!updated) {
          throw new Error('CONCURRENT_QC_MODIFICATION');
        }

        // 3. If passed: check if total passed metres reach target to advance to ready_to_ship
        let updatedOrder = null;
        if (body.qc_result === 'passed') {
          const [so] = await tx
            .select()
            .from(salesOrders)
            .where(eq(salesOrders.id, updated.orderId))
            .limit(1);

          if (so) {
            // Calculate total passed metres across all passed rolls for this order
            const [passedSumRow] = await tx
              .select({ total: sql<number>`coalesce(sum(${fabricRolls.metres}), 0)` })
              .from(fabricRolls)
              .where(and(eq(fabricRolls.orderId, so.id), eq(fabricRolls.qcResult, 'passed')));

            const totalPassed = Number(passedSumRow?.total ?? 0);
            const target = Number(so.quantityMetres);

            let newStatus = so.status;
            if (totalPassed >= target && ['spinning', 'weaving', 'dyeing', 'quality_check'].includes(so.status)) {
              newStatus = 'ready_to_ship';
            }

            if (newStatus !== so.status) {
              const [soUpdated] = await tx
                .update(salesOrders)
                .set({
                  status: newStatus,
                  updatedAt: new Date(),
                })
                .where(eq(salesOrders.id, so.id))
                .returning();

              updatedOrder = soUpdated;
            }
          }
        }

        return { updated, updatedOrder };
      });

      // Increment Prometheus counter with label
      qcDecisionsTotal.inc({ result: body.qc_result });

      // Fetch joined machine & buyer for response
      const [order] = await db
        .select({ buyer: salesOrders.buyer })
        .from(salesOrders)
        .where(eq(salesOrders.id, result.updated.orderId))
        .limit(1);

      const [machine] = await db
        .select({ name: machines.name, type: machines.type })
        .from(machines)
        .where(eq(machines.id, result.updated.machineId))
        .limit(1);

      ok(res, formatFabricRoll(result.updated, order, machine));
    } catch (err: any) {
      if (err.message === 'CONCURRENT_QC_MODIFICATION') {
        badRequest(res, 'Roll was already evaluated by another inspector');
        return;
      }
      next(err);
    }
  },
);

export default router;
