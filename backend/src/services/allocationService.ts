// @ts-nocheck
import { db } from '../db/index.js';
import {
  restockAllocationQueue,
  salesOrders,
  salesOrderItems,
  yarnStock,
  machines,
  machineStatusLog,
  productionOrders,
} from '../db/schema.js';
import { inventoryService } from './inventoryService.js';
import { eq, and, asc, desc } from 'drizzle-orm';

export interface AllocationParams {
  yarnStockId: string;
  receivedKg: number;
  actor: string;
  yarnType?: string;
  colour?: string;
}

export const allocationService = {
  processRestockAllocation: async (txOrDb: any, params: AllocationParams) => {
    const tx = txOrDb || db;

    let remainingArrived = params.receivedKg;
    if (remainingArrived <= 0) return { allocatedTotal: 0, unlockedOrders: [] };

    // Resolve yarn details if not passed
    let yarnType = params.yarnType;
    let colour = params.colour;
    if (!yarnType || !colour) {
      const [bin] = await tx
        .select()
        .from(yarnStock)
        .where(eq(yarnStock.id, params.yarnStockId))
        .limit(1);
      if (bin) {
        yarnType = bin.type;
        colour = bin.colour;
      }
    }

    // 1. Fetch unsatisfied FIFO queue entries for this yarn bin
    const pendingEntries = await tx
      .select()
      .from(restockAllocationQueue)
      .where(
        and(
          eq(restockAllocationQueue.yarnStockId, params.yarnStockId),
          eq(restockAllocationQueue.isSatisfied, false)
        )
      )
      .orderBy(asc(restockAllocationQueue.createdAt));

    let allocatedTotal = 0;
    const unlockedOrders: string[] = [];

    for (const entry of pendingEntries) {
      if (remainingArrived <= 0) break;

      const shortfall = Number(entry.shortfallKg);
      const allocated = Number(entry.allocatedKg);
      const remainingNeeded = Math.max(0, shortfall - allocated);

      const toAllocate = Math.min(remainingNeeded, remainingArrived);
      if (toAllocate <= 0) continue;

      // Reserve newly arrived stock directly for this order
      await inventoryService.reserveYarnForOrder(tx, {
        yarnStockId: params.yarnStockId,
        orderId: entry.salesOrderId,
        requiredKg: toAllocate,
        yarnType: yarnType || 'Cotton',
        colour: colour || 'White',
        actor: params.actor || 'Restock Allocator',
        idempotencyKey: `alloc-${entry.id}-${Date.now()}-${allocatedTotal}`,
      });

      const newAllocated = allocated + toAllocate;
      const isSatisfied = newAllocated >= shortfall;

      // Update queue entry
      await tx
        .update(restockAllocationQueue)
        .set({
          allocatedKg: newAllocated.toFixed(2),
          isSatisfied,
        })
        .where(eq(restockAllocationQueue.id, entry.id));

      allocatedTotal += toAllocate;
      remainingArrived -= toAllocate;

      // If this shortfall is fully satisfied, unlock the line item
      if (isSatisfied) {
        await tx
          .update(salesOrderItems)
          .set({ status: 'confirmed' })
          .where(eq(salesOrderItems.id, entry.salesOrderItemId));

        // Check if all line items in this sales order are confirmed
        const allItems = await tx
          .select()
          .from(salesOrderItems)
          .where(eq(salesOrderItems.orderId, entry.salesOrderId));

        const hasPendingItems = allItems.some(
          (item) => item.status === 'awaiting_yarn' || item.status === 'pending'
        );

        if (!hasPendingItems) {
          // Check for idle spinning machine to schedule immediately
          const spinningMachines = await tx
            .select()
            .from(machines)
            .where(eq(machines.type, 'spinning'));

          let idleMachineId = null;
          for (const sm of spinningMachines) {
            const [latestStatus] = await tx
              .select()
              .from(machineStatusLog)
              .where(eq(machineStatusLog.machineId, sm.id))
              .orderBy(desc(machineStatusLog.recordedAt))
              .limit(1);

            if (!latestStatus || latestStatus.status === 'idle') {
              idleMachineId = sm.id;
              break;
            }
          }

          const targetStatus = idleMachineId ? 'spinning' : 'confirmed';

          await tx
            .update(salesOrders)
            .set({
              status: targetStatus,
              machineId: idleMachineId || undefined,
            })
            .where(eq(salesOrders.id, entry.salesOrderId));

          // Advance linked production orders
          await tx
            .update(productionOrders)
            .set({
              status: idleMachineId ? 'in_progress' : 'queued',
              machineId: idleMachineId || undefined,
            })
            .where(eq(productionOrders.salesOrderId, entry.salesOrderId));

          if (idleMachineId) {
            await tx.insert(machineStatusLog).values({
              machineId: idleMachineId,
              status: 'running',
              operator: 'Rajesh Kumar',
              shift: 'A',
              currentOrderId: entry.salesOrderId,
              progress: 0,
            });
          }

          unlockedOrders.push(entry.salesOrderId);
        }
      }
    }

    return { allocatedTotal, unlockedOrders };
  },
};
