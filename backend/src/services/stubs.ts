import { db } from '../db/index.js';
import { machines, machineStatusLog, yarnStock } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { yarnStockLowCount } from '../metrics.js';

export interface ReserveYarnInput {
  yarnStockId: string;
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
 * Called when an order passes yarn check or starts production to reserve/consume material.
 */
export async function reserveYarnStock(input: ReserveYarnInput): Promise<ReserveYarnResult> {
  return await db.transaction(async (tx) => {
    const [stock] = await tx
      .select()
      .from(yarnStock)
      .where(eq(yarnStock.id, input.yarnStockId))
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
      .where(eq(yarnStock.id, input.yarnStockId));

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
}

export interface RecordFabricRollProducedResult {
  rollId: string;
  orderCompletedMetres: number;
  orderTargetMetres: number;
}

/**
 * Handoff: QC / Roll logging (Person B) -> Sales Order / Production Order progress (Person B / A)
 * Updates machine daily output & sales order progress when rolls are created.
 */
export async function recordFabricRollProduced(
  input: RecordFabricRollProducedInput,
): Promise<RecordFabricRollProducedResult> {
  // STUB: Owned by Person B - DO NOT MODIFY
  return {
    rollId: 'FR-9999',
    orderCompletedMetres: input.metres,
    orderTargetMetres: 5000,
  };
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
 * Handoff: Yarn (Person A) -> Dashboard / Alerts Notification
 */
export async function notifyLowStock(input: NotifyLowStockInput): Promise<{ alerted: boolean }> {
  await updateYarnLowStockGauge();
  return { alerted: input.currentKg <= input.reorderLevel };
}

