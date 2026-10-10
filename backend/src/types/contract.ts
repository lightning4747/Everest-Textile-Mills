import type { Tx } from '../db/index.js';
import type { InventoryBalance, InventoryMovement, FabricRoll } from '../db/schema.js';

export interface IInventoryService {
  recordReceipt(
    tx: Tx,
    data: {
      yarnStockId: string;
      receiptKg: number;
      yarnType: string;
      colour: string;
      actor: string;
      invoiceNo?: string;
      idempotencyKey?: string;
      unitCostInr?: number;
      receiptId: string;
    },
  ): Promise<{ yarnStockId: string; newQuantity: number }>;

  reserveYarnForOrder(
    tx: Tx,
    data: {
      yarnStockId: string;
      orderId: string;
      requiredKg: number;
      yarnType: string;
      colour: string;
      actor: string;
      idempotencyKey?: string;
    },
  ): Promise<{ yarnStockId: string; reservedQuantity: number; available: number }>;

  releaseYarnReservation(
    tx: Tx,
    data: {
      yarnStockId: string;
      orderId: string;
      releaseKg: number;
      yarnType: string;
      colour: string;
      actor: string;
      idempotencyKey?: string;
    },
  ): Promise<{ yarnStockId: string; reservedQuantity: number }>;

  consumeYarnToWip(
    tx: Tx,
    data: {
      yarnStockId: string;
      orderId: string;
      fabricType: string;
      colour: string;
      consumeKg: number;
      actor: string;
      idempotencyKey?: string;
    },
  ): Promise<{ newRawQty: number; newWipQty: number }>;

  produceRoll(
    tx: Tx,
    data: {
      rollId: string;
      orderId: string;
      machineId: string;
      metres: number;
      producedDate?: string;
      actor: string;
      idempotencyKey?: string;
    },
  ): Promise<FabricRoll>;

  recordQcVerdict(
    tx: Tx,
    data: {
      rollId: string;
      qcResult: 'passed' | 'rejected';
      checkedBy: string;
      defects?: string[];
      actor: string;
      idempotencyKey?: string;
    },
  ): Promise<FabricRoll>;

  dispatchRolls(
    tx: Tx,
    data: {
      dispatchId: string;
      orderId: string;
      rollIds: string[];
      totalMetres: number;
      actor: string;
      idempotencyKey?: string;
    },
  ): Promise<{ newFg: number }>;

  adjustBalance(
    tx: Tx,
    data: {
      itemId: string;
      state: 'raw_yarn' | 'wip' | 'fabric_pending_qc' | 'finished_goods' | 'scrap_fabric' | 'scrap_yarn';
      itemType: 'yarn' | 'fabric' | 'scrap';
      skuName: string;
      newQuantity: number;
      reasonNote: string;
      actor: string;
      unit?: string;
      idempotencyKey?: string;
    },
  ): Promise<{ oldQuantity: number; newQuantity: number; delta: number }>;

  reconcileInventory(tx?: Tx): Promise<any>;

  getBalances(filters: { state?: string; itemType?: string; search?: string }): Promise<any[]>;

  getMovements(filters: {
    itemId?: string;
    state?: string;
    reason?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; meta: any }>;
}
