/**
 * Reports routes.
 * Implements: GET /order-costs, PUT /order-costs/:order_id,
 *             GET /machine-performance, GET /monthly, PUT /monthly/:year/:month
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, notFound, badRequest } from '../lib/response.js';
import { db } from '../db/index.js';
import {
  orderCosts,
  salesOrders,
  machines,
  machineStatusLog,
  machineOutputLog,
  monthlySnapshots,
} from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';

const router = Router();
router.use(authenticate);

// ── Validation Schemas ────────────────────────────────────────────────────────
const putOrderCostSchema = z.object({
  yarn_cost: z.number().nonnegative().optional(),
  yarnCost: z.number().nonnegative().optional(),
  labour_cost: z.number().nonnegative().optional(),
  labourCost: z.number().nonnegative().optional(),
  machine_cost: z.number().nonnegative().optional(),
  machineCost: z.number().nonnegative().optional(),
  revenue: z.number().nonnegative(),
  buyer: z.string().min(1).max(200).optional(),
}).refine(
  (data) => (data.yarnCost !== undefined || data.yarn_cost !== undefined) &&
            (data.labourCost !== undefined || data.labour_cost !== undefined) &&
            (data.machineCost !== undefined || data.machine_cost !== undefined),
  { message: 'yarnCost, labourCost, and machineCost are required' }
);

const putMonthlySnapshotSchema = z.object({
  revenue: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  output_metres: z.number().nonnegative().optional(),
  outputMetres: z.number().nonnegative().optional(),
  wages: z.number().nonnegative().optional(),
}).refine(
  (data) => data.outputMetres !== undefined || data.output_metres !== undefined,
  { message: 'outputMetres is required' }
);

function formatOrderCost(row: typeof orderCosts.$inferSelect) {
  const yarnCost = Number(row.yarnCost);
  const labourCost = Number(row.labourCost);
  const machineCost = Number(row.machineCost);
  const revenue = Number(row.revenue);
  const totalCost = yarnCost + labourCost + machineCost;
  const profit = revenue - totalCost;
  const marginPct = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0;

  return {
    orderId: row.orderId,
    buyer: row.buyer,
    yarnCost,
    labourCost,
    machineCost,
    totalCost,
    revenue,
    profit,
    marginPct,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatMonthlySnapshot(row: typeof monthlySnapshots.$inferSelect) {
  const revenue = Number(row.revenue);
  const cost = Number(row.cost);
  const outputMetres = Number(row.outputMetres);
  const wages = Number(row.wages);
  const grossProfit = revenue - cost;
  const marginPct = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0;

  return {
    id: row.id,
    year: row.year,
    month: row.month,
    revenue,
    cost,
    outputMetres,
    wages,
    grossProfit,
    marginPct,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * GET /api/v1/reports/order-costs
 * Query order_costs (with optional ?order_id=ORD-XXXX filter).
 */
router.get('/order-costs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderIdParam = (req.query.order_id || req.query.orderId) as string | undefined;

    const rows = orderIdParam
      ? await db.select().from(orderCosts).where(eq(orderCosts.orderId, String(orderIdParam))).orderBy(orderCosts.orderId)
      : await db.select().from(orderCosts).orderBy(orderCosts.orderId);

    const data = rows.map(formatOrderCost);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/reports/order-costs/:order_id
 * Upsert into order_costs (admin, manager).
 */
router.put(
  '/order-costs/:order_id',
  authorize('admin', 'manager'),
  validate(putOrderCostSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = String(req.params.order_id);
      const body = req.body;

      // 1. Verify sales order exists
      const [order] = await db
        .select()
        .from(salesOrders)
        .where(eq(salesOrders.id, orderId))
        .limit(1);

      if (!order) {
        return notFound(res, `Sales order ${orderId} not found`);
      }

      const yarnCostVal = String(body.yarnCost ?? body.yarn_cost);
      const labourCostVal = String(body.labourCost ?? body.labour_cost);
      const machineCostVal = String(body.machineCost ?? body.machine_cost);
      const revenueVal = String(body.revenue);
      const buyerVal = String(body.buyer ?? order.buyer);

      const [updated] = await db
        .insert(orderCosts)
        .values({
          orderId,
          buyer: buyerVal,
          yarnCost: yarnCostVal,
          labourCost: labourCostVal,
          machineCost: machineCostVal,
          revenue: revenueVal,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: orderCosts.orderId,
          set: {
            buyer: buyerVal,
            yarnCost: yarnCostVal,
            labourCost: labourCostVal,
            machineCost: machineCostVal,
            revenue: revenueVal,
            updatedAt: new Date(),
          },
        })
        .returning();

      ok(res, formatOrderCost(updated));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/reports/machine-performance
 * List all machines with latest status, operator, and today's output metres.
 */
router.get('/machine-performance', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const allMachines = await db.select().from(machines).orderBy(machines.id);

    // Latest status per machine
    const latestStatuses = await db
      .selectDistinctOn([machineStatusLog.machineId])
      .from(machineStatusLog)
      .orderBy(machineStatusLog.machineId, desc(machineStatusLog.recordedAt));

    const statusMap = new Map<string, (typeof latestStatuses)[0]>();
    for (const s of latestStatuses) {
      statusMap.set(s.machineId, s);
    }

    // Today's output per machine
    const today = new Date().toISOString().split('T')[0];
    const outputs = await db
      .select()
      .from(machineOutputLog)
      .where(eq(machineOutputLog.date, today));

    const outputMap = new Map<string, number>();
    for (const o of outputs) {
      outputMap.set(o.machineId, o.metres);
    }

    const data = allMachines.map((m) => {
      const s = statusMap.get(m.id);
      const outputToday = outputMap.get(m.id) ?? 0;
      const target = m.dailyTarget ?? 500;
      const efficiencyPct = target > 0 ? Math.round((outputToday / target) * 100) : 0;

      return {
        id: m.id,
        name: m.name,
        type: m.type,
        status: s?.status ?? 'idle',
        currentOrder: s?.currentOrderId ?? null,
        operator: s?.operator ?? null,
        outputToday,
        target,
        efficiencyPct,
      };
    });

    ok(res, data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/reports/monthly
 * Query monthly_snapshots (optional ?year=...&month=... filter), ordered by year DESC, month DESC.
 */
router.get('/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month } = req.query;
    const conditions = [];

    if (year !== undefined) {
      const parsedYear = parseInt(String(year), 10);
      if (isNaN(parsedYear)) {
        return badRequest(res, 'Invalid year parameter');
      }
      conditions.push(eq(monthlySnapshots.year, parsedYear));
    }

    if (month !== undefined) {
      const parsedMonth = parseInt(String(month), 10);
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return badRequest(res, 'Invalid month parameter (must be 1-12)');
      }
      conditions.push(eq(monthlySnapshots.month, parsedMonth));
    }

    const rows = conditions.length > 0
      ? await db
          .select()
          .from(monthlySnapshots)
          .where(and(...conditions))
          .orderBy(desc(monthlySnapshots.year), desc(monthlySnapshots.month))
      : await db
          .select()
          .from(monthlySnapshots)
          .orderBy(desc(monthlySnapshots.year), desc(monthlySnapshots.month));

    const data = rows.map(formatMonthlySnapshot);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/reports/monthly/:year/:month
 * Upsert row into monthly_snapshots on conflict on (year, month).
 */
router.put(
  '/monthly/:year/:month',
  authorize('admin', 'manager'),
  validate(putMonthlySnapshotSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const year = parseInt(String(req.params.year), 10);
      const month = parseInt(String(req.params.month), 10);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return badRequest(res, 'Year and month must be valid numbers (month 1-12)');
      }

      const body = req.body;
      const revenueVal = String(body.revenue);
      const costVal = String(body.cost);
      const outputMetresVal = String(body.outputMetres ?? body.output_metres);
      const wagesVal = String(body.wages ?? 0);

      const [updated] = await db
        .insert(monthlySnapshots)
        .values({
          year,
          month,
          revenue: revenueVal,
          cost: costVal,
          outputMetres: outputMetresVal,
          wages: wagesVal,
        })
        .onConflictDoUpdate({
          target: [monthlySnapshots.year, monthlySnapshots.month],
          set: {
            revenue: revenueVal,
            cost: costVal,
            outputMetres: outputMetresVal,
            wages: wagesVal,
          },
        })
        .returning();

      ok(res, formatMonthlySnapshot(updated));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
