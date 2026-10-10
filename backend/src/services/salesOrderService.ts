// @ts-nocheck
import { db } from '../db/index.js';
import { salesOrders, salesOrderItems, products, yarnStock, machines, machineStatusLog, productionOrders } from '../db/schema.js';
import { inventoryService } from './inventoryService.js';
import { procurementService } from '../types/contract.js';
import { eq, inArray, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const salesOrderService = {
  createMultiFabricOrder: async (clientId: string, buyer: string, deliveryDate: string, items: any[]) => {
    return await db.transaction(async (tx) => {
      // 1. Fetch product snapshots
      const productIds = items.map(i => i.productId);
      const activeProducts = await tx
        .select()
        .from(products)
        .where(inArray(products.id, productIds));
        
      const productMap = new Map(activeProducts.map(p => [p.id, p]));
      
      let totalAmount = 0;
      let totalMetres = 0;
      
      // Calculate total amount and meters
      for (const item of items) {
        const prod = productMap.get(item.productId);
        if (!prod) throw new Error(`Product ${item.productId} not found`);
        const q = Number(item.quantityMetres);
        totalAmount += Number(prod.pricePerMetre) * q;
        totalMetres += q;
      }
      
      const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;

      // Determine default fabric display & colour for header
      let headerFabricType = 'Mixed';
      let headerColour = 'Mixed';
      if (items.length === 1) {
        const singleProd = productMap.get(items[0].productId)!;
        headerFabricType = singleProd.fabricType;
        headerColour = 'Standard';
      }

      // Check available spinning machines for scheduling
      const spinningMachines = await tx
        .select()
        .from(machines)
        .where(eq(machines.type, 'spinning'));

      let chosenMachineId = null;
      let isMachineIdle = false;

      for (const sm of spinningMachines) {
        const [latestStatus] = await tx
          .select()
          .from(machineStatusLog)
          .where(eq(machineStatusLog.machineId, sm.id))
          .orderBy(desc(machineStatusLog.recordedAt))
          .limit(1);

        if (!latestStatus || latestStatus.status === 'idle') {
          chosenMachineId = sm.id;
          isMachineIdle = true;
          break;
        }
      }

      if (!chosenMachineId && spinningMachines.length > 0) {
        chosenMachineId = spinningMachines[0].id;
      }
      
      const [order] = await tx
        .insert(salesOrders)
        .values({
          id: orderId,
          clientId,
          buyer,
          fabricType: headerFabricType,
          colour: headerColour,
          quantityMetres: totalMetres.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          deliveryDate: new Date(deliveryDate),
          status: 'pending',
          machineId: chosenMachineId,
        })
        .returning();
        
      let hasShortfall = false;
        
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const prod = productMap.get(item.productId)!;
        const requiredYarn = Number(prod.yarnKgPerMetre) * Number(item.quantityMetres);
        
        // Find matching yarn bin from inventory
        const matchingBins = await tx
          .select()
          .from(yarnStock)
          .where(eq(yarnStock.type, prod.yarnType))
          .orderBy(desc(yarnStock.quantityKg));

        const yarnBin = matchingBins[0];
        let itemStatus = 'confirmed' as any;

        if (!yarnBin) {
          itemStatus = 'awaiting_yarn';
          hasShortfall = true;
          await procurementService.createShortfallPO(orderId, requiredYarn);
        } else {
          try {
            await inventoryService.reserveYarnForOrder(tx, {
              yarnStockId: yarnBin.id,
              orderId,
              requiredKg: requiredYarn,
              yarnType: yarnBin.type,
              colour: yarnBin.colour,
              actor: buyer || 'Client Portal',
              idempotencyKey: `resv-${orderId}-${item.productId}-${i}-${Date.now()}`,
            });
          } catch (err: any) {
            console.warn(`Insufficient yarn for ${yarnBin.id}:`, err?.message);
            itemStatus = 'awaiting_yarn';
            hasShortfall = true;
            await procurementService.createShortfallPO(orderId, requiredYarn);
          }
        }
        
        await tx
          .insert(salesOrderItems)
          .values({
            id: uuidv4(),
            orderId: orderId,
            sequence: i + 1,
            productId: item.productId,
            quantityMetres: Number(item.quantityMetres).toFixed(2),
            unitPrice: prod.pricePerMetre,
            yarnKgPerMetre: prod.yarnKgPerMetre,
            status: itemStatus,
          });
      }
      
      // Derive header status
      let finalStatus = 'confirmed';
      if (hasShortfall) {
        finalStatus = 'awaiting_yarn';
      } else if (isMachineIdle && chosenMachineId) {
        finalStatus = 'spinning';
      }

      await tx.update(salesOrders).set({ status: finalStatus }).where(eq(salesOrders.id, orderId));
      order.status = finalStatus as any;
      order.quantityMetres = totalMetres.toFixed(2);
      order.fabricType = headerFabricType;
      order.colour = headerColour;
      order.machineId = chosenMachineId;

      // Create linked production order & update machine status if idle
      if (chosenMachineId) {
        const todayStr = new Date().toISOString().split('T')[0];
        const delivStr = typeof deliveryDate === 'string' ? deliveryDate.split('T')[0] : todayStr;
        const prodStatus = hasShortfall ? 'queued' : (isMachineIdle ? 'in_progress' : 'queued');

        await tx.insert(productionOrders).values({
          salesOrderId: orderId,
          machineId: chosenMachineId,
          startDate: todayStr,
          expectedEndDate: delivStr,
          status: prodStatus,
          targetMetres: totalMetres.toFixed(2),
          outputMetres: '0.00',
        });

        if (isMachineIdle && !hasShortfall) {
          await tx.insert(machineStatusLog).values({
            machineId: chosenMachineId,
            status: 'running',
            operator: 'Rajesh Kumar',
            shift: 'A',
            currentOrderId: orderId,
            progress: 0,
          });
        }
      }
      
      return order;
    });
  }
};
