// @ts-nocheck
import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { products, salesOrders, salesOrderItems } from '../db/schema.js';
import { salesOrderService } from '../services/salesOrderService.js';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth.js';

export const clientPortalRouter = Router();

clientPortalRouter.use(authenticate);
clientPortalRouter.use(authorize('client'));

// GET /api/v1/client/products - Read-only fabric catalog for clients
clientPortalRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const activeProducts = await db
      .select()
      .from(products)
      .where(eq(products.isActive, true));
    res.json(activeProducts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/v1/client/orders - Place multi-item order tied strictly to client's token
clientPortalRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const { buyer, deliveryDate, items } = req.body;
    const clientId = req.user!.sub;

    const newOrder = await salesOrderService.createMultiFabricOrder(clientId, buyer, deliveryDate, items);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// GET /api/v1/client/orders - Paginated list of client's own orders
clientPortalRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const clientId = req.user!.sub;
    const orders = await db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.clientId, clientId))
      .orderBy(desc(salesOrders.createdDate));

    const allItems = await db.select().from(salesOrderItems);
    const allProducts = await db.select().from(products);

    const ordersWithItems = orders.map(order => ({
      ...order,
      items: allItems
        .filter(item => item.orderId === order.id)
        .map(item => ({
          ...item,
          product: allProducts.find(p => p.id === item.productId)
        }))
    }));

    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/v1/client/orders/:id - Single order tracking milestone status
clientPortalRouter.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clientId = req.user!.sub;

    const [order] = await db
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.clientId, clientId)));

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

export default clientPortalRouter;
