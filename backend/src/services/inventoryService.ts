import { db } from '../db/index.js';
import {
  inventoryBalances,
  inventoryMovements,
  yarnStock,
  fabricRolls,
  salesOrders,
  dispatchRolls,
  type InventoryBalance,
  type InventoryMovement,
} from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  inventoryMovementsTotal,
  inventoryReconciliationDriftCount,
  inventoryLockWaitSeconds,
} from '../metrics.js';

import type { IInventoryService } from '../types/contract.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface BalanceTarget {
  itemType: 'yarn' | 'fabric' | 'scrap';
  itemId: string;
  skuName: string;
  state: 'raw_yarn' | 'wip' | 'fabric_pending_qc' | 'finished_goods' | 'scrap_fabric' | 'scrap_yarn';
  unit: string;
  location?: string;
}

export class InventoryService implements IInventoryService {
  /**
   * Pre-insert existence pattern and lock multiple rows in deterministic alphabetical order of (item_id, state).
   * This mathematically prevents deadlocks under high concurrency.
   */
  async acquireOrderedLocks(tx: Tx, targets: BalanceTarget[]): Promise<Map<string, InventoryBalance>> {
    // Sort targets by itemId ASC, then state ASC
    const sorted = [...targets].sort((a, b) => {
      if (a.itemId === b.itemId) {
        return a.state.localeCompare(b.state);
      }
      return a.itemId.localeCompare(b.itemId);
    });

    // 1. Pre-insert to guarantee existence
    for (const t of sorted) {
      await tx
        .insert(inventoryBalances)
        .values({
          itemType: t.itemType,
          itemId: t.itemId,
          skuName: t.skuName,
          state: t.state,
          quantity: '0',
          reservedQuantity: '0',
          unit: t.unit,
          location: t.location ?? 'Main Floor',
        })
        .onConflictDoNothing();
    }

    // 2. Acquire locks sequentially in sorted order
    const lockedMap = new Map<string, InventoryBalance>();
    for (const t of sorted) {
      const start = process.hrtime.bigint();
      const [locked] = await tx
        .select()
        .from(inventoryBalances)
        .where(and(eq(inventoryBalances.itemId, t.itemId), eq(inventoryBalances.state, t.state)))
        .for('update');

      const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
      inventoryLockWaitSeconds.observe(durationSec);

      if (!locked) {
        throw new Error(`Failed to acquire lock for ${t.itemId} in state ${t.state}`);
      }
      lockedMap.set(`${t.itemId}:${t.state}`, locked);
    }

    return lockedMap;
  }

  /**
   * Appends an immutable ledger movement and updates prometheus metrics.
   */
  private async appendMovement(
    tx: Tx,
    movement: {
      itemType: 'yarn' | 'fabric' | 'scrap';
      itemId: string;
      skuName: string;
      state: 'raw_yarn' | 'wip' | 'fabric_pending_qc' | 'finished_goods' | 'scrap_fabric' | 'scrap_yarn';
      direction: 'in' | 'out';
      quantity: number;
      quantityDelta: number;
      reservedDelta?: number;
      unit: string;
      reason:
        | 'receipt'
        | 'reservation'
        | 'unreservation'
        | 'consumption'
        | 'roll_production'
        | 'qc_pass'
        | 'qc_reject'
        | 'dispatch'
        | 'yield_variance'
        | 'adjustment'
        | 'cancellation';
      referenceType: string;
      referenceId: string;
      idempotencyKey?: string;
      actor: string;
      unitCostInr?: number;
      totalCostInr?: number;
      notes?: string;
    },
  ): Promise<InventoryMovement> {
    const [inserted] = await tx
      .insert(inventoryMovements)
      .values({
        itemType: movement.itemType,
        itemId: movement.itemId,
        skuName: movement.skuName,
        state: movement.state,
        direction: movement.direction,
        quantity: movement.quantity.toFixed(2),
        quantityDelta: movement.quantityDelta.toFixed(2),
        reservedDelta: (movement.reservedDelta ?? 0).toFixed(2),
        unit: movement.unit,
        reason: movement.reason,
        referenceType: movement.referenceType,
        referenceId: movement.referenceId,
        idempotencyKey: movement.idempotencyKey ?? null,
        actor: movement.actor,
        unitCostInr: movement.unitCostInr ? movement.unitCostInr.toFixed(2) : null,
        totalCostInr: movement.totalCostInr ? movement.totalCostInr.toFixed(2) : null,
        notes: movement.notes ?? null,
      })
      .returning();

    inventoryMovementsTotal.inc({
      state: movement.state,
      direction: movement.direction,
      reason: movement.reason,
    });

    return inserted;
  }

  /**
   * Records inward yarn delivery dock receipt.
   * Credits raw_yarn balance and appends 'receipt' movement.
   */
  async recordReceipt(
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
  ) {
    const skuName = `${data.yarnType} ${data.colour}`;
    const target: BalanceTarget = {
      itemType: 'yarn',
      itemId: data.yarnStockId,
      skuName,
      state: 'raw_yarn',
      unit: 'kg',
    };

    const locks = await this.acquireOrderedLocks(tx, [target]);
    const balance = locks.get(`${data.yarnStockId}:raw_yarn`)!;

    const newQty = Number(balance.quantity) + data.receiptKg;

    await tx
      .update(inventoryBalances)
      .set({
        quantity: newQty.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, balance.id));

    // Synchronize legacy yarn_stock for bin & threshold queries
    await tx
      .update(yarnStock)
      .set({
        quantityKg: newQty.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(yarnStock.id, data.yarnStockId));

    await this.appendMovement(tx, {
      itemType: 'yarn',
      itemId: data.yarnStockId,
      skuName,
      state: 'raw_yarn',
      direction: 'in',
      quantity: data.receiptKg,
      quantityDelta: data.receiptKg,
      reservedDelta: 0,
      unit: 'kg',
      reason: 'receipt',
      referenceType: 'yarn_receipt',
      referenceId: data.receiptId,
      idempotencyKey: data.idempotencyKey,
      actor: data.actor,
      unitCostInr: data.unitCostInr,
      totalCostInr: data.unitCostInr ? data.unitCostInr * data.receiptKg : undefined,
      notes: data.invoiceNo ? `Supplier Invoice: ${data.invoiceNo}` : undefined,
    });

    return { yarnStockId: data.yarnStockId, newQuantity: newQty };
  }

  /**
   * Reserves yarn stock for a confirmed sales order.
   * Increments reserved_quantity on raw_yarn bin without deducting physical on-hand quantity.
   */
  async reserveYarnForOrder(
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
  ) {
    const skuName = `${data.yarnType} ${data.colour}`;
    const target: BalanceTarget = {
      itemType: 'yarn',
      itemId: data.yarnStockId,
      skuName,
      state: 'raw_yarn',
      unit: 'kg',
    };

    const locks = await this.acquireOrderedLocks(tx, [target]);
    const balance = locks.get(`${data.yarnStockId}:raw_yarn`)!;

    const currentQty = Number(balance.quantity);
    const currentReserved = Number(balance.reservedQuantity);
    const available = currentQty - currentReserved;

    if (available < data.requiredKg) {
      throw new Error(`INSUFFICIENT_STOCK: Required ${data.requiredKg} kg, available ${available.toFixed(2)} kg`);
    }

    const newReserved = currentReserved + data.requiredKg;
    await tx
      .update(inventoryBalances)
      .set({
        reservedQuantity: newReserved.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, balance.id));

    await this.appendMovement(tx, {
      itemType: 'yarn',
      itemId: data.yarnStockId,
      skuName,
      state: 'raw_yarn',
      direction: 'out',
      quantity: data.requiredKg,
      quantityDelta: 0,
      reservedDelta: data.requiredKg,
      unit: 'kg',
      reason: 'reservation',
      referenceType: 'sales_order',
      referenceId: data.orderId,
      idempotencyKey: data.idempotencyKey,
      actor: data.actor,
      notes: `Reserved for order ${data.orderId}`,
    });

    return { yarnStockId: data.yarnStockId, reservedQuantity: newReserved, available: currentQty - newReserved };
  }

  /**
   * Releases yarn reservation (e.g. on order cancellation).
   */
  async releaseYarnReservation(
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
  ) {
    const skuName = `${data.yarnType} ${data.colour}`;
    const target: BalanceTarget = {
      itemType: 'yarn',
      itemId: data.yarnStockId,
      skuName,
      state: 'raw_yarn',
      unit: 'kg',
    };

    const locks = await this.acquireOrderedLocks(tx, [target]);
    const balance = locks.get(`${data.yarnStockId}:raw_yarn`)!;

    const currentReserved = Number(balance.reservedQuantity);
    const newReserved = Math.max(0, currentReserved - data.releaseKg);

    await tx
      .update(inventoryBalances)
      .set({
        reservedQuantity: newReserved.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, balance.id));

    await this.appendMovement(tx, {
      itemType: 'yarn',
      itemId: data.yarnStockId,
      skuName,
      state: 'raw_yarn',
      direction: 'in',
      quantity: data.releaseKg,
      quantityDelta: 0,
      reservedDelta: -data.releaseKg,
      unit: 'kg',
      reason: 'unreservation',
      referenceType: 'sales_order',
      referenceId: data.orderId,
      idempotencyKey: data.idempotencyKey,
      actor: data.actor,
      notes: `Unreserved for order ${data.orderId}`,
    });

    return { yarnStockId: data.yarnStockId, reservedQuantity: newReserved };
  }

  /**
   * Consumes reserved raw yarn into Work-in-Progress (spinning phase).
   * Debits raw_yarn (both quantity and reservedQuantity) and credits wip for order.
   */
  async consumeYarnToWip(
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
  ) {
    const rawTarget: BalanceTarget = {
      itemType: 'yarn',
      itemId: data.yarnStockId,
      skuName: `${data.fabricType} Yarn (${data.colour})`,
      state: 'raw_yarn',
      unit: 'kg',
    };
    const wipTarget: BalanceTarget = {
      itemType: 'yarn',
      itemId: data.orderId,
      skuName: `${data.fabricType} WIP (${data.colour})`,
      state: 'wip',
      unit: 'kg',
      location: 'Production Floor',
    };

    const locks = await this.acquireOrderedLocks(tx, [rawTarget, wipTarget]);
    const rawBalance = locks.get(`${data.yarnTargetId ?? data.yarnStockId}:raw_yarn`)!;
    const wipBalance = locks.get(`${data.orderId}:wip`)!;

    const newRawQty = Number(rawBalance.quantity) - data.consumeKg;
    const newRawReserved = Math.max(0, Number(rawBalance.reservedQuantity) - data.consumeKg);

    if (newRawQty < 0) {
      throw new Error(`INSUFFICIENT_STOCK: Cannot consume ${data.consumeKg} kg; raw stock is ${rawBalance.quantity}`);
    }

    const newWipQty = Number(wipBalance.quantity) + data.consumeKg;

    await tx
      .update(inventoryBalances)
      .set({
        quantity: newRawQty.toFixed(2),
        reservedQuantity: newRawReserved.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, rawBalance.id));

    await tx
      .update(inventoryBalances)
      .set({
        quantity: newWipQty.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, wipBalance.id));

    // Sync legacy yarn_stock
    await tx
      .update(yarnStock)
      .set({
        quantityKg: newRawQty.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(yarnStock.id, data.yarnStockId));

    // Dual movements
    await this.appendMovement(tx, {
      itemType: 'yarn',
      itemId: data.yarnStockId,
      skuName: rawTarget.skuName,
      state: 'raw_yarn',
      direction: 'out',
      quantity: data.consumeKg,
      quantityDelta: -data.consumeKg,
      reservedDelta: -data.consumeKg,
      unit: 'kg',
      reason: 'consumption',
      referenceType: 'sales_order',
      referenceId: data.orderId,
      idempotencyKey: data.idempotencyKey ? `${data.idempotencyKey}:out` : undefined,
      actor: data.actor,
      notes: `Consumed into WIP for order ${data.orderId}`,
    });

    await this.appendMovement(tx, {
      itemType: 'yarn',
      itemId: data.orderId,
      skuName: wipTarget.skuName,
      state: 'wip',
      direction: 'in',
      quantity: data.consumeKg,
      quantityDelta: data.consumeKg,
      reservedDelta: 0,
      unit: 'kg',
      reason: 'consumption',
      referenceType: 'sales_order',
      referenceId: data.orderId,
      idempotencyKey: data.idempotencyKey ? `${data.idempotencyKey}:in` : undefined,
      actor: data.actor,
      notes: `Received from raw yarn ${data.yarnStockId}`,
    });

    return { newRawQty, newWipQty };
  }

  /**
   * Produces a physical fabric roll.
   * Debits WIP by equivalent yarn consumed (metres * 0.25 kg) and credits fabric_pending_qc.
   * Inserts the fabric_rolls record.
   */
  async produceRoll(
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
  ) {
    const consumedKg = Number((data.metres * 0.25).toFixed(2));
    const producedDate = data.producedDate ?? new Date().toISOString().split('T')[0];

    const wipTarget: BalanceTarget = {
      itemType: 'yarn',
      itemId: data.orderId,
      skuName: `WIP Order ${data.orderId}`,
      state: 'wip',
      unit: 'kg',
      location: 'Production Floor',
    };
    const qcTarget: BalanceTarget = {
      itemType: 'fabric',
      itemId: data.orderId,
      skuName: `Fabric Order ${data.orderId}`,
      state: 'fabric_pending_qc',
      unit: 'metres',
      location: 'Grading Area',
    };

    const locks = await this.acquireOrderedLocks(tx, [wipTarget, qcTarget]);
    const wipBalance = locks.get(`${data.orderId}:wip`)!;
    const qcBalance = locks.get(`${data.orderId}:fabric_pending_qc`)!;

    // Deduct WIP with tolerance (if slightly short, log yield variance or floor at 0)
    const currentWip = Number(wipBalance.quantity);
    const newWip = Math.max(0, currentWip - consumedKg);
    const newQcMetres = Number(qcBalance.quantity) + data.metres;

    await tx
      .update(inventoryBalances)
      .set({
        quantity: newWip.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, wipBalance.id));

    await tx
      .update(inventoryBalances)
      .set({
        quantity: newQcMetres.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, qcBalance.id));

    // Append ledger movements
    await this.appendMovement(tx, {
      itemType: 'yarn',
      itemId: data.orderId,
      skuName: wipTarget.skuName,
      state: 'wip',
      direction: 'out',
      quantity: consumedKg,
      quantityDelta: -consumedKg,
      reservedDelta: 0,
      unit: 'kg',
      reason: 'roll_production',
      referenceType: 'fabric_roll',
      referenceId: data.rollId,
      idempotencyKey: data.idempotencyKey ? `${data.idempotencyKey}:wip` : undefined,
      actor: data.actor,
      notes: `Used ${consumedKg} kg yarn to weave roll ${data.rollId}`,
    });

    await this.appendMovement(tx, {
      itemType: 'fabric',
      itemId: data.orderId,
      skuName: qcTarget.skuName,
      state: 'fabric_pending_qc',
      direction: 'in',
      quantity: data.metres,
      quantityDelta: data.metres,
      reservedDelta: 0,
      unit: 'metres',
      reason: 'roll_production',
      referenceType: 'fabric_roll',
      referenceId: data.rollId,
      idempotencyKey: data.idempotencyKey ? `${data.idempotencyKey}:qc` : undefined,
      actor: data.actor,
      notes: `Woven on machine ${data.machineId}`,
    });

    // Insert physical roll
    const [roll] = await tx
      .insert(fabricRolls)
      .values({
        id: data.rollId,
        orderId: data.orderId,
        machineId: data.machineId,
        metres: String(data.metres),
        producedDate,
        qcResult: 'pending',
        defects: null,
      })
      .returning();

    return roll;
  }

  /**
   * Records QC inspection verdict ('passed' or 'rejected').
   * Debits fabric_pending_qc and credits finished_goods (if passed) or scrap_fabric (if rejected).
   */
  async recordQcVerdict(
    tx: Tx,
    data: {
      rollId: string;
      qcResult: 'passed' | 'rejected';
      checkedBy: string;
      defects?: string[];
      actor: string;
      idempotencyKey?: string;
    },
  ) {
    const [roll] = await tx
      .select()
      .from(fabricRolls)
      .where(and(eq(fabricRolls.id, data.rollId), eq(fabricRolls.qcResult, 'pending')))
      .for('update');

    if (!roll) {
      throw new Error(`CONCURRENT_QC_MODIFICATION`);
    }

    const metres = Number(roll.metres);
    const destState = data.qcResult === 'passed' ? 'finished_goods' : 'scrap_fabric';
    const reason = data.qcResult === 'passed' ? 'qc_pass' : 'qc_reject';

    const qcTarget: BalanceTarget = {
      itemType: 'fabric',
      itemId: roll.orderId,
      skuName: `Fabric Order ${roll.orderId}`,
      state: 'fabric_pending_qc',
      unit: 'metres',
    };
    const destTarget: BalanceTarget = {
      itemType: 'fabric',
      itemId: roll.orderId,
      skuName: `Fabric Order ${roll.orderId} (${destState})`,
      state: destState,
      unit: 'metres',
      location: destState === 'finished_goods' ? 'Finished Goods Vault' : 'Scrap Storage',
    };

    const locks = await this.acquireOrderedLocks(tx, [qcTarget, destTarget]);
    const qcBalance = locks.get(`${roll.orderId}:fabric_pending_qc`)!;
    const destBalance = locks.get(`${roll.orderId}:${destState}`)!;

    const newQcMetres = Math.max(0, Number(qcBalance.quantity) - metres);
    const newDestMetres = Number(destBalance.quantity) + metres;

    await tx
      .update(inventoryBalances)
      .set({
        quantity: newQcMetres.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, qcBalance.id));

    await tx
      .update(inventoryBalances)
      .set({
        quantity: newDestMetres.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, destBalance.id));

    // Ledger movements
    await this.appendMovement(tx, {
      itemType: 'fabric',
      itemId: roll.orderId,
      skuName: qcTarget.skuName,
      state: 'fabric_pending_qc',
      direction: 'out',
      quantity: metres,
      quantityDelta: -metres,
      reservedDelta: 0,
      unit: 'metres',
      reason,
      referenceType: 'fabric_roll',
      referenceId: roll.id,
      idempotencyKey: data.idempotencyKey ? `${data.idempotencyKey}:out` : undefined,
      actor: data.actor,
      notes: `QC decision: ${data.qcResult}`,
    });

    await this.appendMovement(tx, {
      itemType: 'fabric',
      itemId: roll.orderId,
      skuName: destTarget.skuName,
      state: destState,
      direction: 'in',
      quantity: metres,
      quantityDelta: metres,
      reservedDelta: 0,
      unit: 'metres',
      reason,
      referenceType: 'fabric_roll',
      referenceId: roll.id,
      idempotencyKey: data.idempotencyKey ? `${data.idempotencyKey}:in` : undefined,
      actor: data.actor,
      notes: data.defects && data.defects.length > 0 ? `Defects: ${data.defects.join(', ')}` : undefined,
    });

    // Update fabric roll
    const [updatedRoll] = await tx
      .update(fabricRolls)
      .set({
        qcResult: data.qcResult,
        checkedBy: data.checkedBy,
        checkedAt: new Date(),
        defects: data.defects ?? null,
      })
      .where(eq(fabricRolls.id, roll.id))
      .returning();

    return updatedRoll;
  }

  /**
   * Dispatches passed rolls to customer delivery truck.
   * Debits finished_goods balance and records 'dispatch' movement.
   */
  async dispatchRolls(
    tx: Tx,
    data: {
      dispatchId: string;
      orderId: string;
      rollIds: string[];
      totalMetres: number;
      actor: string;
      idempotencyKey?: string;
    },
  ) {
    const fgTarget: BalanceTarget = {
      itemType: 'fabric',
      itemId: data.orderId,
      skuName: `Fabric Order ${data.orderId}`,
      state: 'finished_goods',
      unit: 'metres',
    };

    const locks = await this.acquireOrderedLocks(tx, [fgTarget]);
    const fgBalance = locks.get(`${data.orderId}:finished_goods`)!;

    const currentFg = Number(fgBalance.quantity);
    if (currentFg < data.totalMetres) {
      throw new Error(`INSUFFICIENT_STOCK: Finished goods has ${currentFg}m, dispatch requires ${data.totalMetres}m`);
    }

    const newFg = currentFg - data.totalMetres;
    await tx
      .update(inventoryBalances)
      .set({
        quantity: newFg.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, fgBalance.id));

    await this.appendMovement(tx, {
      itemType: 'fabric',
      itemId: data.orderId,
      skuName: fgTarget.skuName,
      state: 'finished_goods',
      direction: 'out',
      quantity: data.totalMetres,
      quantityDelta: -data.totalMetres,
      reservedDelta: 0,
      unit: 'metres',
      reason: 'dispatch',
      referenceType: 'dispatch',
      referenceId: data.dispatchId,
      idempotencyKey: data.idempotencyKey,
      actor: data.actor,
      notes: `Dispatched ${data.rollIds.length} rolls on ${data.dispatchId}`,
    });

    return { newFg };
  }

  /**
   * Adjusts physical inventory with mandatory audited explanation (admin only).
   */
  async adjustBalance(
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
  ) {
    const unit = data.unit ?? (data.itemType === 'yarn' ? 'kg' : 'metres');
    const target: BalanceTarget = {
      itemType: data.itemType,
      itemId: data.itemId,
      skuName: data.skuName,
      state: data.state,
      unit,
    };

    const locks = await this.acquireOrderedLocks(tx, [target]);
    const balance = locks.get(`${data.itemId}:${data.state}`)!;

    const oldQty = Number(balance.quantity);
    const delta = data.newQuantity - oldQty;
    const direction = delta >= 0 ? 'in' : 'out';

    await tx
      .update(inventoryBalances)
      .set({
        quantity: data.newQuantity.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(inventoryBalances.id, balance.id));

    if (data.state === 'raw_yarn') {
      await tx
        .update(yarnStock)
        .set({
          quantityKg: data.newQuantity.toFixed(2),
          lastUpdated: new Date(),
        })
        .where(eq(yarnStock.id, data.itemId));
    }

    await this.appendMovement(tx, {
      itemType: data.itemType,
      itemId: data.itemId,
      skuName: data.skuName,
      state: data.state,
      direction,
      quantity: Math.abs(delta),
      quantityDelta: delta,
      reservedDelta: 0,
      unit,
      reason: 'adjustment',
      referenceType: 'manual_adjustment',
      referenceId: `ADJ-${Date.now()}`,
      idempotencyKey: data.idempotencyKey,
      actor: data.actor,
      notes: data.reasonNote,
    });

    return { oldQuantity: oldQty, newQuantity: data.newQuantity, delta };
  }

  /**
   * Automated 4-Way Inventory Reconciliation Audit.
   * Compares balances against ledger movement deltas and physical rolls.
   */
  async reconcileInventory(tx?: Tx) {
    const executor = tx ?? db;

    // 1. Balance vs Ledger Sum: Physical Balance == SUM(quantity_delta) for every item & state
    const allBalances = await executor.select().from(inventoryBalances);
    const movementSums = await executor
      .select({
        itemId: inventoryMovements.itemId,
        state: inventoryMovements.state,
        sumDelta: sql<string>`coalesce(sum(${inventoryMovements.quantityDelta}), 0)`,
      })
      .from(inventoryMovements)
      .groupBy(inventoryMovements.itemId, inventoryMovements.state);

    const movMap = new Map<string, number>();
    for (const m of movementSums) {
      movMap.set(`${m.itemId}:${m.state}`, Number(m.sumDelta));
    }

    let driftCount = 0;
    const balanceVsLedgerChecks = allBalances.map((b) => {
      const balance = Number(b.quantity);
      const ledgerSum = movMap.get(`${b.itemId}:${b.state}`) ?? 0;
      const drift = Math.abs(balance - ledgerSum);
      if (drift > 0.01) driftCount++;
      return {
        itemId: b.itemId,
        state: b.state,
        balance,
        ledgerSum,
        drift,
        status: drift <= 0.01 ? 'MATCH' : 'DRIFT_DETECTED',
      };
    });

    // 2. Finished Goods vs Unshipped Passed Rolls:
    // Finished Goods balance == SUM(metres) of passed rolls for that order NOT in dispatch_rolls
    const dispatchedRollRows = await executor.select({ rollId: dispatchRolls.rollId }).from(dispatchRolls);
    const dispatchedRollIds = new Set(dispatchedRollRows.map((r) => r.rollId));

    const passedRolls = await executor
      .select()
      .from(fabricRolls)
      .where(eq(fabricRolls.qcResult, 'passed'));

    const unshippedPassedByOrder = new Map<string, number>();
    for (const r of passedRolls) {
      if (!dispatchedRollIds.has(r.id)) {
        unshippedPassedByOrder.set(r.orderId, (unshippedPassedByOrder.get(r.orderId) ?? 0) + Number(r.metres));
      }
    }

    const fgBalances = allBalances.filter((b) => b.state === 'finished_goods');
    const finishedGoodsVsRollsChecks = fgBalances.map((b) => {
      const balance = Number(b.quantity);
      const rollSum = unshippedPassedByOrder.get(b.itemId) ?? 0;
      const drift = Math.abs(balance - rollSum);
      if (drift > 0.01) driftCount++;
      return {
        orderId: b.itemId,
        balance,
        rollSum,
        drift,
        status: drift <= 0.01 ? 'MATCH' : 'DRIFT_DETECTED',
      };
    });

    // 3. Pending QC vs Uninspected Rolls:
    // Pending QC balance == SUM(metres) of rolls where qc_result = 'pending'
    const pendingRolls = await executor
      .select()
      .from(fabricRolls)
      .where(eq(fabricRolls.qcResult, 'pending'));

    const pendingByOrder = new Map<string, number>();
    for (const r of pendingRolls) {
      pendingByOrder.set(r.orderId, (pendingByOrder.get(r.orderId) ?? 0) + Number(r.metres));
    }

    const pendingBalances = allBalances.filter((b) => b.state === 'fabric_pending_qc');
    const pendingQcVsRollsChecks = pendingBalances.map((b) => {
      const balance = Number(b.quantity);
      const rollSum = pendingByOrder.get(b.itemId) ?? 0;
      const drift = Math.abs(balance - rollSum);
      if (drift > 0.01) driftCount++;
      return {
        orderId: b.itemId,
        balance,
        rollSum,
        drift,
        status: drift <= 0.01 ? 'MATCH' : 'DRIFT_DETECTED',
      };
    });

    // 4. Dispatched Total Metres vs dispatch_rolls Sum:
    // Total dispatched metres in movements ledger == Total metres of rolls in dispatch_rolls
    const dispatchedMovements = await executor
      .select({
        total: sql<string>`coalesce(sum(${inventoryMovements.quantity}), 0)`,
      })
      .from(inventoryMovements)
      .where(and(eq(inventoryMovements.state, 'finished_goods'), eq(inventoryMovements.reason, 'dispatch')));

    const dispatchRollSumRows = await executor
      .select({
        total: sql<string>`coalesce(sum(${fabricRolls.metres}), 0)`,
      })
      .from(dispatchRolls)
      .innerJoin(fabricRolls, eq(dispatchRolls.rollId, fabricRolls.id));

    const totalDispatchedLedger = Number(dispatchedMovements[0]?.total ?? 0);
    const totalDispatchedRolls = Number(dispatchRollSumRows[0]?.total ?? 0);
    const dispatchDrift = Math.abs(totalDispatchedLedger - totalDispatchedRolls);
    if (dispatchDrift > 0.01) driftCount++;

    const dispatchVsRollsCheck = {
      ledgerDispatched: totalDispatchedLedger,
      rollDispatched: totalDispatchedRolls,
      drift: dispatchDrift,
      status: dispatchDrift <= 0.01 ? 'MATCH' : 'DRIFT_DETECTED',
    };

    // Update Prometheus reconciliation gauge
    inventoryReconciliationDriftCount.set(driftCount);

    return {
      status: driftCount === 0 ? 'CONSISTENT' : 'DRIFT_DETECTED',
      driftCount,
      timestamp: new Date().toISOString(),
      checks: {
        balanceVsLedger: balanceVsLedgerChecks,
        finishedGoodsVsRolls: finishedGoodsVsRollsChecks,
        pendingQcVsRolls: pendingQcVsRollsChecks,
        dispatchVsRolls: dispatchVsRollsCheck,
      },
    };
  }

  /**
   * Retrieves current inventory balances with optional filters.
   */
  async getBalances(filters: { state?: string; itemType?: string; search?: string }) {
    const conditions = [];

    if (filters.state) {
      conditions.push(eq(inventoryBalances.state, filters.state as any));
    }
    if (filters.itemType) {
      conditions.push(eq(inventoryBalances.itemType, filters.itemType as any));
    }
    if (filters.search) {
      const q = `%${filters.search}%`;
      conditions.push(sql`(${inventoryBalances.itemId} ILIKE ${q} OR ${inventoryBalances.skuName} ILIKE ${q})`);
    }

    const rows = conditions.length > 0
      ? await db.select().from(inventoryBalances).where(and(...conditions)).orderBy(inventoryBalances.itemId)
      : await db.select().from(inventoryBalances).orderBy(inventoryBalances.itemId);

    return rows.map((r) => {
      const quantity = Number(r.quantity);
      const reservedQuantity = Number(r.reservedQuantity);
      return {
        id: r.id,
        itemType: r.itemType,
        itemId: r.itemId,
        skuName: r.skuName,
        state: r.state,
        quantity,
        reservedQuantity,
        availableQuantity: quantity - reservedQuantity,
        unit: r.unit,
        location: r.location,
        lastUpdated: r.lastUpdated,
      };
    });
  }

  /**
   * Retrieves paginated immutable movement ledger.
   */
  async getMovements(filters: { itemId?: string; state?: string; reason?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters.itemId) {
      conditions.push(eq(inventoryMovements.itemId, filters.itemId));
    }
    if (filters.state) {
      conditions.push(eq(inventoryMovements.state, filters.state as any));
    }
    if (filters.reason) {
      conditions.push(eq(inventoryMovements.reason, filters.reason as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(inventoryMovements)
      .where(whereClause);

    const total = countRow?.total ?? 0;

    const rows = await db
      .select()
      .from(inventoryMovements)
      .where(whereClause)
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((r) => ({
        id: r.id,
        itemType: r.itemType,
        itemId: r.itemId,
        skuName: r.skuName,
        state: r.state,
        direction: r.direction,
        quantity: Number(r.quantity),
        quantityDelta: Number(r.quantityDelta),
        reservedDelta: Number(r.reservedDelta),
        unit: r.unit,
        reason: r.reason,
        referenceType: r.referenceType,
        referenceId: r.referenceId,
        idempotencyKey: r.idempotencyKey,
        actor: r.actor,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const inventoryService = new InventoryService();
