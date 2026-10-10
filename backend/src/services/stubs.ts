/**
 * Cross-module handoff services & stubs.
 *
 * Defines contracts, type signatures, and real/stub operations where Person A's
 * domain (Yarn, Machines) interacts with Person B's domain (Orders, QC, Dispatches).
 */

import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { machines, machineStatusLog, yarnStock, machineOutputLog, fabricRolls, salesOrders } from '../db/schema.js';
import { yarnStockLowCount, productionOutputMetresToday } from '../metrics.js';
import { fabricRolls, salesOrders } from '../db/schema.js';

export interface ReserveYarnInput {
  yarnStockId?: string;
  quantityKg: number;
  orderId: string;
}

export interface ReserveYarnResult {
  success: boolean;
  reservedKg: number;
  remainingStockKg: number;
}

/**
 * Handoff: Orders (Person B) -> Yarn (Person A)
 * Called when an order advances to yarn_check to verify or reserve material.
 */
export async function reserveYarnStock(input: ReserveYarnInput): Promise<ReserveYarnResult> {
  if (!input.yarnStockId) {
    // If no stock ID provided, succeed with simulated values
    return {
      success: true,
      reservedKg: input.quantityKg,
      remainingStockKg: 1000,
    };
  }

  return await db.transaction(async (tx) => {
    const [stock] = await tx
      .select()
      .from(yarnStock)
      .where(eq(yarnStock.id, input.yarnStockId!))
      .limit(1);

    if (!stock) {
      return {
        success: false,
        reservedKg: 0,
        remainingStockKg: 0,
      };
    }

    const currentQty = Number(stock.quantityKg);
    const reorderLevel = Number(stock.reorderLevel);

    if (currentQty < input.quantityKg) {
      return {
        success: false,
        reservedKg: 0,
        remainingStockKg: currentQty,
      };
    }

    const remainingStockKg = currentQty - input.quantityKg;

    await tx
      .update(yarnStock)
      .set({
        quantityKg: remainingStockKg.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(yarnStock.id, input.yarnStockId!));

    if (remainingStockKg <= reorderLevel) {
      await notifyLowStock({
        yarnStockId: stock.id,
        yarnType: stock.type,
        currentKg: remainingStockKg,
        reorderLevel,
      });
    }

    return {
      success: true,
      reservedKg: input.quantityKg,
      remainingStockKg,
    };
  });
  // Person A stub: Simulates yarn stock reservation
  return {
    success: true,
    reservedKg: input.quantityKg,
    remainingStockKg: 1000,
  };
}

export interface CheckMachineAvailabilityInput {
  machineId: string;
}

export interface CheckMachineAvailabilityResult {
  available: boolean;
  currentStatus: 'running' | 'idle' | 'maintenance' | 'breakdown';
  currentOrderId: string | null;
}

/**
 * Handoff: Production Orders (Person B) -> Machines (Person A)
 * Called when assigning a sales order / production order to verify machine state.
 */
export async function checkMachineAvailability(
  input: CheckMachineAvailabilityInput,
): Promise<CheckMachineAvailabilityResult> {
  const [machine] = await db
    .select()
    .from(machines)
    .where(eq(machines.id, input.machineId))
    .limit(1);

  if (!machine) {
    return {
      available: false,
      currentStatus: 'idle',
      currentOrderId: null,
    };
  }

  const [latestStatus] = await db
    .select()
    .from(machineStatusLog)
    .where(eq(machineStatusLog.machineId, input.machineId))
    .orderBy(desc(machineStatusLog.recordedAt))
    .limit(1);

  const currentStatus = latestStatus ? latestStatus.status : 'idle';
  const currentOrderId = latestStatus?.currentOrderId ?? null;
  const available = currentStatus === 'idle';
  // Person A stub: Simulates checking machine status log
  return {
    available,
    currentStatus,
    currentOrderId,
  };
}

export interface RecordFabricRollProducedInput {
  orderId: string;
  machineId: string;
  metres: number;
  producedDate?: string;
}

export interface RecordFabricRollProducedResult {
  rollId: string;
  orderCompletedMetres: number;
  orderTargetMetres: number;
}

/**
 * Handoff: QC / Roll logging (Person B) -> Sales Order / Production Order progress (Person B / A)
 * Real implementation: Inserts into fabric_rolls and updates sales_orders.completed_metres.
 */
export async function recordFabricRollProduced(
  input: RecordFabricRollProducedInput,
): Promise<RecordFabricRollProducedResult> {
  // 1. Fetch sales order
  const [order] = await db
    .select()
    .from(salesOrders)
    .where(eq(salesOrders.id, input.orderId))
    .limit(1);

  if (!order) {
    throw new Error(`Sales order '${input.orderId}' not found`);
  }

  // 2. Generate next sequential FR-NNNN identifier
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
  const rollId = `FR-${nextNum}`;
  const producedDate = input.producedDate ?? new Date().toISOString().split('T')[0];

  // 3. Insert roll and update completed_metres in transaction
  const result = await db.transaction(async (tx) => {
    const [insertedRoll] = await tx
      .insert(fabricRolls)
      .values({
        id: rollId,
        orderId: input.orderId,
        machineId: input.machineId,
        metres: String(input.metres),
        producedDate,
        qcResult: 'pending',
        defects: null,
      })
      .returning();

    const newCompletedMetres = Number(order.completedMetres) + Number(input.metres);

    const [updatedOrder] = await tx
      .update(salesOrders)
      .set({
        completedMetres: String(newCompletedMetres),
        updatedAt: new Date(),
      })
      .where(eq(salesOrders.id, input.orderId))
      .returning();

    return {
      rollId: insertedRoll.id,
      orderCompletedMetres: Number(updatedOrder.completedMetres),
      orderTargetMetres: Number(updatedOrder.quantityMetres),
    };
  });

  return result;
}

export interface NotifyLowStockInput {
  yarnStockId: string;
  yarnType: string;
  currentKg: number;
  reorderLevel: number;
}

/**
 * Update Prometheus yarn_stock_low_count gauge
 */
export async function updateYarnLowStockGauge(): Promise<number> {
  const [countResult] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(yarnStock)
    .where(sql`cast(${yarnStock.quantityKg} as numeric) <= cast(${yarnStock.reorderLevel} as numeric)`);

  const lowCount = countResult?.count ?? 0;
  yarnStockLowCount.set(lowCount);
  return lowCount;
}

/**
 * Update Prometheus production_output_metres_today gauge
 */
export async function updateProductionOutputGauge(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const [sumResult] = await db
    .select({
      total: sql<number>`coalesce(sum(${machineOutputLog.metres}), 0)::int`,
    })
    .from(machineOutputLog)
    .where(eq(machineOutputLog.date, today));

  const totalToday = sumResult?.total ?? 0;
  productionOutputMetresToday.set(totalToday);
  return totalToday;
}

/**
 * Handoff: Yarn (Person A) -> Dashboard / Alerts Notification
 */
export async function notifyLowStock(input: NotifyLowStockInput): Promise<{ alerted: boolean }> {

  await updateYarnLowStockGauge();
  return { alerted: input.currentKg <= input.reorderLevel };
}
