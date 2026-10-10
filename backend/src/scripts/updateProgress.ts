import { db, pool } from '../db/index.js';
import { salesOrderItems, salesOrders } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  const items = await db.select().from(salesOrderItems);
  for (const item of items) {
    const qty = Number(item.quantityMetres);
    const completed = Math.floor(qty * (item.sequence === 1 ? 0.6 : 0.2));
    await db.update(salesOrderItems)
      .set({ completedMetres: completed.toString() })
      .where(eq(salesOrderItems.id, item.id));
  }
  
  const orders = await db.select().from(salesOrders);
  for(const order of orders) {
    if(order.status === 'dispatched' || order.status === 'ready_to_ship' || order.status === 'quality_check') {
       const orderItems = await db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id));
       for(const oi of orderItems) {
          const completed = order.status === 'dispatched' || order.status === 'ready_to_ship' ? oi.quantityMetres : (Number(oi.quantityMetres) * 0.9).toString();
          await db.update(salesOrderItems)
            .set({ completedMetres: completed.toString(), status: order.status === 'dispatched' ? 'dispatched' : 'quality_check' })
            .where(eq(salesOrderItems.id, oi.id));
       }
    }
  }
  
  console.log('Progress updated');
  await pool.end();
}
run().catch(console.error);
