import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { db, pool } from '../db/index.js';
import { inventoryBalances, inventoryMovements } from '../db/schema.js';
import { inventoryService } from '../services/inventoryService.js';
import { eq, and } from 'drizzle-orm';

describe('Inventory Concurrency & Deadlock Prevention Suite', () => {
  const TEST_YARN_ID = 'YS-CONC-TEST-01';
  const SKU_NAME = 'Cotton 40s Combed White';

  beforeAll(async () => {
    // Setup isolated test yarn bin with exactly 500 kg available stock
    await db
      .insert(inventoryBalances)
      .values({
        itemType: 'yarn',
        itemId: TEST_YARN_ID,
        skuName: SKU_NAME,
        state: 'raw_yarn',
        quantity: '500.00',
        reservedQuantity: '0.00',
        unit: 'kg',
        location: 'Bin CONC-01',
      })
      .onConflictDoUpdate({
        target: [inventoryBalances.itemId, inventoryBalances.state],
        set: { quantity: '500.00', reservedQuantity: '0.00' },
      });
  });

  afterAll(async () => {
    // Cleanup test balance row
    await db
      .delete(inventoryBalances)
      .where(and(eq(inventoryBalances.itemId, TEST_YARN_ID), eq(inventoryBalances.state, 'raw_yarn')));
  });

  it('10 parallel reservations against 500 kg pool: exactly 5 succeed, 5 rejected for insufficient stock', async () => {
    // 10 concurrent reservation requests of 100 kg each
    const reservationPromises = Array.from({ length: 10 }).map(async (_, index) => {
      const orderId = `ORD-CONC-${index + 1}`;
      try {
        const result = await db.transaction(async (tx) => {
          return await inventoryService.reserveYarnForOrder(tx, {
            yarnStockId: TEST_YARN_ID,
            orderId,
            requiredKg: 100,
            yarnType: 'Cotton',
            colour: 'White',
            actor: `test-worker-${index + 1}`,
          });
        });
        return { success: true, orderId, result };
      } catch (err: any) {
        return { success: false, orderId, error: err.message };
      }
    });

    const outcomes = await Promise.all(reservationPromises);

    const successful = outcomes.filter((o) => o.success);
    const failed = outcomes.filter((o) => !o.success);

    expect(successful.length).toBe(5);
    expect(failed.length).toBe(5);

    for (const f of failed) {
      expect(f.error).toContain('INSUFFICIENT_STOCK');
    }

    // Verify final database state
    const [balance] = await db
      .select()
      .from(inventoryBalances)
      .where(and(eq(inventoryBalances.itemId, TEST_YARN_ID), eq(inventoryBalances.state, 'raw_yarn')))
      .limit(1);

    expect(Number(balance.quantity)).toBe(500);
    expect(Number(balance.reservedQuantity)).toBe(500);
    expect(Number(balance.quantity) - Number(balance.reservedQuantity)).toBe(0);
  });

  it('Bidirectional two-stage transfer avoids deadlock due to deterministic alphabetical lock ordering', async () => {
    const BIN_A = 'YS-DEADLOCK-A';
    const BIN_B = 'YS-DEADLOCK-B';

    await db
      .insert(inventoryBalances)
      .values([
        {
          itemType: 'yarn',
          itemId: BIN_A,
          skuName: 'Yarn A',
          state: 'raw_yarn',
          quantity: '1000.00',
          reservedQuantity: '0.00',
          unit: 'kg',
        },
        {
          itemType: 'yarn',
          itemId: BIN_B,
          skuName: 'Yarn B',
          state: 'raw_yarn',
          quantity: '1000.00',
          reservedQuantity: '0.00',
          unit: 'kg',
        },
      ])
      .onConflictDoUpdate({
        target: [inventoryBalances.itemId, inventoryBalances.state],
        set: { quantity: '1000.00', reservedQuantity: '0.00' },
      });

    // Worker 1 acquires (A, B); Worker 2 acquires (B, A) in reverse order
    const p1 = db.transaction(async (tx) => {
      const locks = await inventoryService.acquireOrderedLocks(tx, [
        { itemType: 'yarn', itemId: BIN_A, skuName: 'Yarn A', state: 'raw_yarn', unit: 'kg' },
        { itemType: 'yarn', itemId: BIN_B, skuName: 'Yarn B', state: 'raw_yarn', unit: 'kg' },
      ]);
      expect(locks.has(`${BIN_A}:raw_yarn`)).toBe(true);
      expect(locks.has(`${BIN_B}:raw_yarn`)).toBe(true);
      return 'ok1';
    });

    const p2 = db.transaction(async (tx) => {
      // Intentionally passing in reverse order: [B, A]
      const locks = await inventoryService.acquireOrderedLocks(tx, [
        { itemType: 'yarn', itemId: BIN_B, skuName: 'Yarn B', state: 'raw_yarn', unit: 'kg' },
        { itemType: 'yarn', itemId: BIN_A, skuName: 'Yarn A', state: 'raw_yarn', unit: 'kg' },
      ]);
      expect(locks.has(`${BIN_A}:raw_yarn`)).toBe(true);
      expect(locks.has(`${BIN_B}:raw_yarn`)).toBe(true);
      return 'ok2';
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1).toBe('ok1');
    expect(res2).toBe('ok2');

    // Cleanup
    await db
      .delete(inventoryBalances)
      .where(and(eq(inventoryBalances.itemId, BIN_A), eq(inventoryBalances.state, 'raw_yarn')));
    await db
      .delete(inventoryBalances)
      .where(and(eq(inventoryBalances.itemId, BIN_B), eq(inventoryBalances.state, 'raw_yarn')));
  });
});
