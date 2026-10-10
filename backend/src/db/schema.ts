// @ts-nocheck
import { pgTable, varchar, text, integer, smallint, boolean, numeric, date, timestamp, pgEnum, uuid, jsonb, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const machineStatusEnum = pgEnum('machine_status', ['running', 'idle', 'maintenance', 'breakdown']);
export const machineTypeEnum   = pgEnum('machine_type',   ['spinning', 'weaving', 'dyeing']);
export const machineShiftEnum  = pgEnum('machine_shift',  ['A', 'B', 'C']);

export const yarnTypeEnum      = pgEnum('yarn_type', ['Cotton', 'Polyester', 'Wool', 'Silk', 'Blended']);

export const orderStatusEnum   = pgEnum('order_status', [
  'pending', 'awaiting_yarn', 'confirmed', 'spinning', 'weaving', 'dyeing',
  'quality_check', 'ready_to_ship', 'dispatched',
]);

export const productionStatusEnum = pgEnum('production_status', [
  'queued', 'in_progress', 'paused', 'completed',
]);

export const qcResultEnum      = pgEnum('qc_result',      ['passed', 'rejected', 'pending']);
export const dispatchStatusEnum = pgEnum('dispatch_status', ['prepared', 'loaded', 'delivered']);
export const userRoleEnum      = pgEnum('user_role', ['admin', 'manager', 'operator', 'qc_inspector', 'viewer', 'client']);

export const inventoryItemTypeEnum = pgEnum('inventory_item_type', ['yarn', 'fabric', 'scrap']);
export const inventoryStateEnum    = pgEnum('inventory_state', [
  'raw_yarn', 'wip', 'fabric_pending_qc', 'finished_goods', 'scrap_fabric', 'scrap_yarn',
]);
export const movementDirectionEnum = pgEnum('movement_direction', ['in', 'out']);
export const movementReasonEnum    = pgEnum('movement_reason', [
  'receipt', 'reservation', 'unreservation', 'consumption',
  'roll_production', 'qc_pass', 'qc_reject', 'dispatch',
  'yield_variance', 'adjustment', 'cancellation',
]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name:         varchar('name', { length: 120 }).notNull(),
  email:        varchar('email', { length: 200 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role:         userRoleEnum('role').notNull().default('viewer'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── App Config ───────────────────────────────────────────────────────────────
export const appConfig = pgTable('app_config', {
  key:   varchar('key', { length: 80 }).primaryKey(),
  value: text('value').notNull(),
});

// ─── Machines ─────────────────────────────────────────────────────────────────
export const machines = pgTable('machines', {
  id:          varchar('id', { length: 10 }).primaryKey(),  // e.g. SP-01
  name:        varchar('name', { length: 120 }).notNull(),
  type:        machineTypeEnum('type').notNull(),
  dailyTarget: integer('daily_target').notNull().default(500), // metres
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Machine Status Log ───────────────────────────────────────────────────────
// Latest row per machine = current status
export const machineStatusLog = pgTable('machine_status_log', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  machineId:      varchar('machine_id', { length: 10 }).notNull().references(() => machines.id),
  status:         machineStatusEnum('status').notNull(),
  operator:       varchar('operator', { length: 120 }),
  shift:          machineShiftEnum('shift').notNull(),
  currentOrderId: varchar('current_order_id', { length: 20 }),  // FK added after sales_orders defined
  progress:       smallint('progress').notNull().default(0),     // 0-100
  recordedAt:     timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Machine Output Log ───────────────────────────────────────────────────────
// One row per machine per day
export const machineOutputLog = pgTable('machine_output_log', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  machineId: varchar('machine_id', { length: 10 }).notNull().references(() => machines.id),
  date:      date('date').notNull(),
  metres:    integer('metres').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('machine_output_unique').on(t.machineId, t.date),
]);

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliers = pgTable('suppliers', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name:      varchar('name', { length: 200 }).notNull(),
  phone:     varchar('phone', { length: 30 }),
  email:     varchar('email', { length: 200 }),
  notes:     text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Yarn Type → Supplier mapping ────────────────────────────────────────────
export const yarnTypeSuppliers = pgTable('yarn_type_suppliers', {
  yarnType:   yarnTypeEnum('yarn_type').notNull(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
}, (t) => [
  unique('yarn_supplier_unique').on(t.yarnType, t.supplierId),
]);

// ─── Yarn Stock ───────────────────────────────────────────────────────────────
export const yarnStock = pgTable('yarn_stock', {
  id:           varchar('id', { length: 20 }).primaryKey(),  // YS-001
  type:         yarnTypeEnum('type').notNull(),
  colour:       varchar('colour', { length: 80 }).notNull(),
  quantityKg:   numeric('quantity_kg', { precision: 10, scale: 2 }).notNull().default('0'),
  reorderLevel: numeric('reorder_level', { precision: 10, scale: 2 }).notNull().default('0'),
  location:     varchar('location', { length: 80 }).notNull(),
  lastUpdated:  timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = pgTable('products', {
  id:              varchar('id', { length: 20 }).primaryKey(),
  name:            varchar('name', { length: 120 }).notNull(),
  fabricType:      varchar('fabric_type', { length: 120 }).notNull(),
  gsm:             integer('gsm').notNull(),
  widthInches:     integer('width_inches').notNull(),
  yarnType:        yarnTypeEnum('yarn_type').notNull(),
  yarnKgPerMetre:  numeric('yarn_kg_per_metre', { precision: 10, scale: 4 }).notNull(),
  pricePerMetre:   numeric('price_per_metre', { precision: 10, scale: 2 }).notNull(),
  isActive:        boolean('is_active').notNull().default(true),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Sales Orders (Header) ───────────────────────────────────────────────────
export const salesOrders = pgTable('sales_orders', {
  id:               varchar('id', { length: 20 }).primaryKey(),  // ORD-NNNN
  clientId:         uuid('client_id').notNull().references(() => users.id),
  buyer:            varchar('buyer', { length: 200 }).notNull(),
  totalAmount:      numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  deliveryDate:     date('delivery_date').notNull(),
  createdDate:      date('created_date').notNull().default(sql`CURRENT_DATE`),
  status:           orderStatusEnum('status').notNull().default('pending'),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Sales Order Items ────────────────────────────────────────────────────────
export const itemStatusEnum = pgEnum('item_status', [
  'pending', 'awaiting_yarn', 'confirmed', 'spinning', 'weaving', 'dyeing',
  'quality_check', 'ready_to_ship', 'dispatched',
]);

export const salesOrderItems = pgTable('sales_order_items', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId:          varchar('order_id', { length: 20 }).notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  sequence:         integer('sequence').notNull(),
  productId:        varchar('product_id', { length: 20 }).notNull().references(() => products.id),
  quantityMetres:   numeric('quantity_metres', { precision: 10, scale: 2 }).notNull(),
  unitPrice:        numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  yarnKgPerMetre:   numeric('yarn_kg_per_metre', { precision: 10, scale: 4 }).notNull(),
  status:           itemStatusEnum('status').notNull().default('pending'),
  completedMetres:  numeric('completed_metres', { precision: 10, scale: 2 }).notNull().default('0'),
  dispatchedMetres: numeric('dispatched_metres', { precision: 10, scale: 2 }).notNull().default('0'),
});


// ─── Yarn Receipts ────────────────────────────────────────────────────────────
export const yarnReceipts = pgTable('yarn_receipts', {
  id:           varchar('id', { length: 30 }).primaryKey(),  // YR-2026-088
  date:         date('date').notNull(),
  supplierId:   uuid('supplier_id').references(() => suppliers.id),
  supplierName: varchar('supplier_name', { length: 200 }).notNull(),
  yarnType:     yarnTypeEnum('yarn_type').notNull(),
  colour:       varchar('colour', { length: 80 }).notNull(),
  quantityKg:   numeric('quantity_kg', { precision: 10, scale: 2 }).notNull(),
  yarnStockId:  varchar('yarn_stock_id', { length: 20 }).references(() => yarnStock.id),
  forOrderId:   varchar('for_order_id', { length: 20 }).references(() => salesOrders.id),
  receivedBy:   varchar('received_by', { length: 120 }).notNull(),
  invoiceNo:    varchar('invoice_no', { length: 80 }).notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Production Orders ────────────────────────────────────────────────────────
export const productionOrders = pgTable('production_orders', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  salesOrderId:    varchar('sales_order_id', { length: 20 }).notNull().references(() => salesOrders.id),
  machineId:       varchar('machine_id', { length: 10 }).notNull().references(() => machines.id),
  startDate:       date('start_date').notNull(),
  expectedEndDate: date('expected_end_date').notNull(),
  status:          productionStatusEnum('status').notNull().default('queued'),
  outputMetres:    numeric('output_metres', { precision: 10, scale: 2 }).notNull().default('0'),
  targetMetres:    numeric('target_metres', { precision: 10, scale: 2 }).notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Fabric Rolls ─────────────────────────────────────────────────────────────
export const fabricRolls = pgTable('fabric_rolls', {
  id:           varchar('id', { length: 20 }).primaryKey(),  // FR-NNNN
  orderId:      varchar('order_id', { length: 20 }).notNull().references(() => salesOrders.id),
  machineId:    varchar('machine_id', { length: 10 }).notNull().references(() => machines.id),
  metres:       numeric('metres', { precision: 8, scale: 2 }).notNull(),
  producedDate: date('produced_date').notNull(),
  qcResult:     qcResultEnum('qc_result').notNull().default('pending'),
  defects:      jsonb('defects'),           // string[] | null
  checkedBy:    varchar('checked_by', { length: 120 }),
  checkedAt:    timestamp('checked_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Dispatches ───────────────────────────────────────────────────────────────
export const dispatches = pgTable('dispatches', {
  id:           varchar('id', { length: 20 }).primaryKey(),  // DSP-NNN
  orderId:      varchar('order_id', { length: 20 }).notNull().references(() => salesOrders.id),
  buyer:        varchar('buyer', { length: 200 }).notNull(),   // denorm
  totalMetres:  numeric('total_metres', { precision: 10, scale: 2 }).notNull(),
  dispatchDate: date('dispatch_date').notNull(),
  invoiceNo:    varchar('invoice_no', { length: 80 }).notNull(),
  truckNo:      varchar('truck_no', { length: 40 }).notNull(),
  status:       dispatchStatusEnum('status').notNull().default('prepared'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Dispatch Items ───────────────────────────────────────────────────────────
export const dispatchItems = pgTable('dispatch_items', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  dispatchId:       varchar('dispatch_id', { length: 20 }).notNull().references(() => dispatches.id, { onDelete: 'cascade' }),
  salesOrderItemId: uuid('sales_order_item_id').notNull().references(() => salesOrderItems.id),
  metres:           numeric('metres', { precision: 10, scale: 2 }).notNull(),
});


// ─── Dispatch ↔ Fabric Roll junction ─────────────────────────────────────────
export const dispatchRolls = pgTable('dispatch_rolls', {
  dispatchId: varchar('dispatch_id', { length: 20 }).notNull().references(() => dispatches.id, { onDelete: 'cascade' }),
  rollId:     varchar('roll_id', { length: 20 }).notNull().references(() => fabricRolls.id),
}, (t) => [
  unique('dispatch_roll_unique').on(t.dispatchId, t.rollId),
  unique('dispatch_roll_single_shipment').on(t.rollId),
]);

// ─── Order Costs ──────────────────────────────────────────────────────────────
export const orderCosts = pgTable('order_costs', {
  orderId:     varchar('order_id', { length: 20 }).primaryKey().references(() => salesOrders.id),
  buyer:       varchar('buyer', { length: 200 }).notNull(),  // denorm
  yarnCost:    numeric('yarn_cost',    { precision: 12, scale: 2 }).notNull().default('0'),
  labourCost:  numeric('labour_cost',  { precision: 12, scale: 2 }).notNull().default('0'),
  machineCost: numeric('machine_cost', { precision: 12, scale: 2 }).notNull().default('0'),
  revenue:     numeric('revenue',      { precision: 12, scale: 2 }).notNull().default('0'),
  // totalCost = yarnCost + labourCost + machineCost  (computed in query)
  // profit    = revenue - totalCost                  (computed in query)
  // marginPct = profit / revenue * 100               (computed in query)
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Monthly Snapshots ────────────────────────────────────────────────────────
export const monthlySnapshots = pgTable('monthly_snapshots', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  year:         smallint('year').notNull(),
  month:        smallint('month').notNull(),
  revenue:      numeric('revenue',       { precision: 14, scale: 2 }).notNull().default('0'),
  cost:         numeric('cost',          { precision: 14, scale: 2 }).notNull().default('0'),
  outputMetres: numeric('output_metres', { precision: 14, scale: 2 }).notNull().default('0'),
  wages:        numeric('wages',         { precision: 14, scale: 2 }).notNull().default('0'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('monthly_snapshot_unique').on(t.year, t.month),
]);

// ─── Inventory Balances Snapshot ──────────────────────────────────────────────
export const inventoryBalances = pgTable('inventory_balances', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  itemType:         inventoryItemTypeEnum('item_type').notNull(),
  itemId:           varchar('item_id', { length: 80 }).notNull(), // 'YS-001' or 'ORD-1038:Cotton-Denim'
  skuName:          varchar('sku_name', { length: 150 }).notNull(),
  state:            inventoryStateEnum('state').notNull(),
  quantity:         numeric('quantity', { precision: 12, scale: 2 }).notNull().default('0'),
  reservedQuantity: numeric('reserved_quantity', { precision: 12, scale: 2 }).notNull().default('0'),
  unit:             varchar('unit', { length: 20 }).notNull(), // 'kg' or 'metres'
  location:         varchar('location', { length: 80 }).notNull().default('Main Floor'),
  lastUpdated:      timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('uq_inv_balance_item_state').on(t.itemId, t.state),
  check('chk_balance_qty_non_neg', sql`${t.quantity} >= 0`),
  check('chk_balance_reserved_non_neg', sql`${t.reservedQuantity} >= 0`),
  check('chk_balance_avail_non_neg', sql`${t.quantity} >= ${t.reservedQuantity}`),
]);

// ─── Immutable Inventory Movement Ledger ──────────────────────────────────────
export const inventoryMovements = pgTable('inventory_movements', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  itemType:       inventoryItemTypeEnum('item_type').notNull(),
  itemId:         varchar('item_id', { length: 80 }).notNull(),
  skuName:        varchar('sku_name', { length: 150 }).notNull(),
  state:          inventoryStateEnum('state').notNull(),
  direction:      movementDirectionEnum('direction').notNull(),
  quantity:       numeric('quantity', { precision: 12, scale: 2 }).notNull(),
  quantityDelta:  numeric('quantity_delta', { precision: 12, scale: 2 }).notNull(),
  reservedDelta:  numeric('reserved_delta', { precision: 12, scale: 2 }).notNull().default('0'),
  unit:           varchar('unit', { length: 20 }).notNull(),
  reason:         movementReasonEnum('reason').notNull(),
  referenceType:  varchar('reference_type', { length: 40 }).notNull(),
  referenceId:    varchar('reference_id', { length: 80 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 120 }).unique(),
  actor:          varchar('actor', { length: 120 }).notNull(),
  unitCostInr:    numeric('unit_cost_inr', { precision: 10, scale: 2 }),
  totalCostInr:   numeric('total_cost_inr', { precision: 12, scale: 2 }),
  notes:          text('notes'),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('chk_movement_qty_positive', sql`${t.quantity} > 0`),
]);

// ─── Type exports ─────────────────────────────────────────────────────────────
export type User               = typeof users.$inferSelect;
export type NewUser            = typeof users.$inferInsert;
export type Machine            = typeof machines.$inferSelect;
export type NewMachine         = typeof machines.$inferInsert;
export type MachineStatusLog   = typeof machineStatusLog.$inferSelect;
export type MachineOutputLog   = typeof machineOutputLog.$inferSelect;
export type Supplier           = typeof suppliers.$inferSelect;
export type YarnStock          = typeof yarnStock.$inferSelect;
export type NewYarnStock       = typeof yarnStock.$inferInsert;
export type YarnReceipt        = typeof yarnReceipts.$inferSelect;
export type NewYarnReceipt     = typeof yarnReceipts.$inferInsert;
export type SalesOrder         = typeof salesOrders.$inferSelect;
export type NewSalesOrder      = typeof salesOrders.$inferInsert;
export type ProductionOrder    = typeof productionOrders.$inferSelect;
export type NewProductionOrder = typeof productionOrders.$inferInsert;
export type FabricRoll         = typeof fabricRolls.$inferSelect;
export type NewFabricRoll      = typeof fabricRolls.$inferInsert;
export type Dispatch           = typeof dispatches.$inferSelect;
export type NewDispatch        = typeof dispatches.$inferInsert;
export type OrderCost          = typeof orderCosts.$inferSelect;
export type MonthlySnapshot    = typeof monthlySnapshots.$inferSelect;
export type InventoryBalance   = typeof inventoryBalances.$inferSelect;
export type NewInventoryBalance = typeof inventoryBalances.$inferInsert;
export type InventoryMovement  = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;

export type Product            = typeof products.$inferSelect;
export type NewProduct         = typeof products.$inferInsert;
export type SalesOrderItem     = typeof salesOrderItems.$inferSelect;
export type NewSalesOrderItem  = typeof salesOrderItems.$inferInsert;
export type DispatchItem       = typeof dispatchItems.$inferSelect;
export type NewDispatchItem    = typeof dispatchItems.$inferInsert;
