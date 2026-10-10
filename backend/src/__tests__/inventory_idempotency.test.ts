import { describe, it, expect } from 'bun:test';
import { db } from '../db/index.js';
import { inventoryBalances, inventoryMovements } from '../db/schema.js';
import { inventoryService } from '../services/inventoryService.js';
import { sql, eq } from 'drizzle-orm';

describe('Inventory Idempotency, Constraints & Ledger Immutability Suite', () => {
  it('Network retry with identical idempotencyKey violates unique constraint and rejects duplicate write', async () => {
    const IDEM_KEY = `IDEM-TEST-${Date.now()}`;
    const YARN_ID = 'YS-IDEM-01';

    // First attempt succeeds
    await db.transaction(async (tx) => {
      await inventoryService.recordReceipt(tx, {
        yarnStockId: YARN_ID,
        receiptKg: 100,
        yarnType: 'Cotton',
        colour: 'Blue',
        actor: 'receiving-dock',
        idempotencyKey: IDEM_KEY,
        receiptId: `REC-${Date.now()}`,
      });
    });

    // Second retry with identical idempotencyKey fails
    let retryFailed = false;
    let errorMessage = '';
    try {
      await db.transaction(async (tx) => {
        await inventoryService.recordReceipt(tx, {
          yarnStockId: YARN_ID,
          receiptKg: 100,
          yarnType: 'Cotton',
          colour: 'Blue',
          actor: 'receiving-dock',
          idempotencyKey: IDEM_KEY,
          receiptId: `REC-${Date.now()}`,
        });
      });
    } catch (err: any) {
      retryFailed = true;
      errorMessage = `${err.message} ${err.cause?.message ?? ''}`;
    }

    expect(retryFailed).toBe(true);
    expect(errorMessage.toLowerCase()).toContain('unique');
  });

  it('PostgreSQL trigger trg_no_update_delete_inventory_movements blocks all UPDATE and DELETE mutations', async () => {
    // 1. Attempt DELETE on inventory_movements
    let deleteBlocked = false;
    let deleteError = '';
    try {
      await db.execute(sql`DELETE FROM inventory_movements WHERE reason = 'receipt'`);
    } catch (err: any) {
      deleteBlocked = true;
      deleteError = `${err.message} ${err.cause?.message ?? ''}`;
    }

    expect(deleteBlocked).toBe(true);
    expect(deleteError).toContain('append-only');

    // 2. Attempt UPDATE on inventory_movements
    let updateBlocked = false;
    let updateError = '';
    try {
      await db.execute(sql`UPDATE inventory_movements SET quantity = '9999.00'`);
    } catch (err: any) {
      updateBlocked = true;
      updateError = `${err.message} ${err.cause?.message ?? ''}`;
    }

    expect(updateBlocked).toBe(true);
    expect(updateError).toContain('append-only');
  });

  it('Database check constraints chk_balance_qty_non_neg and chk_balance_avail_non_neg reject corrupt balances', async () => {
    const TEST_ID = `YS-CORRUPT-${Date.now()}`;

    // Insert valid initial balance
    await db.insert(inventoryBalances).values({
      itemType: 'yarn',
      itemId: TEST_ID,
      skuName: 'Test Yarn',
      state: 'raw_yarn',
      quantity: '100.00',
      reservedQuantity: '0.00',
      unit: 'kg',
    });

    // 1. Attempt negative physical quantity
    let negQtyRejected = false;
    try {
      await db
        .update(inventoryBalances)
        .set({ quantity: '-50.00' })
        .where(eq(inventoryBalances.itemId, TEST_ID));
    } catch (err: any) {
      negQtyRejected = true;
      const full = `${err.message} ${err.cause?.message ?? ''}`;
      expect(full.includes('chk_balance_qty_non_neg') || full.includes('chk_balance_avail_non_neg')).toBe(true);
    }
    expect(negQtyRejected).toBe(true);

    // 2. Attempt reserved > physical quantity
    let overReserveRejected = false;
    try {
      await db
        .update(inventoryBalances)
        .set({ reservedQuantity: '150.00' })
        .where(eq(inventoryBalances.itemId, TEST_ID));
    } catch (err: any) {
      overReserveRejected = true;
      const full = `${err.message} ${err.cause?.message ?? ''}`;
      expect(full).toContain('chk_balance_avail_non_neg');
    }
    expect(overReserveRejected).toBe(true);

    // Cleanup
    await db.delete(inventoryBalances).where(eq(inventoryBalances.itemId, TEST_ID));
  });
});
