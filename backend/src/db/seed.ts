/**
 * Seed script — maps frontend mockData.ts to DB rows.
 * Idempotent: skips rows that already exist (ON CONFLICT DO NOTHING).
 * Run: bun run seed
 */
import { db, pool } from './index.js';
import { sql } from 'drizzle-orm';
import {
  appConfig, machines, machineStatusLog, machineOutputLog,
  suppliers, yarnTypeSuppliers, yarnStock, yarnReceipts,
  salesOrders, productionOrders, fabricRolls,
  dispatches, dispatchRolls, orderCosts, monthlySnapshots, users,
  inventoryBalances, inventoryMovements,
} from './schema.js';
import bcrypt from 'bcrypt';
import { updateYarnLowStockGauge, updateProductionOutputGauge } from '../services/stubs.js';

async function seed() {
  console.log('🌱 Starting seed...');

  // ── Sequences ─────────────────────────────────────────────────────────────
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS yarn_receipts_seq START WITH 1000;`);
  await db.execute(sql`SELECT setval('yarn_receipts_seq', COALESCE((SELECT max(CAST(SUBSTRING(id FROM 9) AS INTEGER)) FROM yarn_receipts WHERE id ~ '^YR-[0-9]{4}-[0-9]+$'), 0) + 1);`);

  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS sales_orders_seq START WITH 1050;`);
  await db.execute(sql`SELECT setval('sales_orders_seq', COALESCE((SELECT max(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM sales_orders WHERE id ~ '^ORD-[0-9]+$'), 1000) + 1);`);

  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS dispatches_seq START WITH 305;`);
  await db.execute(sql`SELECT setval('dispatches_seq', COALESCE((SELECT max(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM dispatches WHERE id ~ '^DSP-[0-9]+$'), 300) + 1);`);

  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS fabric_rolls_seq START WITH 5515;`);
  await db.execute(sql`SELECT setval('fabric_rolls_seq', COALESCE((SELECT max(CAST(SUBSTRING(id FROM 4) AS INTEGER)) FROM fabric_rolls WHERE id ~ '^FR-[0-9]+$'), 5500) + 1);`);

  // ── App Config ────────────────────────────────────────────────────────────
  await db.insert(appConfig).values([
    { key: 'machine_daily_target_metres', value: '500' },
    { key: 'monthly_wages_inr', value: '385000' },
    { key: 'yarn_qc_damage_warning_pct', value: '30' },
    { key: 'yarn_qc_damage_rejection_pct', value: '40' },
    { key: 'yarn_qc_moisture_max_pct', value: '8.5' },
  ]).onConflictDoNothing();

  // ── Default users for all roles ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('changeme123', 12);
  await db.insert(users).values([
    {
      name: 'Admin',
      email: 'admin@everest.local',
      passwordHash,
      role: 'admin',
    },
    {
      name: 'Plant Manager',
      email: 'manager@everest.local',
      passwordHash,
      role: 'manager',
    },
    {
      name: 'Floor Operator',
      email: 'operator@everest.local',
      passwordHash,
      role: 'operator',
    },
    {
      name: 'QC Inspector',
      email: 'qc@everest.local',
      passwordHash,
      role: 'qc_inspector',
    },
    {
      name: 'Guest Viewer',
      email: 'viewer@everest.local',
      passwordHash,
      role: 'viewer',
    },
  ]).onConflictDoNothing();

  // ── Machines ──────────────────────────────────────────────────────────────
  await db.insert(machines).values([
    { id: 'SP-01', name: 'Spinner Alpha', type: 'spinning' },
    { id: 'SP-02', name: 'Spinner Beta',  type: 'spinning' },
    { id: 'SP-03', name: 'Spinner Gamma', type: 'spinning' },
    { id: 'WV-01', name: 'Weaver Prime',  type: 'weaving' },
    { id: 'WV-02', name: 'Weaver Duo',    type: 'weaving' },
    { id: 'WV-03', name: 'Weaver Trio',   type: 'weaving' },
    { id: 'DY-01', name: 'Dyer One',      type: 'dyeing' },
    { id: 'DY-02', name: 'Dyer Two',      type: 'dyeing' },
    { id: 'DY-03', name: 'Dyer Three',    type: 'dyeing' },
  ]).onConflictDoNothing();

  // ── Machine status log (latest = current state) ───────────────────────────
  const machineStatuses = [
    { machineId: 'SP-01', status: 'running' as const, currentOrderId: 'ORD-1042', operator: 'Ravi Kumar', progress: 68, shift: 'A' as const },
    { machineId: 'SP-02', status: 'running' as const, currentOrderId: 'ORD-1045', operator: 'Suresh M.',  progress: 32, shift: 'A' as const },
    { machineId: 'SP-03', status: 'idle' as const,    currentOrderId: null,        operator: undefined,    progress: 0,  shift: 'B' as const },
    { machineId: 'WV-01', status: 'running' as const, currentOrderId: 'ORD-1038', operator: 'Anil T.',    progress: 91, shift: 'A' as const },
    { machineId: 'WV-02', status: 'breakdown' as const, currentOrderId: null,      operator: 'Maintenance', progress: 0, shift: 'A' as const },
    { machineId: 'WV-03', status: 'running' as const, currentOrderId: 'ORD-1040', operator: 'Praveen R.', progress: 55, shift: 'B' as const },
    { machineId: 'DY-01', status: 'running' as const, currentOrderId: 'ORD-1033', operator: 'Mohan L.',   progress: 77, shift: 'A' as const },
    { machineId: 'DY-02', status: 'maintenance' as const, currentOrderId: null,    operator: 'Tech Team',  progress: 0,  shift: 'A' as const },
    { machineId: 'DY-03', status: 'running' as const, currentOrderId: 'ORD-1041', operator: 'Kiran S.',   progress: 45, shift: 'C' as const },
  ];
  for (const s of machineStatuses) {
    await db.insert(machineStatusLog).values({
      machineId: s.machineId,
      status: s.status,
      operator: s.operator ?? null,
      shift: s.shift,
      currentOrderId: s.currentOrderId ?? null,
      progress: s.progress,
    });
  }

  // ── Machine output log (today) ────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const outputData = [
    { machineId: 'SP-01', metres: 340 },
    { machineId: 'SP-02', metres: 180 },
    { machineId: 'SP-03', metres: 210 },
    { machineId: 'WV-01', metres: 520 },
    { machineId: 'WV-02', metres: 0 },
    { machineId: 'WV-03', metres: 390 },
    { machineId: 'DY-01', metres: 280 },
    { machineId: 'DY-02', metres: 0 },
    { machineId: 'DY-03', metres: 195 },
  ];
  await db.insert(machineOutputLog).values(
    outputData.map(o => ({ ...o, date: today }))
  ).onConflictDoNothing();

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const [shreeSupplierId]   = await db.insert(suppliers).values({ name: 'Shree Yarns Pvt. Ltd.', phone: '+91 98765 43210' }).returning({ id: suppliers.id });
  const [nationalFibresId]  = await db.insert(suppliers).values({ name: 'National Fibres',        phone: '+91 97654 32109' }).returning({ id: suppliers.id });
  const [bombayTextilesId]  = await db.insert(suppliers).values({ name: 'Bombay Textiles',        phone: '+91 96543 21098' }).returning({ id: suppliers.id });
  const [silkRouteTradersId]= await db.insert(suppliers).values({ name: 'Silk Route Traders',     phone: '+91 95432 10987' }).returning({ id: suppliers.id });

  // Yarn type → supplier mapping (from LowStockAlerts.tsx hardcoded map)
  await db.insert(yarnTypeSuppliers).values([
    { yarnType: 'Cotton',    supplierId: shreeSupplierId!.id },
    { yarnType: 'Blended',   supplierId: shreeSupplierId!.id },
    { yarnType: 'Polyester', supplierId: nationalFibresId!.id },
    { yarnType: 'Wool',      supplierId: bombayTextilesId!.id },
    { yarnType: 'Silk',      supplierId: silkRouteTradersId!.id },
  ]).onConflictDoNothing();

  // ── Yarn Stock ────────────────────────────────────────────────────────────
  await db.insert(yarnStock).values([
    { id: 'YS-001', type: 'Cotton',    colour: 'White',       quantityKg: '4200', reorderLevel: '1000', location: 'Bay A-1', lastUpdated: new Date('2026-10-10') },
    { id: 'YS-002', type: 'Cotton',    colour: 'Navy Blue',   quantityKg: '780',  reorderLevel: '1000', location: 'Bay A-2', lastUpdated: new Date('2026-10-09') },
    { id: 'YS-003', type: 'Polyester', colour: 'Black',       quantityKg: '3100', reorderLevel: '800',  location: 'Bay B-1', lastUpdated: new Date('2026-10-10') },
    { id: 'YS-004', type: 'Polyester', colour: 'Red',         quantityKg: '290',  reorderLevel: '500',  location: 'Bay B-2', lastUpdated: new Date('2026-10-08') },
    { id: 'YS-005', type: 'Wool',      colour: 'Grey',        quantityKg: '1650', reorderLevel: '400',  location: 'Bay C-1', lastUpdated: new Date('2026-10-10') },
    { id: 'YS-006', type: 'Silk',      colour: 'Ivory',       quantityKg: '450',  reorderLevel: '200',  location: 'Bay D-1', lastUpdated: new Date('2026-10-07') },
    { id: 'YS-007', type: 'Blended',   colour: 'Khaki',       quantityKg: '2200', reorderLevel: '600',  location: 'Bay E-1', lastUpdated: new Date('2026-10-10') },
    { id: 'YS-008', type: 'Cotton',    colour: 'Olive Green', quantityKg: '160',  reorderLevel: '500',  location: 'Bay A-3', lastUpdated: new Date('2026-10-06') },
  ]).onConflictDoNothing();

  // ── Sales Orders ──────────────────────────────────────────────────────────
  await db.insert(salesOrders).values([
    { id: 'ORD-1042', buyer: 'Fabindia Exports',    fabricType: 'Cotton Twill',    colour: 'White',    quantityMetres: '5000', deliveryDate: '2026-10-25', createdDate: '2026-10-01', status: 'spinning',       machineId: 'SP-01', completedMetres: '3400', unitPrice: '85' },
    { id: 'ORD-1041', buyer: 'Mafatlal Industries', fabricType: 'Poly-blend',       colour: 'Khaki',    quantityMetres: '3500', deliveryDate: '2026-10-28', createdDate: '2026-10-03', status: 'dyeing',         machineId: 'DY-03', completedMetres: '1575', unitPrice: '72' },
    { id: 'ORD-1040', buyer: 'Welspun Corp',         fabricType: 'Wool Tweed',       colour: 'Grey',     quantityMetres: '2000', deliveryDate: '2026-11-02', createdDate: '2026-10-04', status: 'weaving',        machineId: 'WV-03', completedMetres: '1100', unitPrice: '130' },
    { id: 'ORD-1038', buyer: 'Arvind Ltd.',           fabricType: 'Cotton Denim',    colour: 'Navy Blue',quantityMetres: '8000', deliveryDate: '2026-11-10', createdDate: '2026-09-25', status: 'weaving',        machineId: 'WV-01', completedMetres: '7280', unitPrice: '95' },
    { id: 'ORD-1045', buyer: 'Trident Group',         fabricType: 'Cotton Plain',    colour: 'White',    quantityMetres: '4500', deliveryDate: '2026-10-30', createdDate: '2026-10-07', status: 'spinning',       machineId: 'SP-02', completedMetres: '1440', unitPrice: '68' },
    { id: 'ORD-1033', buyer: 'Bombay Dyeing',         fabricType: 'Silk Charmeuse', colour: 'Ivory',    quantityMetres: '1200', deliveryDate: '2026-10-20', createdDate: '2026-09-20', status: 'quality_check',  machineId: 'DY-01', completedMetres: '1200', unitPrice: '320' },
    { id: 'ORD-1029', buyer: 'Raymond Ltd.',           fabricType: 'Wool Suiting',    colour: 'Charcoal', quantityMetres: '3000', deliveryDate: '2026-10-15', createdDate: '2026-09-15', status: 'ready_to_ship',  machineId: null,    completedMetres: '3000', unitPrice: '180' },
    { id: 'ORD-1025', buyer: 'Grasim Industries',     fabricType: 'Viscose Blend',   colour: 'Teal',     quantityMetres: '2500', deliveryDate: '2026-10-05', createdDate: '2026-09-10', status: 'dispatched',     machineId: null,    completedMetres: '2500', unitPrice: '110' },
  ]).onConflictDoNothing();

  // ── Yarn Receipts ─────────────────────────────────────────────────────────
  await db.insert(yarnReceipts).values([
    { id: 'YR-2026-088', date: '2026-10-10', supplierId: shreeSupplierId?.id, supplierName: 'Shree Yarns Pvt. Ltd.', yarnType: 'Cotton',    colour: 'White',     quantityKg: '1200', yarnStockId: 'YS-001', forOrderId: 'ORD-1045', receivedBy: 'Ganesh P.',  invoiceNo: 'SY-INV-4421' },
    { id: 'YR-2026-087', date: '2026-10-09', supplierId: nationalFibresId?.id, supplierName: 'National Fibres',        yarnType: 'Polyester', colour: 'Black',     quantityKg: '800',  yarnStockId: 'YS-003', forOrderId: null, receivedBy: 'Ganesh P.',  invoiceNo: 'NF-9032' },
    { id: 'YR-2026-086', date: '2026-10-08', supplierId: bombayTextilesId?.id, supplierName: 'Bombay Textiles',        yarnType: 'Wool',      colour: 'Grey',      quantityKg: '500',  yarnStockId: 'YS-005', forOrderId: 'ORD-1040', receivedBy: 'Ramesh K.',  invoiceNo: 'BT-7701' },
    { id: 'YR-2026-085', date: '2026-10-07', supplierId: shreeSupplierId?.id, supplierName: 'Shree Yarns Pvt. Ltd.', yarnType: 'Cotton',    colour: 'Navy Blue', quantityKg: '600',  yarnStockId: 'YS-002', forOrderId: 'ORD-1038', receivedBy: 'Ganesh P.',  invoiceNo: 'SY-INV-4398' },
    { id: 'YR-2026-084', date: '2026-10-05', supplierId: silkRouteTradersId?.id, supplierName: 'Silk Route Traders',    yarnType: 'Silk',      colour: 'Ivory',     quantityKg: '150',  yarnStockId: 'YS-006', forOrderId: 'ORD-1033', receivedBy: 'Ramesh K.',  invoiceNo: 'SR-2210' },
  ]).onConflictDoNothing();

  // ── Production Orders (one per active sales order) ────────────────────────
  await db.insert(productionOrders).values([
    { salesOrderId: 'ORD-1042', machineId: 'SP-01', startDate: '2026-10-01', expectedEndDate: '2026-10-25', status: 'in_progress', outputMetres: '3400', targetMetres: '5000' },
    { salesOrderId: 'ORD-1041', machineId: 'DY-03', startDate: '2026-10-03', expectedEndDate: '2026-10-28', status: 'in_progress', outputMetres: '1575', targetMetres: '3500' },
    { salesOrderId: 'ORD-1040', machineId: 'WV-03', startDate: '2026-10-04', expectedEndDate: '2026-11-02', status: 'in_progress', outputMetres: '1100', targetMetres: '2000' },
    { salesOrderId: 'ORD-1038', machineId: 'WV-01', startDate: '2026-09-25', expectedEndDate: '2026-11-10', status: 'in_progress', outputMetres: '7280', targetMetres: '8000' },
    { salesOrderId: 'ORD-1045', machineId: 'SP-02', startDate: '2026-10-07', expectedEndDate: '2026-10-30', status: 'in_progress', outputMetres: '1440', targetMetres: '4500' },
    { salesOrderId: 'ORD-1033', machineId: 'DY-01', startDate: '2026-09-20', expectedEndDate: '2026-10-20', status: 'completed',   outputMetres: '1200', targetMetres: '1200' },
    { salesOrderId: 'ORD-1029', machineId: 'WV-03', startDate: '2026-09-15', expectedEndDate: '2026-10-15', status: 'completed',   outputMetres: '3000', targetMetres: '3000' },
    { salesOrderId: 'ORD-1025', machineId: 'WV-01', startDate: '2026-09-10', expectedEndDate: '2026-10-05', status: 'completed',   outputMetres: '2500', targetMetres: '2500' },
  ]).onConflictDoNothing();

  // ── Fabric Rolls ──────────────────────────────────────────────────────────
  await db.insert(fabricRolls).values([
    { id: 'FR-5501', orderId: 'ORD-1033', machineId: 'DY-01', metres: '120', producedDate: '2026-10-09', qcResult: 'passed',   checkedBy: 'Vijay QC',  checkedAt: new Date('2026-10-10T09:15:00') },
    { id: 'FR-5502', orderId: 'ORD-1033', machineId: 'DY-01', metres: '115', producedDate: '2026-10-09', qcResult: 'passed',   checkedBy: 'Vijay QC',  checkedAt: new Date('2026-10-10T09:30:00') },
    { id: 'FR-5503', orderId: 'ORD-1033', machineId: 'DY-01', metres: '118', producedDate: '2026-10-09', qcResult: 'pending' },
    { id: 'FR-5504', orderId: 'ORD-1033', machineId: 'DY-01', metres: '122', producedDate: '2026-10-10', qcResult: 'pending' },
    { id: 'FR-5505', orderId: 'ORD-1038', machineId: 'WV-01', metres: '200', producedDate: '2026-10-08', qcResult: 'passed',   checkedBy: 'Meena QC',  checkedAt: new Date('2026-10-09T14:00:00') },
    { id: 'FR-5506', orderId: 'ORD-1038', machineId: 'WV-01', metres: '195', producedDate: '2026-10-08', qcResult: 'rejected', checkedBy: 'Meena QC',  checkedAt: new Date('2026-10-09T14:20:00'), defects: ['Holes', 'Uneven weaving'] },
    { id: 'FR-5507', orderId: 'ORD-1029', machineId: 'WV-03', metres: '180', producedDate: '2026-10-06', qcResult: 'passed',   checkedBy: 'Suresh QC', checkedAt: new Date('2026-10-07T11:00:00') },
    { id: 'FR-5508', orderId: 'ORD-1029', machineId: 'WV-03', metres: '175', producedDate: '2026-10-06', qcResult: 'passed',   checkedBy: 'Suresh QC', checkedAt: new Date('2026-10-07T11:15:00') },
    { id: 'FR-5509', orderId: 'ORD-1040', machineId: 'WV-03', metres: '160', producedDate: '2026-10-10', qcResult: 'pending' },
    { id: 'FR-5510', orderId: 'ORD-1040', machineId: 'WV-03', metres: '165', producedDate: '2026-10-10', qcResult: 'pending' },
  ]).onConflictDoNothing();

  // ── Dispatches ────────────────────────────────────────────────────────────
  await db.insert(dispatches).values([
    { id: 'DSP-301', orderId: 'ORD-1025', buyer: 'Grasim Industries', totalMetres: '2500', dispatchDate: '2026-10-06', invoiceNo: 'ETM-INV-1025', truckNo: 'KA-01-AB-4521', status: 'delivered' },
    { id: 'DSP-302', orderId: 'ORD-1029', buyer: 'Raymond Ltd.',       totalMetres: '355',  dispatchDate: '2026-10-11', invoiceNo: 'ETM-INV-1029', truckNo: 'KA-05-CD-7890', status: 'prepared' },
  ]).onConflictDoNothing();

  // ── Dispatch Rolls junction ───────────────────────────────────────────────
  // DSP-301: FR-5490, FR-5491, FR-5492 are not in fabric_rolls (from mock) — skipping
  // DSP-302: FR-5507, FR-5508
  await db.insert(dispatchRolls).values([
    { dispatchId: 'DSP-302', rollId: 'FR-5507' },
    { dispatchId: 'DSP-302', rollId: 'FR-5508' },
  ]).onConflictDoNothing();

  // ── Order Costs ───────────────────────────────────────────────────────────
  await db.insert(orderCosts).values([
    { orderId: 'ORD-1025', buyer: 'Grasim Industries', yarnCost: '62500',  labourCost: '18000', machineCost: '12000', revenue: '275000' },
    { orderId: 'ORD-1029', buyer: 'Raymond Ltd.',       yarnCost: '108000', labourCost: '27000', machineCost: '18000', revenue: '540000' },
    { orderId: 'ORD-1033', buyer: 'Bombay Dyeing',      yarnCost: '96000',  labourCost: '14400', machineCost: '9600',  revenue: '384000' },
    { orderId: 'ORD-1038', buyer: 'Arvind Ltd.',         yarnCost: '240000', labourCost: '64000', machineCost: '48000', revenue: '760000' },
    { orderId: 'ORD-1040', buyer: 'Welspun Corp',        yarnCost: '78000',  labourCost: '24000', machineCost: '16000', revenue: '260000' },
  ]).onConflictDoNothing();

  // ── Monthly Snapshots (May–Oct 2026) ──────────────────────────────────────
  await db.insert(monthlySnapshots).values([
    { year: 2026, month: 5,  revenue: '820000',  cost: '540000', outputMetres: '18400', wages: '385000' },
    { year: 2026, month: 6,  revenue: '960000',  cost: '620000', outputMetres: '21200', wages: '385000' },
    { year: 2026, month: 7,  revenue: '880000',  cost: '580000', outputMetres: '19800', wages: '385000' },
    { year: 2026, month: 8,  revenue: '1120000', cost: '700000', outputMetres: '25000', wages: '385000' },
    { year: 2026, month: 9,  revenue: '1050000', cost: '680000', outputMetres: '23500', wages: '385000' },
    { year: 2026, month: 10, revenue: '1240000', cost: '760000', outputMetres: '27800', wages: '385000' },
  ]).onConflictDoNothing();

  // ── Inventory Balances & Baseline Movements Backfill ──────────────────────
  const existingYarn = await db.select().from(yarnStock);
  for (const y of existingYarn) {
    await db.insert(inventoryBalances).values({
      itemType: 'yarn',
      itemId: y.id,
      skuName: `${y.type} ${y.colour}`,
      state: 'raw_yarn',
      quantity: y.quantityKg,
      reservedQuantity: '0',
      unit: 'kg',
      location: y.location,
    }).onConflictDoNothing();

    await db.insert(inventoryMovements).values({
      itemType: 'yarn',
      itemId: y.id,
      skuName: `${y.type} ${y.colour}`,
      state: 'raw_yarn',
      direction: 'in',
      quantity: y.quantityKg,
      quantityDelta: y.quantityKg,
      reservedDelta: '0',
      unit: 'kg',
      reason: 'receipt',
      referenceType: 'initial_stock',
      referenceId: y.id,
      idempotencyKey: `SEED:STOCK:${y.id}`,
      actor: 'System Seed',
    }).onConflictDoNothing();
  }

  // Backfill WIP for orders in spinning/weaving/dyeing
  const activeOrders = await db.select().from(salesOrders);
  for (const so of activeOrders) {
    if (['spinning', 'weaving', 'dyeing'].includes(so.status)) {
      const remainingMetres = Math.max(0, Number(so.quantityMetres) - Number(so.completedMetres));
      const wipKg = (remainingMetres * 0.25).toFixed(2);
      if (Number(wipKg) > 0) {
        await db.insert(inventoryBalances).values({
          itemType: 'yarn',
          itemId: so.id,
          skuName: `${so.fabricType} WIP (${so.colour})`,
          state: 'wip',
          quantity: wipKg,
          reservedQuantity: '0',
          unit: 'kg',
          location: 'Production Floor',
        }).onConflictDoNothing();

        await db.insert(inventoryMovements).values({
          itemType: 'yarn',
          itemId: so.id,
          skuName: `${so.fabricType} WIP (${so.colour})`,
          state: 'wip',
          direction: 'in',
          quantity: wipKg,
          quantityDelta: wipKg,
          reservedDelta: '0',
          unit: 'kg',
          reason: 'consumption',
          referenceType: 'sales_order',
          referenceId: so.id,
          idempotencyKey: `SEED:WIP:${so.id}`,
          actor: 'System Seed',
        }).onConflictDoNothing();
      }
    }
  }

  // Backfill fabric rolls: pending QC, finished goods, scrap fabric
  const allRolls = await db.select().from(fabricRolls);
  const dispatchedRollRows = await db.select().from(dispatchRolls);
  const dispatchedRollIds = new Set(dispatchedRollRows.map((dr) => dr.rollId));

  // 1. Rolls pending QC
  const pendingRolls = allRolls.filter((r) => r.qcResult === 'pending');
  const pendingByOrder: Record<string, number> = {};
  for (const r of pendingRolls) {
    pendingByOrder[r.orderId] = (pendingByOrder[r.orderId] ?? 0) + Number(r.metres);
  }
  for (const [orderId, metres] of Object.entries(pendingByOrder)) {
    await db.insert(inventoryBalances).values({
      itemType: 'fabric',
      itemId: orderId,
      skuName: `Fabric Order ${orderId}`,
      state: 'fabric_pending_qc',
      quantity: metres.toFixed(2),
      reservedQuantity: '0',
      unit: 'metres',
      location: 'Grading Area',
    }).onConflictDoNothing();

    await db.insert(inventoryMovements).values({
      itemType: 'fabric',
      itemId: orderId,
      skuName: `Fabric Order ${orderId}`,
      state: 'fabric_pending_qc',
      direction: 'in',
      quantity: metres.toFixed(2),
      quantityDelta: metres.toFixed(2),
      reservedDelta: '0',
      unit: 'metres',
      reason: 'roll_production',
      referenceType: 'sales_order',
      referenceId: orderId,
      idempotencyKey: `SEED:PENDING:${orderId}`,
      actor: 'System Seed',
    }).onConflictDoNothing();
  }

  // 2. Rolls passed QC (split unshipped vs dispatched)
  const passedRolls = allRolls.filter((r) => r.qcResult === 'passed');
  const unshippedPassedByOrder: Record<string, number> = {};
  const dispatchedPassedByOrder: Record<string, number> = {};
  for (const r of passedRolls) {
    if (dispatchedRollIds.has(r.id)) {
      dispatchedPassedByOrder[r.orderId] = (dispatchedPassedByOrder[r.orderId] ?? 0) + Number(r.metres);
    } else {
      unshippedPassedByOrder[r.orderId] = (unshippedPassedByOrder[r.orderId] ?? 0) + Number(r.metres);
    }
  }

  for (const [orderId, metres] of Object.entries(unshippedPassedByOrder)) {
    await db.insert(inventoryBalances).values({
      itemType: 'fabric',
      itemId: orderId,
      skuName: `Fabric Order ${orderId}`,
      state: 'finished_goods',
      quantity: metres.toFixed(2),
      reservedQuantity: '0',
      unit: 'metres',
      location: 'Finished Goods Vault',
    }).onConflictDoNothing();

    await db.insert(inventoryMovements).values({
      itemType: 'fabric',
      itemId: orderId,
      skuName: `Fabric Order ${orderId}`,
      state: 'finished_goods',
      direction: 'in',
      quantity: metres.toFixed(2),
      quantityDelta: metres.toFixed(2),
      reservedDelta: '0',
      unit: 'metres',
      reason: 'qc_pass',
      referenceType: 'sales_order',
      referenceId: orderId,
      idempotencyKey: `SEED:FG:${orderId}`,
      actor: 'System Seed',
    }).onConflictDoNothing();
  }

  for (const [orderId, metres] of Object.entries(dispatchedPassedByOrder)) {
    await db.insert(inventoryBalances).values({
      itemType: 'fabric',
      itemId: orderId,
      skuName: `Fabric Order ${orderId}`,
      state: 'finished_goods',
      quantity: '0.00',
      reservedQuantity: '0',
      unit: 'metres',
      location: 'Finished Goods Vault',
    }).onConflictDoUpdate({
      target: [inventoryBalances.itemId, inventoryBalances.state],
      set: { quantity: '0.00' },
    });

    await db.insert(inventoryMovements).values({
      itemType: 'fabric',
      itemId: orderId,
      skuName: `Fabric Order ${orderId}`,
      state: 'finished_goods',
      direction: 'in',
      quantity: metres.toFixed(2),
      quantityDelta: metres.toFixed(2),
      reservedDelta: '0',
      unit: 'metres',
      reason: 'qc_pass',
      referenceType: 'sales_order',
      referenceId: orderId,
      idempotencyKey: `SEED:FG_PASS:${orderId}`,
      actor: 'System Seed',
    }).onConflictDoNothing();

    await db.insert(inventoryMovements).values({
      itemType: 'fabric',
      itemId: orderId,
      skuName: `Fabric Order ${orderId}`,
      state: 'finished_goods',
      direction: 'out',
      quantity: metres.toFixed(2),
      quantityDelta: (-metres).toFixed(2),
      reservedDelta: '0',
      unit: 'metres',
      reason: 'dispatch',
      referenceType: 'dispatch',
      referenceId: 'DSP-302',
      idempotencyKey: `SEED:DSP:${orderId}`,
      actor: 'System Seed',
    }).onConflictDoNothing();
  }

  // 3. Rolls rejected QC
  const rejectedRolls = allRolls.filter((r) => r.qcResult === 'rejected');
  const rejectedByOrder: Record<string, number> = {};
  for (const r of rejectedRolls) {
    rejectedByOrder[r.orderId] = (rejectedByOrder[r.orderId] ?? 0) + Number(r.metres);
  }
  for (const [orderId, metres] of Object.entries(rejectedByOrder)) {
    await db.insert(inventoryBalances).values({
      itemType: 'fabric',
      itemId: orderId,
      skuName: `Fabric Order ${orderId}`,
      state: 'scrap_fabric',
      quantity: metres.toFixed(2),
      reservedQuantity: '0',
      unit: 'metres',
      location: 'Scrap Storage',
    }).onConflictDoNothing();

    await db.insert(inventoryMovements).values({
      itemType: 'fabric',
      itemId: orderId,
      skuName: `Fabric Order ${orderId}`,
      state: 'scrap_fabric',
      direction: 'in',
      quantity: metres.toFixed(2),
      quantityDelta: metres.toFixed(2),
      reservedDelta: '0',
      unit: 'metres',
      reason: 'qc_reject',
      referenceType: 'sales_order',
      referenceId: orderId,
      idempotencyKey: `SEED:SCRAP:${orderId}`,
      actor: 'System Seed',
    }).onConflictDoNothing();
  }

  // ── Observability Gauges ──────────────────────────────────────────────────
  await updateYarnLowStockGauge();
  await updateProductionOutputGauge();

  console.log('✅ Seed complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
