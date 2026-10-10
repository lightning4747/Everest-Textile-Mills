import { Router } from 'express';
import { z } from 'zod';
import { eq, sql, count } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, created, notFound, badRequest } from '../lib/response.js';
import { db } from '../db/index.js';
import {
  productionOrders,
  salesOrders,
  machines,
  type ProductionOrder,
  type SalesOrder,
  type Machine,
} from '../db/schema.js';
import { checkMachineAvailability } from '../services/stubs.js';

const router = Router();
router.use(authenticate);

const PRODUCTION_STATUSES = ['queued', 'in_progress', 'paused', 'completed'] as const;

// ── Validation Schemas ────────────────────────────────────────────────────────
const listProductionOrdersQuerySchema = z.object({
  status: z.enum(PRODUCTION_STATUSES).optional(),
  machine_id: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

const createProductionOrderSchema = z.object({
  salesOrderId: z.string().trim().min(1, 'Sales Order ID is required'),
  machineId: z.string().trim().min(1, 'Machine ID is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  expectedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected end date must be YYYY-MM-DD'),
  targetMetres: z.coerce.number().positive('Target metres must be greater than 0'),
  status: z.enum(PRODUCTION_STATUSES).optional().default('queued'),
});

const updateProductionOrderSchema = z.object({
  status: z.enum(PRODUCTION_STATUSES).optional(),
  outputMetres: z.coerce.number().min(0, 'Output metres cannot be negative').optional(),
});

function formatProductionOrder(
  po: ProductionOrder,
  so?: Pick<SalesOrder, 'buyer' | 'fabricType' | 'colour' | 'deliveryDate' | 'status'> | null,
  mach?: Pick<Machine, 'name' | 'type'> | null,
) {
  const outputMetres = Number(po.outputMetres);
  const targetMetres = Number(po.targetMetres);
  const progress = targetMetres > 0 ? Math.round((outputMetres / targetMetres) * 100) : 0;

  return {
    id: po.id,
    salesOrderId: po.salesOrderId,
    machineId: po.machineId,
    machineName: mach?.name ?? null,
    machineType: mach?.type ?? null,
    startDate: po.startDate,
    expectedEndDate: po.expectedEndDate,
    status: po.status,
    outputMetres,
    targetMetres,
    progress,
    // Joined from sales order
    buyer: so?.buyer ?? null,
    fabricType: so?.fabricType ?? null,
    colour: so?.colour ?? null,
    deliveryDate: so?.deliveryDate ?? null,
    orderStatus: so?.status ?? null,
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
  };
}

/**
 * GET /api/v1/production-orders
 * List active production orders joined with machines and sales orders.
 */
router.get('/', validate(listProductionOrdersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { status, machine_id, page, limit } = req.query as unknown as z.infer<
      typeof listProductionOrdersQuerySchema
    >;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) {
      conditions.push(eq(productionOrders.status, status));
    }
    if (machine_id) {
      conditions.push(eq(productionOrders.machineId, machine_id));
    }

    const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const [totalRecord] = await db
      .select({ count: count() })
      .from(productionOrders)
      .where(whereClause);

    const rows = await db
      .select({
        po: productionOrders,
        so: {
          buyer: salesOrders.buyer,
          fabricType: salesOrders.fabricType,
          colour: salesOrders.colour,
          deliveryDate: salesOrders.deliveryDate,
          status: salesOrders.status,
        },
        mach: {
          name: machines.name,
          type: machines.type,
        },
      })
      .from(productionOrders)
      .leftJoin(salesOrders, eq(productionOrders.salesOrderId, salesOrders.id))
      .leftJoin(machines, eq(productionOrders.machineId, machines.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const data = rows.map((r) => formatProductionOrder(r.po, r.so, r.mach));

    ok(res, data, 200, {
      page,
      limit,
      total: totalRecord?.count ?? data.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/production-orders/:id
 * Single production order joined with machine and sales order details.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);

    const [record] = await db
      .select({
        po: productionOrders,
        so: {
          buyer: salesOrders.buyer,
          fabricType: salesOrders.fabricType,
          colour: salesOrders.colour,
          deliveryDate: salesOrders.deliveryDate,
          status: salesOrders.status,
        },
        mach: {
          name: machines.name,
          type: machines.type,
        },
      })
      .from(productionOrders)
      .leftJoin(salesOrders, eq(productionOrders.salesOrderId, salesOrders.id))
      .leftJoin(machines, eq(productionOrders.machineId, machines.id))
      .where(eq(productionOrders.id, id))
      .limit(1);

    if (!record) {
      notFound(res, `Production order '${id}' not found`);
      return;
    }

    ok(res, formatProductionOrder(record.po, record.so, record.mach));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/production-orders
 * Create production order:
 * 1. Checks machine availability via cross-module stub.
 * 2. Assigns machine to sales order.
 * 3. Transitions sales order status based on machine type.
 * 4. Runs inside a database transaction.
 */
router.post(
  '/',
  authorize('admin', 'manager', 'operator'),
  validate(createProductionOrderSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createProductionOrderSchema>;

      // 1. Verify sales order exists
      const [order] = await db
        .select()
        .from(salesOrders)
        .where(eq(salesOrders.id, body.salesOrderId))
        .limit(1);

      if (!order) {
        notFound(res, `Sales order '${body.salesOrderId}' not found`);
        return;
      }

      // 2. Verify machine exists and check availability via stub
      const [machine] = await db
        .select()
        .from(machines)
        .where(eq(machines.id, body.machineId))
        .limit(1);

      if (!machine) {
        notFound(res, `Machine '${body.machineId}' not found`);
        return;
      }

      const availability = await checkMachineAvailability({ machineId: body.machineId });
      if (!availability.available && availability.currentStatus !== 'idle') {
        badRequest(
          res,
          `Machine '${body.machineId}' is not available (status: ${availability.currentStatus})`,
        );
        return;
      }

      // Determine appropriate stage for sales order based on machine type
      let targetStage = order.status;
      if (['pending', 'yarn_check'].includes(order.status)) {
        if (machine.type === 'spinning') targetStage = 'spinning';
        else if (machine.type === 'weaving') targetStage = 'weaving';
        else if (machine.type === 'dyeing') targetStage = 'dyeing';
      }

      // 3. Transactional creation and link
      const result = await db.transaction(async (tx) => {
        const [po] = await tx
          .insert(productionOrders)
          .values({
            salesOrderId: body.salesOrderId,
            machineId: body.machineId,
            startDate: body.startDate,
            expectedEndDate: body.expectedEndDate,
            targetMetres: String(body.targetMetres),
            status: body.status,
            outputMetres: '0',
          })
          .returning();

        const [updatedSo] = await tx
          .update(salesOrders)
          .set({
            machineId: body.machineId,
            status: targetStage,
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, body.salesOrderId))
          .returning();

        return { po, updatedSo };
      });

      created(
        res,
        formatProductionOrder(result.po, result.updatedSo, {
          name: machine.name,
          type: machine.type,
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/v1/production-orders/:id
 * Update status ('queued' | 'in_progress' | 'paused' | 'completed') or outputMetres.
 */
router.patch(
  '/:id',
  authorize('admin', 'manager', 'operator'),
  validate(updateProductionOrderSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = req.body as z.infer<typeof updateProductionOrderSchema>;

      const [existing] = await db
        .select()
        .from(productionOrders)
        .where(eq(productionOrders.id, id))
        .limit(1);

      if (!existing) {
        notFound(res, `Production order '${id}' not found`);
        return;
      }

      const updates: Partial<typeof productionOrders.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (body.status !== undefined) {
        updates.status = body.status;
      }

      if (body.outputMetres !== undefined) {
        updates.outputMetres = String(body.outputMetres);
      }

      const [updated] = await db
        .update(productionOrders)
        .set(updates)
        .where(eq(productionOrders.id, id))
        .returning();

      // Fetch joined sales order and machine
      const [order] = await db
        .select({
          buyer: salesOrders.buyer,
          fabricType: salesOrders.fabricType,
          colour: salesOrders.colour,
          deliveryDate: salesOrders.deliveryDate,
          status: salesOrders.status,
        })
        .from(salesOrders)
        .where(eq(salesOrders.id, updated.salesOrderId))
        .limit(1);

      const [mach] = await db
        .select({
          name: machines.name,
          type: machines.type,
        })
        .from(machines)
        .where(eq(machines.id, updated.machineId))
        .limit(1);

      ok(res, formatProductionOrder(updated, order, mach));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
