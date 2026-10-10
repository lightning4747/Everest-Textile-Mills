// @ts-nocheck
import { db } from '../db/index.js';
import { salesOrders, salesOrderItems, products } from '../db/schema.js';
import { inventoryService, procurementService } from '../types/contract.js';
import { eq, inArray } from 'drizzle-orm';
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
      
      // Calculate total amount
      for (const item of items) {
        const prod = productMap.get(item.productId);
        if (!prod) throw new Error(`Product ${item.productId} not found`);
        totalAmount += Number(prod.pricePerMetre) * item.quantityMetres;
      }
      
      const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      
      const [order] = await tx
        .insert(salesOrders)
        .values({
          id: orderId,
          clientId,
          buyer,
          totalAmount: totalAmount.toFixed(2),
          deliveryDate: new Date(deliveryDate),
          status: 'pending',
        })
        .returning();
        
      let hasShortfall = false;
        
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const prod = productMap.get(item.productId)!;
        const requiredYarn = Number(prod.yarnKgPerMetre) * item.quantityMetres;
        
        // Handoff to Person A
        const reserveRes = await inventoryService.reserveYarnForOrder(orderId, requiredYarn);
        
        let itemStatus = 'confirmed' as any;
        if (!reserveRes.success || reserveRes.shortage > 0) {
          itemStatus = 'awaiting_yarn';
          hasShortfall = true;
          // Handoff to Person C
          await procurementService.createShortfallPO(orderId, requiredYarn); // or actual shortage
        }
        
        await tx
          .insert(salesOrderItems)
          .values({
            id: uuidv4(),
            orderId: orderId,
            sequence: i + 1,
            productId: item.productId,
            quantityMetres: item.quantityMetres.toString(),
            unitPrice: prod.pricePerMetre,
            yarnKgPerMetre: prod.yarnKgPerMetre,
            status: itemStatus,
          });
      }
      
      // Derive header status
      if (hasShortfall) {
        await tx.update(salesOrders).set({ status: 'awaiting_yarn' }).where(eq(salesOrders.id, orderId));
        order.status = 'awaiting_yarn' as any;
      } else {
        await tx.update(salesOrders).set({ status: 'confirmed' }).where(eq(salesOrders.id, orderId));
        order.status = 'confirmed' as any;
      }
      
      return order;
    });
  }
};
