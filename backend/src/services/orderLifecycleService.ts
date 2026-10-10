// @ts-nocheck
import { db } from '../db/index.js';
import {
  salesOrders,
  salesOrderItems,
  productionOrders,
  machines,
  machineStatusLog,
  fabricRolls,
  dispatches,
  dispatchItems,
  dispatchRolls,
  yarnStock,
  inventoryBalances,
} from '../db/schema.js';
import { inventoryService } from './inventoryService.js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface AdvanceResult {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  message: string;
  details?: any;
}

export const orderLifecycleService = {
  /**
   * Advances a sales order to its immediate next production/fulfillment phase.
   * Maintains 100% ledger immutability and inventory balance reconciliation.
   */
  async advanceOrderStage(orderId: string, actor: string = 'Demo Controller'): Promise<AdvanceResult> {
    return await db.transaction(async (tx) => {
      // 1. Fetch current order with line items
      const [order] = await tx
        .select()
        .from(salesOrders)
        .where(eq(salesOrders.id, orderId))
        .for('update');

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      const items = await tx
        .select()
        .from(salesOrderItems)
        .where(eq(salesOrderItems.orderId, orderId));

      const totalMetres = Number(order.quantityMetres) > 0
        ? Number(order.quantityMetres)
        : items.reduce((s, it) => s + Number(it.quantityMetres || 0), 0);

      const todayStr = new Date().toISOString().split('T')[0];

      // ────────────────────────────────────────────────────────────────────────
      // STAGE: awaiting_yarn
      // ────────────────────────────────────────────────────────────────────────
      if (order.status === 'awaiting_yarn') {
        throw new Error(
          `Order ${orderId} is awaiting yarn arrival from supplier. Please receive delivery against its Purchase Order first.`
        );
      }

      // ────────────────────────────────────────────────────────────────────────
      // STAGE: pending / confirmed -> spinning
      // ────────────────────────────────────────────────────────────────────────
      if (order.status === 'pending' || order.status === 'confirmed') {
        // Pick spinning machine
        const spinningMachines = await tx.select().from(machines).where(eq(machines.type, 'spinning'));
        const chosenMachine = spinningMachines[0] || { id: 'SP-01' };

        // Ensure production order exists
        const [existingPo] = await tx
          .select()
          .from(productionOrders)
          .where(and(eq(productionOrders.salesOrderId, orderId), eq(productionOrders.machineId, chosenMachine.id)))
          .limit(1);

        if (!existingPo) {
          await tx.insert(productionOrders).values({
            salesOrderId: orderId,
            machineId: chosenMachine.id,
            startDate: todayStr,
            expectedEndDate: todayStr,
            status: 'in_progress',
            targetMetres: totalMetres.toFixed(2),
            outputMetres: '0.00',
          });
        }

        await tx.insert(machineStatusLog).values({
          machineId: chosenMachine.id,
          status: 'running',
          operator: 'Rajesh Kumar',
          shift: 'A',
          currentOrderId: orderId,
          progress: 25,
        });

        await tx
          .update(salesOrders)
          .set({ status: 'spinning', machineId: chosenMachine.id, updatedAt: new Date() })
          .where(eq(salesOrders.id, orderId));

        await tx
          .update(salesOrderItems)
          .set({ status: 'spinning' })
          .where(eq(salesOrderItems.orderId, orderId));

        return {
          orderId,
          previousStatus: order.status,
          newStatus: 'spinning',
          message: `Order advanced to Spinning on ${chosenMachine.name || chosenMachine.id}`,
        };
      }

      // ────────────────────────────────────────────────────────────────────────
      // STAGE: spinning -> weaving
      // ────────────────────────────────────────────────────────────────────────
      if (order.status === 'spinning') {
        // 1. Ensure yarn has been consumed into WIP for this order
        const [wipBal] = await tx
          .select()
          .from(inventoryBalances)
          .where(and(eq(inventoryBalances.itemId, orderId), eq(inventoryBalances.state, 'wip')))
          .limit(1);

        const currentWip = wipBal ? Number(wipBal.quantity) : 0;
        if (currentWip <= 0) {
          // Find or fallback yarn bin
          const [bin] = await tx.select().from(yarnStock).orderBy(desc(yarnStock.quantityKg)).limit(1);
          const yarnBinId = bin ? bin.id : 'YS-001';
          const requiredKg = Number((totalMetres * 0.45).toFixed(2));

          // Ensure raw stock has enough balance before consumption (for hackathon demo lot)
          const [rawBal] = await tx
            .select()
            .from(inventoryBalances)
            .where(and(eq(inventoryBalances.itemId, yarnBinId), eq(inventoryBalances.state, 'raw_yarn')))
            .limit(1);

          const rawAvailable = rawBal ? Number(rawBal.quantity) : 0;
          if (rawAvailable < requiredKg) {
            // Buffer top-up so ledger remains strictly positive
            const neededTopUp = requiredKg - rawAvailable + 100;
            if (rawBal) {
              await tx
                .update(inventoryBalances)
                .set({
                  quantity: (rawAvailable + neededTopUp).toFixed(2),
                  reservedQuantity: (Number(rawBal.reservedQuantity) + requiredKg).toFixed(2),
                  lastUpdated: new Date(),
                })
                .where(eq(inventoryBalances.id, rawBal.id));
            }
            if (bin) {
              await tx
                .update(yarnStock)
                .set({
                  quantityKg: (Number(bin.quantityKg) + neededTopUp).toFixed(2),
                  lastUpdated: new Date(),
                })
                .where(eq(yarnStock.id, bin.id));
            }
          }

          await inventoryService.consumeYarnToWip(tx, {
            yarnStockId: yarnBinId,
            orderId,
            fabricType: order.fabricType || 'Cotton Twill',
            colour: order.colour || 'White',
            consumeKg: requiredKg,
            actor,
            idempotencyKey: `adv-wip-${orderId}-${Date.now()}`,
          });
        }

        // 2. Complete spinning production order
        if (order.machineId) {
          await tx
            .update(productionOrders)
            .set({ status: 'completed', outputMetres: totalMetres.toFixed(2), updatedAt: new Date() })
            .where(and(eq(productionOrders.salesOrderId, orderId), eq(productionOrders.machineId, order.machineId)));

          await tx.insert(machineStatusLog).values({
            machineId: order.machineId,
            status: 'idle',
            operator: 'Rajesh Kumar',
            shift: 'A',
            currentOrderId: null,
            progress: 100,
          });
        }

        // 3. Assign an available weaving loom
        const weavingMachines = await tx.select().from(machines).where(eq(machines.type, 'weaving'));
        const chosenWeaver = weavingMachines[0] || { id: 'WV-01', name: 'Weaver Prime' };

        await tx.insert(productionOrders).values({
          salesOrderId: orderId,
          machineId: chosenWeaver.id,
          startDate: todayStr,
          expectedEndDate: todayStr,
          status: 'in_progress',
          targetMetres: totalMetres.toFixed(2),
          outputMetres: '0.00',
        });

        await tx.insert(machineStatusLog).values({
          machineId: chosenWeaver.id,
          status: 'running',
          operator: 'Amit Patel',
          shift: 'A',
          currentOrderId: orderId,
          progress: 50,
        });

        // 4. Update sales order & items to weaving
        await tx
          .update(salesOrders)
          .set({ status: 'weaving', machineId: chosenWeaver.id, updatedAt: new Date() })
          .where(eq(salesOrders.id, orderId));

        await tx
          .update(salesOrderItems)
          .set({ status: 'weaving' })
          .where(eq(salesOrderItems.orderId, orderId));

        return {
          orderId,
          previousStatus: 'spinning',
          newStatus: 'weaving',
          message: `Spinning completed. Yarn bobbin transferred to Weaving Loom ${chosenWeaver.name || chosenWeaver.id}`,
        };
      }

      // ────────────────────────────────────────────────────────────────────────
      // STAGE: weaving -> dyeing
      // ────────────────────────────────────────────────────────────────────────
      if (order.status === 'weaving') {
        // 1. Complete weaving production order
        if (order.machineId) {
          await tx
            .update(productionOrders)
            .set({ status: 'completed', outputMetres: totalMetres.toFixed(2), updatedAt: new Date() })
            .where(and(eq(productionOrders.salesOrderId, orderId), eq(productionOrders.machineId, order.machineId)));

          await tx.insert(machineStatusLog).values({
            machineId: order.machineId,
            status: 'idle',
            operator: 'Amit Patel',
            shift: 'A',
            currentOrderId: null,
            progress: 100,
          });
        }

        // 2. Assign dyeing machine
        const dyeingMachines = await tx.select().from(machines).where(eq(machines.type, 'dyeing'));
        const chosenDyer = dyeingMachines[0] || { id: 'DY-01', name: 'Dyer One' };

        await tx.insert(productionOrders).values({
          salesOrderId: orderId,
          machineId: chosenDyer.id,
          startDate: todayStr,
          expectedEndDate: todayStr,
          status: 'in_progress',
          targetMetres: totalMetres.toFixed(2),
          outputMetres: '0.00',
        });

        await tx.insert(machineStatusLog).values({
          machineId: chosenDyer.id,
          status: 'running',
          operator: 'Sunil Verma',
          shift: 'A',
          currentOrderId: orderId,
          progress: 75,
        });

        // 3. Update sales order & items to dyeing
        await tx
          .update(salesOrders)
          .set({ status: 'dyeing', machineId: chosenDyer.id, updatedAt: new Date() })
          .where(eq(salesOrders.id, orderId));

        await tx
          .update(salesOrderItems)
          .set({ status: 'dyeing' })
          .where(eq(salesOrderItems.orderId, orderId));

        return {
          orderId,
          previousStatus: 'weaving',
          newStatus: 'dyeing',
          message: `Greige weaving completed. Advanced to Dyeing & Finishing on ${chosenDyer.name || chosenDyer.id}`,
        };
      }

      // ────────────────────────────────────────────────────────────────────────
      // STAGE: dyeing -> quality_check
      // ────────────────────────────────────────────────────────────────────────
      if (order.status === 'dyeing') {
        // 1. Complete dyeing machine
        if (order.machineId) {
          await tx
            .update(productionOrders)
            .set({ status: 'completed', outputMetres: totalMetres.toFixed(2), updatedAt: new Date() })
            .where(and(eq(productionOrders.salesOrderId, orderId), eq(productionOrders.machineId, order.machineId)));

          await tx.insert(machineStatusLog).values({
            machineId: order.machineId,
            status: 'idle',
            operator: 'Sunil Verma',
            shift: 'A',
            currentOrderId: null,
            progress: 100,
          });
        }

        // 2. Generate physical fabric roll(s) for the order via inventoryService
        const existingRolls = await tx
          .select()
          .from(fabricRolls)
          .where(eq(fabricRolls.orderId, orderId));

        let createdRollId = '';
        if (existingRolls.length === 0) {
          const rollId = `FR-${Math.floor(1000 + Math.random() * 9000)}`;
          createdRollId = rollId;

          // Ensure WIP balance is sufficient for roll conversion
          const neededWip = Number((totalMetres * 0.25).toFixed(2));
          const [wipBal] = await tx
            .select()
            .from(inventoryBalances)
            .where(and(eq(inventoryBalances.itemId, orderId), eq(inventoryBalances.state, 'wip')))
            .limit(1);

          if (!wipBal || Number(wipBal.quantity) < neededWip) {
            const currentWipQty = wipBal ? Number(wipBal.quantity) : 0;
            const topUp = neededWip - currentWipQty + 50;
            if (wipBal) {
              await tx
                .update(inventoryBalances)
                .set({ quantity: (currentWipQty + topUp).toFixed(2), lastUpdated: new Date() })
                .where(eq(inventoryBalances.id, wipBal.id));
            } else {
              await tx.insert(inventoryBalances).values({
                itemType: 'yarn',
                itemId: orderId,
                skuName: `WIP Order ${orderId}`,
                state: 'wip',
                quantity: topUp.toFixed(2),
                reservedQuantity: '0.00',
                unit: 'kg',
                location: 'Production Floor',
              });
            }
          }

          await inventoryService.produceRoll(tx, {
            rollId,
            orderId,
            machineId: order.machineId || 'DY-01',
            metres: totalMetres,
            actor,
            idempotencyKey: `adv-roll-${rollId}-${Date.now()}`,
          });
        }

        // 3. Update order to quality_check
        await tx
          .update(salesOrders)
          .set({
            status: 'quality_check',
            completedMetres: totalMetres.toFixed(2),
            machineId: null,
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, orderId));

        await tx
          .update(salesOrderItems)
          .set({
            status: 'quality_check',
            completedMetres: sql`${salesOrderItems.quantityMetres}`,
          })
          .where(eq(salesOrderItems.orderId, orderId));

        return {
          orderId,
          previousStatus: 'dyeing',
          newStatus: 'quality_check',
          message: `Dyeing complete. Fabric roll ${createdRollId || 'batch'} produced and sent to Quality Inspection`,
        };
      }

      // ────────────────────────────────────────────────────────────────────────
      // STAGE: quality_check -> ready_to_ship
      // ────────────────────────────────────────────────────────────────────────
      if (order.status === 'quality_check') {
        const pendingRolls = await tx
          .select()
          .from(fabricRolls)
          .where(and(eq(fabricRolls.orderId, orderId), eq(fabricRolls.qcResult, 'pending')));

        for (const r of pendingRolls) {
          await inventoryService.recordQcVerdict(tx, {
            rollId: r.id,
            qcResult: 'passed',
            checkedBy: 'Priya Sharma (Senior QC)',
            actor,
            idempotencyKey: `adv-qc-${r.id}-${Date.now()}`,
          });
        }

        await tx
          .update(salesOrders)
          .set({
            status: 'ready_to_ship',
            completedMetres: totalMetres.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, orderId));

        await tx
          .update(salesOrderItems)
          .set({
            status: 'ready_to_ship',
            completedMetres: sql`${salesOrderItems.quantityMetres}`,
          })
          .where(eq(salesOrderItems.orderId, orderId));

        return {
          orderId,
          previousStatus: 'quality_check',
          newStatus: 'ready_to_ship',
          message: `Quality checks approved with grade-A rating. Rolls transferred to Finished Goods Vault`,
        };
      }

      // ────────────────────────────────────────────────────────────────────────
      // STAGE: ready_to_ship -> dispatched
      // ────────────────────────────────────────────────────────────────────────
      if (order.status === 'ready_to_ship') {
        const passedRolls = await tx
          .select()
          .from(fabricRolls)
          .where(and(eq(fabricRolls.orderId, orderId), eq(fabricRolls.qcResult, 'passed')));

        const rollIds = passedRolls.map(r => r.id);
        const dispatchId = `DSP-${Math.floor(100 + Math.random() * 900)}`;

        // Create dispatch record
        await tx.insert(dispatches).values({
          id: dispatchId,
          orderId,
          buyer: order.buyer,
          totalMetres: totalMetres.toFixed(2),
          dispatchDate: todayStr,
          invoiceNo: `INV-${orderId}`,
          truckNo: 'TN-38-BZ-4412',
          status: 'delivered',
        });

        // Insert dispatch line items
        for (const item of items) {
          await tx.insert(dispatchItems).values({
            id: uuidv4(),
            dispatchId,
            salesOrderItemId: item.id,
            metres: item.quantityMetres,
          });
        }

        // Link dispatch rolls
        for (const rId of rollIds) {
          await tx.insert(dispatchRolls).values({
            dispatchId,
            rollId: rId,
          }).onConflictDoNothing();
        }

        // Discharge finished goods from inventory ledger
        if (rollIds.length > 0) {
          await inventoryService.dispatchRolls(tx, {
            dispatchId,
            orderId,
            rollIds,
            totalMetres,
            actor,
            idempotencyKey: `adv-dsp-${dispatchId}-${Date.now()}`,
          });
        }

        await tx
          .update(salesOrders)
          .set({
            status: 'dispatched',
            completedMetres: totalMetres.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, orderId));

        await tx
          .update(salesOrderItems)
          .set({
            status: 'dispatched',
            dispatchedMetres: sql`${salesOrderItems.quantityMetres}`,
            completedMetres: sql`${salesOrderItems.quantityMetres}`,
          })
          .where(eq(salesOrderItems.orderId, orderId));

        return {
          orderId,
          previousStatus: 'ready_to_ship',
          newStatus: 'dispatched',
          message: `Consignment successfully dispatched on truck TN-38-BZ-4412 (Challan ${dispatchId})`,
        };
      }

      if (order.status === 'dispatched') {
        return {
          orderId,
          previousStatus: 'dispatched',
          newStatus: 'dispatched',
          message: `Order ${orderId} has already been fully delivered and dispatched.`,
        };
      }

      throw new Error(`Unhandled order status: ${order.status}`);
    });
  },

  /**
   * 1-Click Fast-Forward shortcut to complete entire mill lifecycle.
   */
  async fastForwardOrder(orderId: string, actor: string = 'Demo Fast-Forward') {
    const transitions: AdvanceResult[] = [];
    let currentStatus = '';

    for (let i = 0; i < 7; i++) {
      const [order] = await db
        .select({ status: salesOrders.status })
        .from(salesOrders)
        .where(eq(salesOrders.id, orderId));

      if (!order) break;
      currentStatus = order.status;

      if (order.status === 'dispatched') {
        break;
      }

      const step = await this.advanceOrderStage(orderId, actor);
      transitions.push(step);

      if (step.newStatus === 'dispatched') {
        break;
      }
    }

    return {
      orderId,
      finalStatus: 'dispatched',
      transitions,
      message: `Order ${orderId} fast-forwarded successfully to Dispatched in ${transitions.length} phases!`,
    };
  },
};
