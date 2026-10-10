// @ts-nocheck
import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { salesOrders, salesOrderItems } from '../db/schema.js';
import { salesOrderService } from '../services/salesOrderService.js';
import { eq, desc } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth.js';

export const salesOrdersRouter = Router();

salesOrdersRouter.use(authenticate);

salesOrdersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orders = await db
      .select()
      .from(salesOrders)
      .orderBy(desc(salesOrders.createdDate));
    res.json(orders);
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

    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

salesOrdersRouter.post('/', authorize('admin', 'manager'), async (req: Request, res: Response) => {
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

export default salesOrdersRouter;
