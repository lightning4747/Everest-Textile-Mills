/**
 * Dashboard routes.
 * Person A domain.
 * Implements: GET /kpis, /monthly-chart, /qc-summary, /machine-health,
 *             /recent-orders, /low-stock
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ok } from '../lib/response.js';
import { db } from '../db/index.js';
import {
  salesOrders,
  machines,
  machineStatusLog,
  machineOutputLog,
  yarnStock,
  fabricRolls,
  monthlySnapshots,
  yarnTypeSuppliers,
  suppliers,
} from '../db/schema.js';
import { desc, eq, ne, sql } from 'drizzle-orm';

const router = Router();

// All dashboard routes require auth
router.use(authenticate);

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * GET /api/v1/dashboard/kpis
 * Consolidated KPI strip avoiding multiple round trips.
 */
router.get('/kpis', async (_req, res, next) => {
  try {
    // 1. activeOrders & readyToShip
    const [ordersCount] = await db
      .select({
        activeOrders: sql<number>`count(*) filter (where ${salesOrders.status} != 'dispatched')`,
        readyToShip: sql<number>`count(*) filter (where ${salesOrders.status} = 'ready_to_ship')`,
      })
      .from(salesOrders);

    // 2. Machine counts based on latest status per machine
    const allMachines = await db.select({ id: machines.id }).from(machines);
    const totalMachines = allMachines.length;

    const latestStatuses = await db
      .selectDistinctOn([machineStatusLog.machineId])
      .from(machineStatusLog)
      .orderBy(machineStatusLog.machineId, desc(machineStatusLog.recordedAt));

    const statusMap = new Map<string, string>();
    for (const s of latestStatuses) {
      statusMap.set(s.machineId, s.status);
    }

    let runningMachines = 0;
    let idleMachines = 0;
    let downMachines = 0;

    for (const m of allMachines) {
      const st = statusMap.get(m.id) ?? 'idle';
      if (st === 'running') {
        runningMachines++;
      } else if (st === 'idle') {
        idleMachines++;
      } else if (st === 'breakdown' || st === 'maintenance') {
        downMachines++;
      }
    }

    // 3. outputToday
    const today = new Date().toISOString().split('T')[0];
    const [todayOutputRow] = await db
      .select({ total: sql<number>`coalesce(sum(${machineOutputLog.metres}), 0)` })
      .from(machineOutputLog)
      .where(eq(machineOutputLog.date, today));

    let outputToday = Number(todayOutputRow?.total ?? 0);

    // Fallback to latest day with output if today has 0 output
    if (outputToday === 0) {
      const [latestOutputRow] = await db
        .select({
          date: machineOutputLog.date,
          total: sql<number>`sum(${machineOutputLog.metres})`,
        })
        .from(machineOutputLog)
        .groupBy(machineOutputLog.date)
        .orderBy(desc(machineOutputLog.date))
        .limit(1);

      if (latestOutputRow) {
        outputToday = Number(latestOutputRow.total ?? 0);
      }
    }

    // 4. lowStockCount
    const [lowStockRow] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(yarnStock)
      .where(sql`cast(${yarnStock.quantityKg} as numeric) <= cast(${yarnStock.reorderLevel} as numeric)`);

    const lowStockCount = Number(lowStockRow?.count ?? 0);

    // 5. pendingQC
    const [pendingQCRow] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(fabricRolls)
      .where(eq(fabricRolls.qcResult, 'pending'));

    const pendingQC = Number(pendingQCRow?.count ?? 0);

    ok(res, {
      activeOrders: Number(ordersCount?.activeOrders ?? 0),
      readyToShip: Number(ordersCount?.readyToShip ?? 0),
      runningMachines,
      totalMachines,
      idleMachines,
      downMachines,
      outputToday,
      lowStockCount,
      pendingQC,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/dashboard/monthly-chart
 * 6-month financial and production trend for AreaChart.
 */
router.get('/monthly-chart', async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(monthlySnapshots)
      .orderBy(monthlySnapshots.year, monthlySnapshots.month)
      .limit(6);

    const data = rows.map((r) => {
      const monthAbbr = (r.month >= 1 && r.month <= 12)
        ? MONTH_NAMES[r.month - 1]
        : String(r.month);

      return {
        month: monthAbbr,
        revenue: Number(r.revenue),
        cost: Number(r.cost),
        output: Number(r.outputMetres),
        wages: Number(r.wages),
      };
    });

    ok(res, data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/dashboard/qc-summary
 * Fabric rolls counts by QC result.
 */
router.get('/qc-summary', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        qcResult: fabricRolls.qcResult,
        count: sql<number>`count(*)`,
      })
      .from(fabricRolls)
      .groupBy(fabricRolls.qcResult);

    const summary = {
      passed: 0,
      rework: 0,
      rejected: 0,
      pending: 0,
    };

    for (const r of rows) {
      if (r.qcResult in summary) {
        summary[r.qcResult as keyof typeof summary] = Number(r.count);
      }
    }

    ok(res, summary);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/dashboard/machine-health
 * Machine counts by current status.
 */
router.get('/machine-health', async (_req, res, next) => {
  try {
    const allMachines = await db.select({ id: machines.id }).from(machines);

    const latestStatuses = await db
      .selectDistinctOn([machineStatusLog.machineId])
      .from(machineStatusLog)
      .orderBy(machineStatusLog.machineId, desc(machineStatusLog.recordedAt));

    const statusMap = new Map<string, string>();
    for (const s of latestStatuses) {
      statusMap.set(s.machineId, s.status);
    }

    const health = {
      running: 0,
      idle: 0,
      maintenance: 0,
      breakdown: 0,
    };

    for (const m of allMachines) {
      const st = statusMap.get(m.id) ?? 'idle';
      if (st in health) {
        health[st as keyof typeof health]++;
      }
    }

    ok(res, health);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/dashboard/recent-orders
 * First 5 sales orders for the live order pipeline table.
 */
router.get('/recent-orders', async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(salesOrders)
      .orderBy(desc(salesOrders.createdDate), desc(salesOrders.id))
      .limit(5);

    const data = rows.map((o) => {
      const targetMetres = Number(o.quantityMetres);
      const completedMetres = Number(o.completedMetres);
      const progressPct = targetMetres > 0 ? Math.round((completedMetres / targetMetres) * 100) : 0;

      return {
        id: o.id,
        buyer: o.buyer,
        fabric: o.fabricType,
        colour: o.colour,
        targetMetres,
        completedMetres,
        progressPct,
        status: o.status,
        deliveryDate: o.deliveryDate,
      };
    });

    ok(res, data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/dashboard/low-stock
 * Yarn stock items below or equal to reorder level, joining supplier name.
 */
router.get('/low-stock', async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(yarnStock)
      .where(sql`cast(${yarnStock.quantityKg} as numeric) <= cast(${yarnStock.reorderLevel} as numeric)`)
      .orderBy(yarnStock.id);

    const mappings = await db
      .select({
        yarnType: yarnTypeSuppliers.yarnType,
        name: suppliers.name,
      })
      .from(yarnTypeSuppliers)
      .innerJoin(suppliers, eq(yarnTypeSuppliers.supplierId, suppliers.id));

    const supplierMap = new Map<string, string>();
    for (const m of mappings) {
      if (!supplierMap.has(m.yarnType)) {
        supplierMap.set(m.yarnType, m.name);
      }
    }

    const data = rows.map((r) => {
      const quantityKg = Number(r.quantityKg);
      const reorderLevel = Number(r.reorderLevel);
      const supplier = supplierMap.get(r.type);

      return {
        id: r.id,
        type: r.type,
        colour: r.colour,
        quantityKg,
        reorderLevel,
        bin: r.location,
        location: r.location,
        supplier: supplier ?? null,
      };
    });

    ok(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
