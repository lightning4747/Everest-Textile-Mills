import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../index.js';
import { signToken } from '../middleware/auth.js';
import { db, pool } from '../db/index.js';
import { yarnStock, machineStatusLog, machines } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  checkMachineAvailability,
  reserveYarnStock,
  notifyLowStock,
  updateYarnLowStockGauge,
  updateProductionOutputGauge,
} from '../services/stubs.js';
import type { Server } from 'http';

describe('Person A: Domain Suite', () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;
  let operatorToken: string;

  beforeAll((done) => {
    adminToken = signToken({
      sub: '00000000-0000-0000-0000-000000000001',
      email: 'admin@everest.local',
      role: 'admin',
      name: 'Admin User',
    });

    operatorToken = signToken({
      sub: '00000000-0000-0000-0000-000000000002',
      email: 'operator@everest.local',
      role: 'operator',
      name: 'Operator User',
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

  // ─── 1. Stubs & Domain Logic ──────────────────────────────────────────────
  describe('Stubs & Domain Logic', () => {
    it('checkMachineAvailability returns accurate status', async () => {
      const avail = await checkMachineAvailability({ machineId: 'SP-03' });
      expect(avail.currentStatus).toBe('idle');
      expect(avail.available).toBe(true);

      const nonAvail = await checkMachineAvailability({ machineId: 'WV-02' });
      expect(nonAvail.currentStatus).toBe('breakdown');
      expect(nonAvail.available).toBe(false);
    });

    it('reserveYarnStock transactionally deducts material or fails on insufficient stock', async () => {
      // Find initial stock
      const [initial] = await db.select().from(yarnStock).where(eq(yarnStock.id, 'YS-001')).limit(1);
      const initialKg = Number(initial.quantityKg);

      const successRes = await reserveYarnStock({
        yarnStockId: 'YS-001',
        quantityKg: 50,
        orderId: 'ORD-TEST-1',
      });
      expect(successRes.success).toBe(true);
      expect(successRes.reservedKg).toBe(50);
      expect(successRes.remainingStockKg).toBe(initialKg - 50);

      // Excessive reservation should fail
      const failRes = await reserveYarnStock({
        yarnStockId: 'YS-001',
        quantityKg: 999999,
        orderId: 'ORD-TEST-FAIL',
      });
      expect(failRes.success).toBe(false);
      expect(failRes.reservedKg).toBe(0);
    });

    it('updateYarnLowStockGauge and updateProductionOutputGauge compute correct gauge totals', async () => {
      const lowCount = await updateYarnLowStockGauge();
      expect(typeof lowCount).toBe('number');
      expect(lowCount).toBeGreaterThanOrEqual(0);

      const prodOutput = await updateProductionOutputGauge();
      expect(typeof prodOutput).toBe('number');
      expect(prodOutput).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── 2. Suppliers API ─────────────────────────────────────────────────────
  describe('Suppliers Endpoints', () => {
    let createdSupplierId: string;

    it('GET /api/v1/suppliers lists suppliers', async () => {
      const res = await fetch(`${baseUrl}/suppliers`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(4);
    });

    it('POST /api/v1/suppliers creates a new supplier with yarn types', async () => {
      const res = await fetch(`${baseUrl}/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Himalaya Spinners',
          phone: '+91 91234 56789',
          email: 'contact@himalaya.example.com',
          notes: 'High quality cotton yarns',
          yarnTypes: ['Cotton', 'Blended'],
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Himalaya Spinners');
      expect(body.data.yarnTypes).toContain('Cotton');
      createdSupplierId = body.data.id;
    });

    it('PATCH /api/v1/suppliers/:id updates supplier contact info', async () => {
      const res = await fetch(`${baseUrl}/suppliers/${createdSupplierId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          notes: 'Updated notes for testing',
          yarnTypes: ['Cotton', 'Wool'],
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.notes).toBe('Updated notes for testing');
      expect(body.data.yarnTypes).toContain('Wool');
    });
  });

  // ─── 3. Yarn Stock & Receipts API ─────────────────────────────────────────
  describe('Yarn Endpoints', () => {
    it('GET /api/v1/yarn/stock returns list with calculated low-stock alerts', async () => {
      const res = await fetch(`${baseUrl}/yarn/stock`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(8);
      expect(body.data[0]).toHaveProperty('isLowStock');
    });

    it('GET /api/v1/yarn/stock/alerts returns only low stock items linked with suppliers', async () => {
      const res = await fetch(`${baseUrl}/yarn/stock/alerts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      for (const item of body.data) {
        expect(item.quantityKg).toBeLessThanOrEqual(item.reorderLevel);
        expect(item).toHaveProperty('severity');
        expect(item).toHaveProperty('supplier');
      }
    });

    it('PATCH /api/v1/yarn/stock/:id updates bin location and quantity', async () => {
      const res = await fetch(`${baseUrl}/yarn/stock/YS-001`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          location: 'Bay A-1-Updated',
          reorderLevel: 1100,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.location).toBe('Bay A-1-Updated');
      expect(body.data.reorderLevel).toBe(1100);
    });

    it('GET /api/v1/yarn/receipts returns delivery history', async () => {
      const res = await fetch(`${baseUrl}/yarn/receipts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('POST /api/v1/yarn/receipts atomically inserts receipt and updates yarn stock', async () => {
      // Find current stock of YS-003 (Polyester Black)
      const [beforeStock] = await db.select().from(yarnStock).where(eq(yarnStock.id, 'YS-003')).limit(1);
      const qtyBefore = Number(beforeStock.quantityKg);

      const res = await fetch(`${baseUrl}/yarn/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          date: '2026-10-10',
          supplierName: 'National Fibres',
          yarnType: 'Polyester',
          colour: 'Black',
          quantityKg: 350,
          yarnStockId: 'YS-003',
          receivedBy: 'Integration Test Clerk',
          invoiceNo: 'TEST-INV-999',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.quantityKg).toBe(350);

      // Verify stock was incremented
      const [afterStock] = await db.select().from(yarnStock).where(eq(yarnStock.id, 'YS-003')).limit(1);
      const qtyAfter = Number(afterStock.quantityKg);
      expect(qtyAfter).toBe(qtyBefore + 350);
    });
  });

  // ─── 4. Machines & Shop Floor API ─────────────────────────────────────────
  describe('Machines Endpoints', () => {
    it('GET /api/v1/machines lists fleet with status, operator, and output', async () => {
      const res = await fetch(`${baseUrl}/machines`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(9);

      const sp01 = body.data.find((m: any) => m.id === 'SP-01');
      expect(sp01).toBeDefined();
      expect(sp01).toHaveProperty('status');
      expect(sp01).toHaveProperty('outputToday');
      expect(sp01).toHaveProperty('progress');
    });

    it('GET /api/v1/machines/:id returns detailed machine profile with output history', async () => {
      const res = await fetch(`${baseUrl}/machines/SP-01`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('SP-01');
      expect(Array.isArray(body.data.outputLogs)).toBe(true);
    });

    it('POST /api/v1/machines registers a new machine', async () => {
      const uniqueMachineId = `M-${Date.now().toString().slice(-4)}`;
      const res = await fetch(`${baseUrl}/machines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: uniqueMachineId,
          name: 'Spinner Omega',
          type: 'spinning',
          dailyTarget: 600,
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(uniqueMachineId);
      expect(body.data.status).toBe('idle');

      // Cleanup test machine
      await db.delete(machineStatusLog).where(eq(machineStatusLog.machineId, uniqueMachineId));
      await db.delete(machines).where(eq(machines.id, uniqueMachineId));
    });

    it('PATCH /api/v1/machines/:id/status updates real-time status and disassociates order on breakdown', async () => {
      const res = await fetch(`${baseUrl}/machines/SP-01/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          status: 'breakdown',
          operator: 'Tech Service',
          shift: 'B',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('breakdown');
      // Must disassociate active run
      expect(body.data.currentOrderId).toBeNull();
    });

    it('POST /api/v1/machines/:id/output logs output and updates daily gauge', async () => {
      const res = await fetch(`${baseUrl}/machines/SP-01/output`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          date: '2026-10-10',
          metres: 480,
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.metres).toBe(480);
    });

    it('GET /api/v1/machines/:id/output-log returns date-filtered history', async () => {
      const res = await fetch(`${baseUrl}/machines/SP-01/output-log?from=2026-10-01&to=2026-10-15`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 5. Dashboard Endpoints ───────────────────────────────────────────────
  describe('Dashboard Endpoints', () => {
    it('GET /api/v1/dashboard/kpis returns consolidated KPI statistics', async () => {
      const res = await fetch(`${baseUrl}/dashboard/kpis`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('activeOrders');
      expect(body.data).toHaveProperty('readyToShip');
      expect(body.data).toHaveProperty('runningMachines');
      expect(body.data).toHaveProperty('totalMachines');
      expect(body.data).toHaveProperty('idleMachines');
      expect(body.data).toHaveProperty('downMachines');
      expect(body.data).toHaveProperty('outputToday');
      expect(body.data).toHaveProperty('lowStockCount');
      expect(body.data).toHaveProperty('pendingQC');

      expect(typeof body.data.activeOrders).toBe('number');
      expect(typeof body.data.outputToday).toBe('number');
      expect(typeof body.data.lowStockCount).toBe('number');
      expect(typeof body.data.pendingQC).toBe('number');
    });

    it('GET /api/v1/dashboard/monthly-chart returns monthly trend data', async () => {
      const res = await fetch(`${baseUrl}/dashboard/monthly-chart`, {
        headers: { Authorization: `Bearer ${operatorToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0]).toHaveProperty('month');
      expect(body.data[0]).toHaveProperty('revenue');
      expect(body.data[0]).toHaveProperty('cost');
      expect(body.data[0]).toHaveProperty('output');
      expect(body.data[0]).toHaveProperty('wages');
    });

    it('GET /api/v1/dashboard/qc-summary returns fabric roll counts by QC result', async () => {
      const res = await fetch(`${baseUrl}/dashboard/qc-summary`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('passed');
      expect(body.data).toHaveProperty('rework');
      expect(body.data).toHaveProperty('rejected');
      expect(body.data).toHaveProperty('pending');
      expect(typeof body.data.passed).toBe('number');
    });

    it('GET /api/v1/dashboard/machine-health returns counts grouped by machine status', async () => {
      const res = await fetch(`${baseUrl}/dashboard/machine-health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('running');
      expect(body.data).toHaveProperty('idle');
      expect(body.data).toHaveProperty('maintenance');
      expect(body.data).toHaveProperty('breakdown');
      expect(typeof body.data.running).toBe('number');
    });

    it('GET /api/v1/dashboard/recent-orders returns 5 most recent sales orders with progressPct', async () => {
      const res = await fetch(`${baseUrl}/dashboard/recent-orders`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeLessThanOrEqual(5);
      if (body.data.length > 0) {
        expect(body.data[0]).toHaveProperty('id');
        expect(body.data[0]).toHaveProperty('buyer');
        expect(body.data[0]).toHaveProperty('fabric');
        expect(body.data[0]).toHaveProperty('colour');
        expect(body.data[0]).toHaveProperty('targetMetres');
        expect(body.data[0]).toHaveProperty('completedMetres');
        expect(body.data[0]).toHaveProperty('progressPct');
        expect(body.data[0]).toHaveProperty('status');
      }
    });

    it('GET /api/v1/dashboard/low-stock returns yarn stock below or equal to reorder level', async () => {
      const res = await fetch(`${baseUrl}/dashboard/low-stock`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      for (const item of body.data) {
        expect(item.quantityKg).toBeLessThanOrEqual(item.reorderLevel);
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('colour');
        expect(item).toHaveProperty('bin');
      }
    });

    it('Dashboard endpoints reject unauthenticated requests', async () => {
      const res = await fetch(`${baseUrl}/dashboard/kpis`);
      expect(res.status).toBe(401);
    });
  });

  // ─── 6. Reports Endpoints ─────────────────────────────────────────────────
  describe('Reports Endpoints', () => {
    it('GET /api/v1/reports/order-costs returns order costs with computed financials', async () => {
      const res = await fetch(`${baseUrl}/reports/order-costs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const first = body.data[0];
      expect(first).toHaveProperty('orderId');
      expect(first).toHaveProperty('buyer');
      expect(first).toHaveProperty('yarnCost');
      expect(first).toHaveProperty('labourCost');
      expect(first).toHaveProperty('machineCost');
      expect(first).toHaveProperty('totalCost');
      expect(first).toHaveProperty('revenue');
      expect(first).toHaveProperty('profit');
      expect(first).toHaveProperty('marginPct');
      expect(first.totalCost).toBe(first.yarnCost + first.labourCost + first.machineCost);
      expect(first.profit).toBe(first.revenue - first.totalCost);
    });

    it('GET /api/v1/reports/order-costs?order_id=ORD-1025 filters correctly', async () => {
      const res = await fetch(`${baseUrl}/reports/order-costs?order_id=ORD-1025`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].orderId).toBe('ORD-1025');
    });

    it('PUT /api/v1/reports/order-costs/:order_id enforces auth & upserts cost record', async () => {
      // Operator should be forbidden (only admin, manager allowed)
      const forbiddenRes = await fetch(`${baseUrl}/reports/order-costs/ORD-1042`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          yarnCost: 50000,
          labourCost: 15000,
          machineCost: 10000,
          revenue: 150000,
        }),
      });
      expect(forbiddenRes.status).toBe(403);

      // Non-existent order should return 404
      const notFoundRes = await fetch(`${baseUrl}/reports/order-costs/ORD-NONEXISTENT`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          yarnCost: 50000,
          labourCost: 15000,
          machineCost: 10000,
          revenue: 150000,
        }),
      });
      expect(notFoundRes.status).toBe(404);

      // Valid upsert as admin
      const res = await fetch(`${baseUrl}/reports/order-costs/ORD-1042`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          yarnCost: 55000,
          labourCost: 15000,
          machineCost: 10000,
          revenue: 160000,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.orderId).toBe('ORD-1042');
      expect(body.data.totalCost).toBe(80000);
      expect(body.data.profit).toBe(80000);
      expect(body.data.marginPct).toBe(50);
    });

    it('GET /api/v1/reports/machine-performance returns efficiency stats per machine', async () => {
      const res = await fetch(`${baseUrl}/reports/machine-performance`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(9);

      const first = body.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('type');
      expect(first).toHaveProperty('status');
      expect(first).toHaveProperty('outputToday');
      expect(first).toHaveProperty('target');
      expect(first).toHaveProperty('efficiencyPct');
    });

    it('GET /api/v1/reports/monthly returns monthly snapshots with grossProfit and marginPct', async () => {
      const res = await fetch(`${baseUrl}/reports/monthly`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const first = body.data[0];
      expect(first).toHaveProperty('year');
      expect(first).toHaveProperty('month');
      expect(first).toHaveProperty('revenue');
      expect(first).toHaveProperty('cost');
      expect(first).toHaveProperty('grossProfit');
      expect(first).toHaveProperty('marginPct');
      expect(first.grossProfit).toBe(first.revenue - first.cost);
    });

    it('GET /api/v1/reports/monthly filters by year and month', async () => {
      const res = await fetch(`${baseUrl}/reports/monthly?year=2026&month=10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].year).toBe(2026);
      expect(body.data[0].month).toBe(10);
    });

    it('PUT /api/v1/reports/monthly/:year/:month upserts monthly record', async () => {
      // Operator should be forbidden
      const forbiddenRes = await fetch(`${baseUrl}/reports/monthly/2026/11`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          revenue: 1300000,
          cost: 800000,
          outputMetres: 29000,
          wages: 385000,
        }),
      });
      expect(forbiddenRes.status).toBe(403);

      // Admin upsert
      const res = await fetch(`${baseUrl}/reports/monthly/2026/11`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          revenue: 1300000,
          cost: 800000,
          outputMetres: 29000,
          wages: 385000,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.year).toBe(2026);
      expect(body.data.month).toBe(11);
      expect(body.data.revenue).toBe(1300000);
      expect(body.data.grossProfit).toBe(500000);
      expect(body.data.marginPct).toBe(38.46);
    });
  });
});

