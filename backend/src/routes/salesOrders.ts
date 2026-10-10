// @ts-nocheck
import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { salesOrders, salesOrderItems, products } from '../db/schema.js';
import { salesOrderService } from '../services/salesOrderService.js';
import { orderLifecycleService } from '../services/orderLifecycleService.js';
import { eq, desc } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth.js';

export const salesOrdersRouter = Router();

salesOrdersRouter.use(authenticate);

salesOrdersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orders = await db
      .select()
      .from(salesOrders)
      .orderBy(desc(salesOrders.createdDate), desc(salesOrders.id));

    const allItems = await db.select().from(salesOrderItems);
    const allProducts = await db.select().from(products);
    const productMap = new Map(allProducts.map(p => [p.id, p]));

    const ordersWithItems = orders.map((order) => {
      const items = allItems
        .filter((item) => item.orderId === order.id)
        .map((item) => ({
          ...item,
          product: productMap.get(item.productId),
        }));

      const itemsQty = items.reduce((s, i) => s + (Number(i.quantityMetres) || 0), 0);
      const itemsCompleted = items.reduce((s, i) => s + (Number(i.completedMetres) || 0), 0);
      const totalQty = (Number(order.quantityMetres) > 0) ? Number(order.quantityMetres) : itemsQty;
      const totalCompleted = (Number(order.completedMetres) > 0) ? Number(order.completedMetres) : itemsCompleted;

      let fabricType = order.fabricType;
      let colour = order.colour;
      if (!fabricType || fabricType === 'Mixed') {
        if (items.length === 1) {
          fabricType = items[0].product?.fabricType || 'Mixed';
          colour = colour || 'Standard';
        } else if (items.length > 1) {
          fabricType = 'Mixed';
          colour = 'Mixed';
        }
      }

      return {
        ...order,
        quantityMetres: totalQty.toFixed(2),
        completedMetres: totalCompleted.toFixed(2),
        fabricType: fabricType || 'Mixed',
        colour: colour || 'Standard',
        items,
      };
    });

    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

salesOrdersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [order] = await db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.id, id));

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const items = await db
      .select()
      .from(salesOrderItems)
      .where(eq(salesOrderItems.orderId, id));

    const allProducts = await db.select().from(products);
    const productMap = new Map(allProducts.map(p => [p.id, p]));

    const itemsWithProduct = items.map(item => ({
      ...item,
      product: productMap.get(item.productId),
    }));

    res.json({ ...order, items: itemsWithProduct });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

salesOrdersRouter.post('/', authorize('admin', 'manager', 'client'), async (req: Request, res: Response) => {
  try {
    const { buyer, deliveryDate, items } = req.body;
    // req.user!.sub is the logged-in user id, assuming it is the client ID if they are creating it, but for internal it might be a selected client.
    // Let's assume for admin/manager we pass clientId in body, or just use their id.
    const clientId = req.body.clientId || req.user!.sub;

    const newOrder = await salesOrderService.createMultiFabricOrder(clientId, buyer, deliveryDate, items);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create sales order' });
  }
});

/**
 * POST /api/v1/sales-orders/:id/advance
 * Advances sales order to the next manufacturing/QC/dispatch phase.
 */
salesOrdersRouter.post('/:id/advance', authorize('admin', 'manager', 'operator'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = req.user?.username || req.user?.name || 'Demo Controller';
    const result = await orderLifecycleService.advanceOrderStage(id, actor);
    res.json(result);
  } catch (err: any) {
    console.error(`Failed to advance order ${req.params.id}:`, err);
    res.status(400).json({ error: err.message || 'Failed to advance order' });
  }
});

/**
 * POST /api/v1/sales-orders/:id/fast-forward
 * Fast-forwards the order completely to 'dispatched'.
 */
salesOrdersRouter.post('/:id/fast-forward', authorize('admin', 'manager', 'operator'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = req.user?.username || req.user?.name || 'Demo Fast-Forward';
    const result = await orderLifecycleService.fastForwardOrder(id, actor);
    res.json(result);
  } catch (err: any) {
    console.error(`Failed to fast-forward order ${req.params.id}:`, err);
    res.status(400).json({ error: err.message || 'Failed to fast-forward order' });
  }
});

export default salesOrdersRouter;
