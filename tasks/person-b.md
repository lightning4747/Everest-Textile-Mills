# Task Assignment: Person B (Sales & Clients)

**Branch:** `feat/person-b-sales-portal`  
**Domain Focus:** Products Master Catalog, Redesigned Multi-Fabric Sales Orders (Header & Line Items), Client Accounts & Authentication, Client Portal (Order Placement & Status Tracking), Dispatch Linkage to Order Items.

---

## 1. Scope & Ownership

Each table, module, and page has exactly one owner. Person B owns:

- **Owned Database Tables:**
  - `products` (Commercial fabric SKUs, specifications, pricing, yarn consumption rates)
  - `sales_orders` (Order header: client, buyer, delivery date, status, total amount)
  - `sales_order_items` (Order line items: sequence, product, metres, prices, statuses, yarn linkage)
  - `dispatches` (Consignment header: truck number, invoice reference, status)
  - `dispatch_items` (Junction linking dispatches to specific order line items)
  - `users` (Authentication table extensions: support for `role = 'client'`)
- **Owned Backend Modules:**
  - `backend/src/services/salesOrderService.ts` (Order creation, multi-item validation, status progression FSM)
  - `backend/src/routes/products.ts` (`/api/v1/products`)
  - `backend/src/routes/salesOrders.ts` (`/api/v1/sales-orders`)
  - `backend/src/routes/clientPortal.ts` (`/api/v1/client/orders`, `/api/v1/client/products`)
  - `backend/src/routes/dispatches.ts` (Refactored to link to line items and call `inventoryService.dispatchRolls`)
- **Owned Frontend Pages:**
  - `/sales/orders` (`SalesOrders.tsx` — updated for multi-fabric lines and stepper stages)
  - `/sales/status` (`OrderStatus.tsx` — live order status pipeline)
  - `/sales/dispatches` (`Dispatches.tsx` — consignment logistics with line item breakdown)
  - `/portal/orders` & `/portal/new-order` (New Client Portal — customer login, fabric catalog order placement, self-service order tracking)
- **Owned Tests & Scenarios:**
  - `backend/src/__tests__/multi_fabric_order.test.ts` (Multi-line calculation, yarn requirements, line status derivation)
  - `backend/src/__tests__/client_portal_rbac.test.ts` (Strict client data isolation; zero cross-tenant access)
  - `backend/src/__tests__/order_status_fsm.test.ts` (Enforces forward-only transitions; no illegal leaps)
  - `backend/src/__tests__/k6/k6_client_orders.js` (Concurrent order placement & pipeline polling load test)
- **Owned Prometheus Metrics:**
  - `sales_orders_created_total{client_id, status}`
  - `sales_order_value_inr{client_id}`
  - `client_portal_requests_total{endpoint, status_code}`

---

## 2. Technical Standards & Invariants

1. **Multi-Fabric Decoupling:** One sales order header contains 1 to $N$ `sales_order_items`. Header status is deterministically derived from the collective statuses of its line items.
2. **Products Master Integrity:** Order items must link to an active product in `products`. Price and nominal yarn consumption rate are snapshotted on the order item at time of creation.
3. **Client Tenant Isolation:** Endpoints under `/api/v1/client/*` must filter strictly by `req.user.id`. A client attempting to access another client's order must receive a 404/403. Clients must never access internal operational endpoints.
4. **Handoff Compliance:**
   - Call `inventoryService.reserveYarnForOrder` during order confirmation.
   - If a line item experiences a shortfall, call `procurementService.createShortfallPO`.
   - Call `inventoryService.dispatchRolls` when generating shipments.

---

## 3. Ordered Implementation Steps

### Step 1: Phase 0 Schema & Contract Contribution
1. Collaborate on Phase 0 PR: define `products`, `sales_orders`, `sales_order_items`, `dispatch_items`, and enums in `schema.ts`.
2. Ensure `userRoleEnum` includes `'client'`.
3. Review and sign off on stub interfaces in `backend/src/types/contract.ts`.

### Step 2: Implement Products Catalog Module
1. Build `backend/src/routes/products.ts`:
   - `GET /api/v1/products`: List active products with specs (fabric type, GSM, width, yarn type, consumption rate, price).
   - `POST /api/v1/products`: Register new fabric SKU (restricted to `admin`, `manager`).
   - `PATCH /api/v1/products/:id`: Update price or active status.
2. Seed initial product catalog from existing fabric styles (`Cotton Twill`, `Cotton Denim`, `Wool Tweed`, `Silk Charmeuse`, `Poly-blend`).

### Step 3: Build Multi-Fabric Sales Order Engine
1. Implement `backend/src/services/salesOrderService.ts`:
   - Calculate total order amount and yarn requirements per line item:
     $$\text{Required Yarn (kg)} = \text{metres} \times \text{product.yarn\_kg\_per\_metre}$$
   - Coordinate with Person A's reservation stub (`inventoryService.reserveYarnForOrder`).
   - If stock is insufficient, set item status to `'awaiting_yarn'` and call Person C's shortfall stub (`procurementService.createShortfallPO`).
   - Derive header status: If any item is `'awaiting_yarn'`, header status is `'awaiting_yarn'`. If all are reserved, header status is `'confirmed'`.
2. Refactor `backend/src/routes/salesOrders.ts` to support multi-line order payloads.

### Step 4: Implement Client Portal & RBAC
1. Extend auth middleware to recognize `role = 'client'`.
2. Create `backend/src/routes/clientPortal.ts`:
   - `GET /api/v1/client/products`: Read-only fabric catalog for clients.
   - `POST /api/v1/client/orders`: Place multi-item order tied strictly to client's token (`req.user.id`).
   - `GET /api/v1/client/orders`: Paginated list of client's own orders.
   - `GET /api/v1/client/orders/:id`: Single order tracking milestone status.

### Step 5: Refactor Dispatches
1. Update `backend/src/routes/dispatches.ts`:
   - Accept `orderId` and selected roll IDs.
   - Validate selected rolls belong to the sales order's line items and have `qc_result = 'passed'`.
   - Call `inventoryService.dispatchRolls` to atomically update finished goods.
   - Insert `dispatch_items` tracking meters shipped per line item.
   - Update `sales_order_items.dispatched_metres`. Advance order to `'dispatched'` only when all items are fully shipped.

### Step 6: Frontend Development
1. **Sales Orders View (`/sales/orders`):** Update UI to display multi-item accordions/expandable rows showing progress per fabric line.
2. **Dispatches View (`/sales/dispatches`):** Display line item allocations for each dispatch note.
3. **Client Portal UI (`/portal/*`):**
   - Build client login and portal layout shell.
   - Build order placement form (`/portal/new-order`) with fabric selector, meterage inputs, and live price calculation.
   - Build customer order tracking view (`/portal/orders`) with high-level production milestone progress.

### Step 7: Testing & Load Verification
1. Run `multi_fabric_order.test.ts` to verify multi-line reservations and status derivations.
2. Run `client_portal_rbac.test.ts` to ensure 100% tenant boundary isolation.
3. Run `order_status_fsm.test.ts` to verify illegal status transitions are blocked.
4. Execute k6 benchmark `k6_client_orders.js`: target 100 concurrent checkout requests with zero errors.

---

## 4. Done Checklist

- [ ] `products` catalog is live and accessible with specifications and pricing.
- [ ] Sales orders support multiple fabric line items in a single order header.
- [ ] Line item status transitions adhere to strict FSM without backward jumps.
- [ ] Client users can log in and view exclusively their own orders.
- [ ] Client cannot access administrative, machine, or inventory endpoints.
- [ ] Client placing an order triggers atomic reservation and automatic shortfall detection.
- [ ] Dispatches debit finished goods through `inventoryService` and update line items.
- [ ] Client portal and internal sales UI render smoothly and pass all integration tests.
