import { describe, it, expect } from 'bun:test';
import { db } from '../db/index.js';
import {
  inventoryBalances,
  inventoryMovements,
  yarnStock,
  fabricRolls,
  salesOrders,
  dispatches,
  dispatchRolls,
  machines,
} from '../db/schema.js';
import { inventoryService } from '../services/inventoryService.js';
import { eq, and } from 'drizzle-orm';

describe('Inventory 4-Way Mathematical Reconciliation Suite', () => {
  it('Initial baseline reconciliation suite passes with zero drift across all 4 checks', async () => {
    const report = await inventoryService.reconcileInventory();

    expect(report.status).toBe('CONSISTENT');
    expect(report.driftCount).toBe(0);

    // Check 1: Physical Balance == SUM(quantity_delta)
    expect(report.checks.balanceVsLedger.length).toBeGreaterThan(0);
    for (const check of report.checks.balanceVsLedger) {
      expect(check.drift).toBeLessThanOrEqual(0.01);
      expect(check.status).toBe('MATCH');
    }

    // Check 2: Finished Goods == Unshipped Passed Rolls
    expect(report.checks.finishedGoodsVsRolls.length).toBeGreaterThan(0);
    for (const check of report.checks.finishedGoodsVsRolls) {
      expect(check.drift).toBeLessThanOrEqual(0.01);
      expect(check.status).toBe('MATCH');
    }

    // Check 3: Fabric Pending QC == Pending Rolls
    expect(report.checks.pendingQcVsRolls.length).toBeGreaterThan(0);
    for (const check of report.checks.pendingQcVsRolls) {
      expect(check.drift).toBeLessThanOrEqual(0.01);
      expect(check.status).toBe('MATCH');
    }

    // Check 4: Dispatched Ledger == Total Metres in dispatch_rolls
    expect(report.checks.dispatchVsRolls.drift).toBeLessThanOrEqual(0.01);
    expect(report.checks.dispatchVsRolls.status).toBe('MATCH');
  });

  it('End-to-end material lifecycle (Receipt -> Reservation -> WIP -> QC Pass/Reject -> Dispatch) maintains zero drift', async () => {
    const suffix = Date.now().toString().slice(-6);
    const ORDER_ID = `ORD-REC-${suffix}`;
    const YARN_ID = `YS-REC-${suffix}`;
    const ROLL_PASS = `FR-RP-${suffix}`;
    const ROLL_REJ = `FR-RR-${suffix}`;
    const DISPATCH_ID = `DSP-R-${suffix}`;

    // Seed temporary order & machine
    await db.insert(salesOrders).values({
      id: ORDER_ID,
      buyer: 'Recon Buyer Ltd',
      fabricType: 'Cotton Denim',
      colour: 'Indigo',
      quantityMetres: '500.00',
      unitPrice: '150.00',
      deliveryDate: '2026-11-01',
      completedMetres: '0.00',
      status: 'pending',
    }).onConflictDoNothing();

    await db.insert(yarnStock).values({
      id: YARN_ID,
      type: 'Cotton',
      colour: 'Indigo',
      quantityKg: '0.00',
      reorderLevel: '100.00',
      location: 'Bin REC',
    }).onConflictDoNothing();

    // 1. Inward Receipt (1000 kg yarn)
    await db.transaction(async (tx) => {
      await inventoryService.recordReceipt(tx, {
        yarnStockId: YARN_ID,
        receiptKg: 1000,
        yarnType: 'Cotton',
        colour: 'Indigo',
        actor: 'receipt-tester',
        receiptId: `REC-${Date.now()}`,
      });
    });

    // 2. Reserve yarn for order (250 kg)
    await db.transaction(async (tx) => {
      await inventoryService.reserveYarnForOrder(tx, {
        yarnStockId: YARN_ID,
        orderId: ORDER_ID,
        requiredKg: 250,
        yarnType: 'Cotton',
        colour: 'Indigo',
        actor: 'planner',
      });
    });

    // 3. Consume reserved yarn into WIP
    await db.transaction(async (tx) => {
      await inventoryService.consumeYarnToWip(tx, {
        yarnStockId: YARN_ID,
        orderId: ORDER_ID,
        fabricType: 'Cotton Denim',
        colour: 'Indigo',
        consumeKg: 250,
        actor: 'spinner',
      });
    });

    // 4. Produce two rolls (Roll 1: 300m, Roll 2: 200m)
    await db.transaction(async (tx) => {
      await inventoryService.produceRoll(tx, {
        rollId: ROLL_PASS,
        orderId: ORDER_ID,
        machineId: 'WV-01',
        metres: 300,
        actor: 'weaver',
      });

      await inventoryService.produceRoll(tx, {
        rollId: ROLL_REJ,
        orderId: ORDER_ID,
        machineId: 'WV-01',
        metres: 200,
        actor: 'weaver',
      });
    });

    // 5. QC Decisions: Roll 1 passed -> finished_goods; Roll 2 rejected -> scrap_fabric
    await db.transaction(async (tx) => {
      await inventoryService.recordQcVerdict(tx, {
        rollId: ROLL_PASS,
        qcResult: 'passed',
        checkedBy: 'QC Vijay',
        actor: 'inspector',
      });

      await inventoryService.recordQcVerdict(tx, {
        rollId: ROLL_REJ,
        qcResult: 'rejected',
        checkedBy: 'QC Vijay',
        defects: ['Severe warp breakages'],
        actor: 'inspector',
      });
    });

    // 6. Dispatch passed roll (300m)
    await db.transaction(async (tx) => {
      await tx.insert(dispatches).values({
        id: DISPATCH_ID,
        orderId: ORDER_ID,
        buyer: 'Recon Buyer Ltd',
        totalMetres: '300.00',
        dispatchDate: '2026-10-11',
        invoiceNo: 'INV-RECON-300',
        truckNo: 'KA-01-RECON',
        status: 'prepared',
      });

      await tx.insert(dispatchRolls).values({
        dispatchId: DISPATCH_ID,
        rollId: ROLL_PASS,
      });

      await inventoryService.dispatchRolls(tx, {
        dispatchId: DISPATCH_ID,
        orderId: ORDER_ID,
        rollIds: [ROLL_PASS],
        totalMetres: 300,
        actor: 'shipping-dock',
      });
    });

    // 7. Verify reconciliation health: zero drift!
    const postReport = await inventoryService.reconcileInventory();
    expect(postReport.status).toBe('CONSISTENT');
    expect(postReport.driftCount).toBe(0);
  });
});
