// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../index.js';
import { signToken } from '../middleware/auth.js';
import { db } from '../db/index.js';
import {
  salesOrders,
  salesOrderItems,
  fabricRolls,
  dispatches,
  inventoryBalances,
} from '../db/schema.js';
import { orderLifecycleService } from '../services/orderLifecycleService.js';
import { inventoryService } from '../services/inventoryService.js';
import { eq } from 'drizzle-orm';
import type { Server } from 'http';

describe('Order Lifecycle Advancement & Fast-Forward Suite', () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;

  beforeAll((done) => {
    adminToken = signToken({
      sub: '00000000-0000-0000-0000-000000000001',
      email: 'admin@everest.local',
      role: 'admin',
      name: 'Admin User',
    });

    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;
      baseUrl = `http://localhost:${port}/api/v1`;
      done();
    });
  });

  afterAll((done) => {
    server.close(() => {
      done();
    });
  });

  it('advances an order step-by-step: spinning -> weaving -> dyeing -> quality_check -> ready_to_ship -> dispatched', async () => {
    const testOrderId = `ORD-TEST-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create a confirmed order in spinning
    await db.insert(salesOrders).values({
      id: testOrderId,
      buyer: 'Fabrics Demo International',
      fabricType: 'Cotton Twill',
      colour: 'White',
      quantityMetres: '500.00',
      totalAmount: '125000.00',
      deliveryDate: new Date('2026-11-01'),
      status: 'spinning',
      machineId: 'SP-01',
      completedMetres: '0.00',
    });

    await db.insert(salesOrderItems).values({
      orderId: testOrderId,
      sequence: 1,
      productId: 'PROD-001',
      quantityMetres: '500.00',
      unitPrice: '250.00',
      yarnKgPerMetre: '0.4500',
      status: 'spinning',
    });

    // 1. Advance spinning -> weaving
    const step1 = await orderLifecycleService.advanceOrderStage(testOrderId, 'Test Runner');
    expect(step1.newStatus).toBe('weaving');
    const [order1] = await db.select().from(salesOrders).where(eq(salesOrders.id, testOrderId));
    expect(order1.status).toBe('weaving');

    // 2. Advance weaving -> dyeing
    const step2 = await orderLifecycleService.advanceOrderStage(testOrderId, 'Test Runner');
    expect(step2.newStatus).toBe('dyeing');
    const [order2] = await db.select().from(salesOrders).where(eq(salesOrders.id, testOrderId));
    expect(order2.status).toBe('dyeing');

    // 3. Advance dyeing -> quality_check
    const step3 = await orderLifecycleService.advanceOrderStage(testOrderId, 'Test Runner');
    expect(step3.newStatus).toBe('quality_check');
    const [order3] = await db.select().from(salesOrders).where(eq(salesOrders.id, testOrderId));
    expect(order3.status).toBe('quality_check');

    // Verify fabric roll was generated
    const rolls = await db.select().from(fabricRolls).where(eq(fabricRolls.orderId, testOrderId));
    expect(rolls.length).toBeGreaterThan(0);
    expect(rolls[0].qcResult).toBe('pending');

    // 4. Advance quality_check -> ready_to_ship
    const step4 = await orderLifecycleService.advanceOrderStage(testOrderId, 'Test Runner');
    expect(step4.newStatus).toBe('ready_to_ship');
    const [order4] = await db.select().from(salesOrders).where(eq(salesOrders.id, testOrderId));
    expect(order4.status).toBe('ready_to_ship');

    const [updatedRoll] = await db.select().from(fabricRolls).where(eq(fabricRolls.id, rolls[0].id));
    expect(updatedRoll.qcResult).toBe('passed');

    // 5. Advance ready_to_ship -> dispatched
    const step5 = await orderLifecycleService.advanceOrderStage(testOrderId, 'Test Runner');
    expect(step5.newStatus).toBe('dispatched');
    const [order5] = await db.select().from(salesOrders).where(eq(salesOrders.id, testOrderId));
    expect(order5.status).toBe('dispatched');
    expect(Number(order5.completedMetres)).toBe(500);

    const [item5] = await db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, testOrderId));
    expect(Number(item5.dispatchedMetres)).toBe(500);

    // Verify dispatch record created
    const dsp = await db.select().from(dispatches).where(eq(dispatches.orderId, testOrderId));
    expect(dsp.length).toBeGreaterThan(0);
    expect(Number(dsp[0].totalMetres)).toBe(500);
  });

  it('fast-forwards an order from spinning to dispatched in 1 atomic action', async () => {
    const testOrderId = `ORD-FF-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.insert(salesOrders).values({
      id: testOrderId,
      buyer: 'Instant Demo Retailer',
      fabricType: 'Cotton Twill',
      colour: 'Navy Blue',
      quantityMetres: '800.00',
      totalAmount: '200000.00',
      deliveryDate: new Date('2026-11-05'),
      status: 'spinning',
      machineId: 'SP-02',
      completedMetres: '0.00',
    });

    await db.insert(salesOrderItems).values({
      orderId: testOrderId,
      sequence: 1,
      productId: 'PROD-001',
      quantityMetres: '800.00',
      unitPrice: '250.00',
      yarnKgPerMetre: '0.4500',
      status: 'spinning',
    });

    const ffResult = await orderLifecycleService.fastForwardOrder(testOrderId, 'Judge Demo');
    expect(ffResult.finalStatus).toBe('dispatched');
    expect(ffResult.transitions.length).toBeGreaterThan(0);

    const [finalOrder] = await db.select().from(salesOrders).where(eq(salesOrders.id, testOrderId));
    expect(finalOrder.status).toBe('dispatched');
    expect(Number(finalOrder.completedMetres)).toBe(800);

    const [finalItem] = await db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, testOrderId));
    expect(Number(finalItem.dispatchedMetres)).toBe(800);
  });

  it('HTTP API POST /sales-orders/:id/advance advances stage via authenticated endpoint', async () => {
    const testOrderId = `ORD-API-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.insert(salesOrders).values({
      id: testOrderId,
      buyer: 'API Automation Buyer',
      fabricType: 'Cotton Twill',
      colour: 'White',
      quantityMetres: '300.00',
      totalAmount: '75000.00',
      deliveryDate: new Date('2026-11-10'),
      status: 'spinning',
      machineId: 'SP-01',
      completedMetres: '0.00',
    });

    await db.insert(salesOrderItems).values({
      orderId: testOrderId,
      sequence: 1,
      productId: 'PROD-001',
      quantityMetres: '300.00',
      unitPrice: '250.00',
      yarnKgPerMetre: '0.4500',
      status: 'spinning',
    });

    const res = await fetch(`${baseUrl}/sales-orders/${testOrderId}/advance`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.newStatus).toBe('weaving');
  });

  it('resets an order back to spinning via HTTP API POST /sales-orders/:id/reset', async () => {
    const testOrderId = `ORD-RST-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.insert(salesOrders).values({
      id: testOrderId,
      buyer: 'Reset Test Buyer',
      fabricType: 'Denim',
      colour: 'Indigo',
      quantityMetres: '200.00',
      totalAmount: '50000.00',
      deliveryDate: new Date('2026-11-01'),
      status: 'dispatched',
      completedMetres: '200.00',
    });

    const res = await fetch(`${baseUrl}/sales-orders/${testOrderId}/reset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.newStatus).toBe('spinning');

    const [updated] = await db.select().from(salesOrders).where(eq(salesOrders.id, testOrderId));
    expect(updated.status).toBe('spinning');
    expect(Number(updated.completedMetres)).toBe(0);
  });
});

