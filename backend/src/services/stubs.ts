/**
 * Cross-module handoff stubs.
 *
 * These define contracts, type signatures, and fake returns for points where
 * Person A's domain (Yarn, Machines) interacts with Person B's domain
 * (Orders, QC, Dispatches), preventing either developer from being blocked.
 */

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
  // STUB: Replace with transactional stock reservation
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
  // STUB: Replace with query on machineStatusLog
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
  // STUB: Replace with roll insertion + completedMetres update
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
 * Handoff: Yarn (Person A) -> Dashboard / Alerts Notification
 */
export async function notifyLowStock(input: NotifyLowStockInput): Promise<{ alerted: boolean }> {
  // STUB: Replace with notification dispatch or metric inc
  return { alerted: true };
}
