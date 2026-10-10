/**
 * Cross-module handoff services & stubs.
 *
 * Defines contracts, type signatures, and real/stub operations where Person A's
 * domain (Yarn, Machines) interacts with Person B's domain (Orders, QC, Dispatches).
 */

import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
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
  // Person A stub: Simulates checking machine status log
  return {
    available: true,
    currentStatus: 'idle',
    currentOrderId: null,
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
 * Handoff: Yarn (Person A) -> Dashboard / Alerts Notification
 */
export async function notifyLowStock(input: NotifyLowStockInput): Promise<{ alerted: boolean }> {
  return { alerted: true };
}
