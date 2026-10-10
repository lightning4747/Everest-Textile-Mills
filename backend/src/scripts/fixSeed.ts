import { db, pool } from '../db/index.js';
import { salesOrders, salesOrderItems, products } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function fixSeed() {
  console.log('Fixing seed data...');
  
  // Get all orders
  const orders = await db.select().from(salesOrders);
  const allProducts = await db.select().from(products);
  
  if (allProducts.length === 0) {
    console.error('No products found to assign');
    process.exit(1);
  }
  
  const productA = allProducts[0];
  const productB = allProducts[1];
  
  for (const order of orders) {
    // Check if items exist
    const existingItems = await db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id));
    
    let totalAmount = 0;
    
    if (existingItems.length === 0) {
      console.log(`Inserting items for order ${order.id}...`);
      
      const qty1 = 1000;
      const qty2 = 1500;
      
      await db.insert(salesOrderItems).values([
        {
          orderId: order.id,
          sequence: 1,
          productId: productA.id,
          quantityMetres: qty1.toString(),
          unitPrice: productA.pricePerMetre,
          yarnKgPerMetre: productA.yarnKgPerMetre,
          status: 'pending',
          completedMetres: '0',
          dispatchedMetres: '0'
        },
        {
          orderId: order.id,
          sequence: 2,
          productId: productB.id,
          quantityMetres: qty2.toString(),
          unitPrice: productB.pricePerMetre,
          yarnKgPerMetre: productB.yarnKgPerMetre,
          status: 'pending',
          completedMetres: '0',
          dispatchedMetres: '0'
        }
      ]);
      
      totalAmount = (qty1 * Number(productA.pricePerMetre)) + (qty2 * Number(productB.pricePerMetre));
    } else {
      for (const item of existingItems) {
        totalAmount += Number(item.quantityMetres) * Number(item.unitPrice);
      }
    }
    
    await db.update(salesOrders)
      .set({ totalAmount: totalAmount.toString() })
      .where(eq(salesOrders.id, order.id));
      
    console.log(`Order ${order.id} total amount updated to ${totalAmount}`);
  }
  
  console.log('Fix complete.');
  await pool.end();
}

fixSeed().catch(console.error);
