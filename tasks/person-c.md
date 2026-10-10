# Task Assignment: Person C (Procurement & Restocking)

**Branch:** `feat/person-c-procurement-restock`  
**Domain Focus:** Suppliers Registry, Purchase Orders (Manual & Automated), Material Shortfall Trigger, Restock Allocation Queue, PO Receiving into Inventory, Automatic Unlocking of Waiting Orders.

---

## 1. Scope & Ownership

Each table, module, and page has exactly one owner. Person C owns:

- **Owned Database Tables:**
  - `suppliers` (Supplier directory, contact coordinates, performance notes)
  - `yarn_type_suppliers` (Mapping between yarn fiber categories and approved vendors)
  - `purchase_orders` (Purchase order header: supplier, delivery date, status, auto-generated flag)
  - `purchase_order_items` (PO line items: yarn stock bin, ordered kg, received kg, unit price)
  - `restock_allocation_queue` (FIFO queue linking waiting sales order items to incoming PO stock)
  - `yarn_receipts` (Inward delivery receipts tied to purchase order fulfillment)
- **Owned Backend Modules:**
  - `backend/src/services/procurementService.ts` (Shortfall PO generation, supplier mapping resolution, reorder replenishment)
  - `backend/src/services/allocationService.ts` (Processes restock queue upon yarn delivery, unlocks waiting orders)
  - `backend/src/routes/purchaseOrders.ts` (`/api/v1/purchase-orders`, line items, receiving endpoint)
  - `backend/src/routes/suppliers.ts` (`/api/v1/suppliers` — supplier management and yarn type associations)
  - `backend/src/routes/yarn.ts` (Refactored `/receipts` and `/stock/alerts` endpoints)
- **Owned Frontend Pages:**
  - `/yarn/alerts` (`LowStockAlerts.tsx` — working "Raise PO" action modal and shortfall indicators)
  - `/yarn/receipts` (`YarnReceipts.tsx` — linked to purchase orders, searchable standard shade combobox)
  - `/procurement/orders` (New Purchase Order Dashboard — list, detail, status filters, and receiving drawer)
- **Owned Tests & Scenarios:**
  - `backend/src/__tests__/auto_po_shortfall.test.ts` (Verifies automatic PO creation when sales order has shortfall)
  - `backend/src/__tests__/po_receiving_inventory.test.ts` (Receiving PO calls Person A's service to atomically increment stock)
  - `backend/src/__tests__/waiting_order_allocation.test.ts` (FIFO queue satisfaction and order status advancement)
  - `backend/src/__tests__/k6/k6_po_receiving.js` (Concurrent PO receiving and allocation under load)
- **Owned Prometheus Metrics:**
  - `procurement_auto_pos_total{yarn_type, supplier_id}`
  - `procurement_shortfall_kg_total{yarn_stock_id}`
  - `procurement_waiting_orders_queued`
  - `procurement_po_receipt_latency_seconds`

---

## 2. Technical Standards & Invariants

1. **Automatic Shortfall Guarantee:** When an order item cannot be satisfied from available inventory, a corresponding `restock_allocation_queue` entry and an `issued` `purchase_orders` row must be created within the same database transaction or immediate in-process queue.
2. **Supplier Resolution Rule:** Map yarn type to supplier using `yarn_type_suppliers`. If multiple vendors supply the same fiber, select the primary vendor. If no supplier is mapped, log an alert and mark queue item as `unassigned_supplier` without crashing.
3. **Inventory Service Integration:** Person C must never mutate `inventory_balances` or `inventory_movements` directly. When yarn arrives, Person C calls `inventoryService.recordReceipt`.
4. **FIFO Allocation:** Newly delivered yarn is allocated to waiting orders in strict chronological order of order creation (`sales_order_items.created_at ASC`).
5. **Tolerance Rules:** A PO line item may receive up to 10% overage to accommodate commercial yarn carton weights (`chk_received_le_ordered`).

---

## 3. Ordered Implementation Steps

### Step 1: Phase 0 Schema & Contract Contribution
1. Collaborate on Phase 0 PR: define `purchase_orders`, `purchase_order_items`, `restock_allocation_queue`, and `po_status` enum in `schema.ts`.
2. Define `IProcurementService` and `IAllocationService` stub interfaces in `backend/src/types/contract.ts`.

### Step 2: Implement Purchase Orders Core API
1. Build `backend/src/routes/purchaseOrders.ts`:
   - `GET /api/v1/purchase-orders`: List POs with status filters (`draft`, `issued`, `partially_received`, `received`, `cancelled`).
   - `GET /api/v1/purchase-orders/:id`: Full PO profile with itemized yarn specs and delivery tracking.
   - `POST /api/v1/purchase-orders`: Manual PO creation by `admin` or `manager`.
   - `POST /api/v1/purchase-orders/:id/cancel`: Cancel open PO.
2. Ensure automatic sequence generation for PO IDs (e.g. `PO-2026-0042`).

### Step 3: Implement Automated Shortfall Trigger
1. Build `backend/src/services/procurementService.ts`:
   - Method `createShortfallPO(tx, params)`:
     - Identify supplier from `yarn_type_suppliers`.
     - Calculate order quantity: `orderKg = GREATEST(shortfallKg, reorder_level_min)`.
     - Insert `purchase_orders` (`status: 'issued'`, `auto_generated: true`).
     - Insert `purchase_order_items` linked to `yarn_stock_id`.
     - Insert `restock_allocation_queue` linking `sales_order_item_id` and `shortfall_kg`.
   - Method `checkReorderLevelTriggers(tx)`: Periodic background check generating POs for bins where on-hand quantity falls below safety stock.

### Step 4: Implement Inward Receiving & Waiting-Order Allocation
1. Build receiving endpoint `POST /api/v1/purchase-orders/:id/receive`:
   - Validates PO is in `issued` or `partially_received` state.
   - For each received line item, calls Person A's `inventoryService.recordReceipt` to atomically update warehouse balances.
   - Updates `purchase_order_items.received_kg`. If all items are satisfied, marks PO as `received`.
2. Build `backend/src/services/allocationService.ts`:
   - Query `restock_allocation_queue` for unsatisfied items matching the received `yarn_stock_id`.
   - Loop through items FIFO:
     - Call Person A's `inventoryService.reserveYarnForOrder` to reserve the newly arrived yarn for the waiting order item.
     - Update queue item: increment `allocated_kg`; if satisfied, set `is_satisfied = true`.
     - Call Person B's `salesOrderService` (or handoff stub) to advance the order item status from `'awaiting_yarn'` to `'yarn_reserved'` (and `'in_production'` if all items are ready).

### Step 5: Frontend Development
1. **Low Stock Alerts (`/yarn/alerts`):**
   - Wire the previously inert "Raise PO" button.
   - Build a **Raise PO Modal** pre-filling supplier, yarn variety, shortfall quantity, and generated PO reference.
   - Add status pill indicating whether an automated PO has already been issued for a flagged deficit.
2. **Yarn Receipts (`/yarn/receipts`):**
   - Link receipt creation to an active Purchase Order dropdown.
   - Replace the free-text colour input with a **Searchable Color Combobox** pre-loaded with standard mill shades (`Navy Blue`, `Natural White`, `Charcoal`, `Olive Green`, etc.).
3. **Purchase Orders Dashboard (`/procurement/orders`):**
   - Build new view listing active and completed POs.
   - Build Inward Delivery Receiving Drawer enabling warehouse clerks to log incoming truck weights and supplier invoices against open POs.

### Step 6: Testing & Load Verification
1. Run `auto_po_shortfall.test.ts`: verify automated PO generated upon shortfall.
2. Run `po_receiving_inventory.test.ts`: confirm inventory is credited and movements logged.
3. Run `waiting_order_allocation.test.ts`: confirm waiting sales orders transition automatically upon receiving yarn.
4. Execute k6 benchmark `k6_po_receiving.js`: verify simultaneous PO receiving and allocation execution.

---

## 4. Done Checklist

- [ ] `purchase_orders` and `purchase_order_items` tables and API are active.
- [ ] Material shortfalls automatically generate `issued` POs and queue entries.
- [ ] Receiving a PO credits physical inventory exclusively through `inventoryService`.
- [ ] Waiting orders in the allocation queue are unlocked FIFO upon stock arrival.
- [ ] "Raise PO" button on `/yarn/alerts` opens a fully functional procurement modal.
- [ ] Receipt form color input is a searchable combobox preventing typographical inventory drift.
- [ ] Automated PO counter and queue depth Prometheus metrics are live.
- [ ] All procurement and allocation integration tests pass with 0 errors.
