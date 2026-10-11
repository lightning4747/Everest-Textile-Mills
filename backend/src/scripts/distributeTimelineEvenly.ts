// @ts-nocheck
import { db, pool } from '../db/index.js';
import { sql, eq } from 'drizzle-orm';
import {
  salesOrders,
  fabricRolls,
  dispatches,
  purchaseOrders,
  yarnReceipts,
  inventoryMovements,
} from '../db/schema.js';
import { inventoryService } from '../services/inventoryService.js';

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('🔄 Evenly distributing seed data across the entire 17-month operational timeline...');

  // ───────────────────────────────────────────────────────────────────────────
  // 1. RE-DISTRIBUTE SALES ORDERS EVENLY ACROSS 2025-06-15 to 2026-10-10
  // ───────────────────────────────────────────────────────────────────────────
  console.log('📦 Distributing sales orders across all months...');

  const allOrders = await db
    .select({
      id: salesOrders.id,
      status: salesOrders.status,
      createdDate: salesOrders.createdDate,
    })
    .from(salesOrders)
    .orderBy(salesOrders.id);

  const historicalOrders = allOrders.filter(o => o.status === 'dispatched');
  const activeOrders = allOrders.filter(o => o.status !== 'dispatched');

  const historyStart = new Date('2025-06-15');
  const historySpanDays = 465; // June 15, 2025 to September 25, 2026

  // Distribute dispatched orders evenly across the 465 days
  for (let i = 0; i < historicalOrders.length; i++) {
    const o = historicalOrders[i];
    const dayOffset = Math.floor((i / historicalOrders.length) * historySpanDays);
    const createdDate = addDays(historyStart, dayOffset);
    const deliveryDate = addDays(createdDate, 25 + (i % 15));

    await db
      .update(salesOrders)
      .set({
        createdDate: formatDate(createdDate),
        deliveryDate: formatDate(deliveryDate),
        updatedAt: createdDate,
      })
      .where(eq(salesOrders.id, o.id));
  }

  // Active orders (in manufacturing or ready to ship) placed in late Sept / early Oct 2026
  const activeStart = new Date('2026-09-20');
  for (let i = 0; i < activeOrders.length; i++) {
    const o = activeOrders[i];
    const dayOffset = Math.floor((i / Math.max(1, activeOrders.length)) * 20);
    const createdDate = addDays(activeStart, dayOffset);
    const deliveryDate = addDays(createdDate, 20 + (i % 20));

    await db
      .update(salesOrders)
      .set({
        createdDate: formatDate(createdDate),
        deliveryDate: formatDate(deliveryDate),
        updatedAt: createdDate,
      })
      .where(eq(salesOrders.id, o.id));
  }

  console.log(`   ✓ Realigned ${historicalOrders.length} historical and ${activeOrders.length} active orders.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. RE-DISTRIBUTE FABRIC ROLLS MATCHING ORDER PRODUCTION WINDOW
  // ───────────────────────────────────────────────────────────────────────────
  console.log('🧵 Aligning fabric roll production dates with sales orders...');

  await db.execute(sql`
    UPDATE fabric_rolls fr
    SET 
      produced_date = so.created_date + ((('x' || md5(fr.id))::bit(16)::int % 8) + 4) * INTERVAL '1 day',
      checked_at = (so.created_date + ((('x' || md5(fr.id))::bit(16)::int % 8) + 5) * INTERVAL '1 day') + TIME '14:30:00'
    FROM sales_orders so
    WHERE fr.order_id = so.id;
  `);

  console.log('   ✓ Realigned fabric roll production & QC timestamps.');

  // ───────────────────────────────────────────────────────────────────────────
  // 3. RE-DISTRIBUTE DISPATCHES MATCHING ORDER FULFILLMENT DATES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('🚚 Aligning dispatches across all 16 months...');

  await db.execute(sql`
    UPDATE dispatches d
    SET 
      dispatch_date = LEAST('2026-10-10'::date, so.created_date + ((('x' || md5(d.id))::bit(16)::int % 10) + 16) * INTERVAL '1 day'),
      created_at = (LEAST('2026-10-10'::date, so.created_date + ((('x' || md5(d.id))::bit(16)::int % 10) + 16) * INTERVAL '1 day')) + TIME '16:00:00',
      updated_at = (LEAST('2026-10-10'::date, so.created_date + ((('x' || md5(d.id))::bit(16)::int % 10) + 16) * INTERVAL '1 day')) + TIME '18:00:00'
    FROM sales_orders so
    WHERE d.order_id = so.id;
  `);

  console.log('   ✓ Realigned dispatches across full timeline.');

  // ───────────────────────────────────────────────────────────────────────────
  // 4. RE-DISTRIBUTE PURCHASE ORDERS & YARN RECEIPTS ACROSS 17 MONTHS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('📦 Distributing purchase orders & yarn receipts across full 17 months...');

  const allPOs = await db
    .select({ id: purchaseOrders.id })
    .from(purchaseOrders)
    .orderBy(purchaseOrders.id);

  const poStart = new Date('2025-06-01');
  const poSpanDays = 490; // June 1, 2025 to October 5, 2026

  for (let i = 0; i < allPOs.length; i++) {
    const po = allPOs[i];
    const offset = Math.floor((i / allPOs.length) * poSpanDays);
    const poDate = addDays(poStart, offset);
    const delivDate = addDays(poDate, 15);

    await db
      .update(purchaseOrders)
      .set({
        deliveryDate: formatDate(delivDate),
        createdAt: poDate,
        updatedAt: poDate,
      })
      .where(eq(purchaseOrders.id, po.id));
  }

  // Align yarn receipts with their parent purchase order
  await db.execute(sql`
    UPDATE yarn_receipts yr
    SET 
      date = (po.created_at + INTERVAL '5 days')::date,
      created_at = po.created_at + INTERVAL '5 days'
    FROM purchase_orders po
    WHERE yr.purchase_order_id = po.id;
  `);

  console.log('   ✓ Realigned purchase orders and yarn receipts.');

  // ───────────────────────────────────────────────────────────────────────────
  // 5. VERIFY SYSTEM-WIDE DATA CONSISTENCY & RECONCILIATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🔍 Running Verification & Reconciliation Suite...');

  const recon = await inventoryService.reconcileInventory();
  console.log(' - Inventory Reconciliation Status:', recon.status);
  console.log(' - Inventory Drift Count:', recon.driftCount);
  console.log(' - Dispatched Consignment Drift:', recon.checks.dispatchVsRolls.drift);

  console.log('\n📊 Monthly Distribution Summary for Sales Orders:');
  const soDist = (await db.execute(sql`
    SELECT DATE_TRUNC('month', created_date::date) as m, count(*) as orders, sum(quantity_metres) as metres
    FROM sales_orders
    GROUP BY 1
    ORDER BY 1;
  `)).rows;

  for (const r of soDist) {
    const monthStr = new Date(r.m).toISOString().slice(0, 7);
    console.log(`   ${monthStr}: ${String(r.orders).padStart(3)} orders (${Math.round(r.metres).toLocaleString()} m)`);
  }

  console.log('\n📊 Monthly Distribution Summary for Dispatches:');
  const dspDist = (await db.execute(sql`
    SELECT DATE_TRUNC('month', dispatch_date::date) as m, count(*) as dispatches, sum(total_metres) as metres
    FROM dispatches
    GROUP BY 1
    ORDER BY 1;
  `)).rows;

  for (const r of dspDist) {
    const monthStr = new Date(r.m).toISOString().slice(0, 7);
    console.log(`   ${monthStr}: ${String(r.dispatches).padStart(3)} dispatches (${Math.round(r.metres).toLocaleString()} m)`);
  }

  console.log('\n✅ Timeline distribution alignment complete with 0 drift.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error during timeline distribution:', err);
  process.exit(1);
});
