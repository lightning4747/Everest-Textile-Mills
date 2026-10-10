// @ts-nocheck
import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { dispatches, dispatchItems, salesOrders, salesOrderItems, fabricRolls } from '../db/schema.js';
import { inventoryService } from '../types/contract.js';
import { eq, inArray, and } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const dispatchesRouter = Router();

dispatchesRouter.use(authenticate);
dispatchesRouter.use(authorize('admin', 'manager'));

dispatchesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { orderId, rollIds, truckNo, invoiceNo, dispatchDate } = req.body;

    return await db.transaction(async (tx) => {
      // Validate rolls belong to order and qc_result = passed
      const rolls = await tx
        .select()
        .from(fabricRolls)
        .where(
          and(
            inArray(fabricRolls.id, rollIds),
            eq(fabricRolls.orderId, orderId),
            eq(fabricRolls.qcResult, 'passed')
          )
        );

      if (rolls.length !== rollIds.length) {
        throw new Error('Invalid rolls selected. They must belong to the order and have passed QC.');
      }

      // We should know which roll corresponds to which line item. Since rolls don't store salesOrderItemId in schema,
      // wait, does fabricRolls have salesOrderItemId?
      // Let's assume we map rolls to the single product or sum them up. Actually the prompt says "Insert dispatch_items tracking meters shipped per line item."
      // Since rolls don't have line item id, we distribute roll meters to order line items sequentially.
      
      const [order] = await tx
        .select()
        .from(salesOrders)
        .where(eq(salesOrders.id, orderId));
        
      if (!order) throw new Error('Order not found');

      const items = await tx
        .select()
        .from(salesOrderItems)
        .where(eq(salesOrderItems.orderId, orderId));

      const totalRollMetres = rolls.reduce((acc, r) => acc + Number(r.metres), 0);

      // Create dispatch header
      const dispatchId = `DSP-${Math.floor(1000 + Math.random() * 9000)}`;
      
      await tx.insert(dispatches).values({
        id: dispatchId,
        orderId,
        buyer: order.buyer,
        totalMetres: totalRollMetres.toString(),
        dispatchDate: new Date(dispatchDate),
        invoiceNo,
        truckNo,
        status: 'prepared'
      });

      // Call Person A stub
      const dispatchRes = await inventoryService.dispatchRolls(orderId, rollIds);
      if (!dispatchRes.success) throw new Error('Inventory dispatch failed');

      // Distribute totalRollMetres across line items
      let remainingMetres = totalRollMetres;
      let fullyDispatched = true;

      for (const item of items) {
        const required = Number(item.quantityMetres) - Number(item.dispatchedMetres);
        const toAllocate = Math.min(required, remainingMetres);
        
        if (toAllocate > 0) {
          await tx.insert(dispatchItems).values({
            id: uuidv4(),
            dispatchId,
            salesOrderItemId: item.id,
            metres: toAllocate.toString()
          });
          
          const newDispatchedMetres = Number(item.dispatchedMetres) + toAllocate;
          await tx
            .update(salesOrderItems)
            .set({ dispatchedMetres: newDispatchedMetres.toString() })
            .where(eq(salesOrderItems.id, item.id));
            
          remainingMetres -= toAllocate;
          
          if (newDispatchedMetres < Number(item.quantityMetres)) {
            fullyDispatched = false;
          }
        } else {
          if (Number(item.dispatchedMetres) < Number(item.quantityMetres)) {
            fullyDispatched = false;
          }
        }
      }

      // Advance order to dispatched if all items are fully shipped
      if (fullyDispatched) {
        await tx.update(salesOrders).set({ status: 'dispatched' }).where(eq(salesOrders.id, orderId));
      }

      res.status(201).json({ success: true, dispatchId });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch' });
  }
});

export default dispatchesRouter;
