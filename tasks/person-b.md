# Task Assignment: Person B

**Branch:** `feat/person-b`  
**Domain Focus:** Downstream Order Lifecycle & Quality Assurance (Sales Orders, Production Orders, Quality Control, Dispatches)

---

## Why This Split?
Person B owns the order lifecycle from customer intake to factory delivery:
1. **Core Manufacturing Workflow:** An order progresses linearly through stages: `pending` -> `yarn_check` -> `spinning` -> `weaving` -> `dyeing` -> `quality_check` -> `ready_to_ship` -> `dispatched`. Keeping this lifecycle under a single engineer prevents state desynchronization.
2. **Transactional Integrity:** Rolls are produced, inspected, and consolidated into Dispatches. This chain must maintain strict inventory and status consistency.
3. **Clean Contract Hand-off:** Relies on Person A's machine status check stub (`checkMachineAvailability`) and yarn reservation stub (`reserveYarnStock`) without needing Person A's raw queries.

---

## Owned Modules & Endpoints

### 1. Sales Orders (`/api/v1/sales-orders`)
File: `src/routes/salesOrders.ts`
- `GET /` — List sales orders with search query (`?q=`), buyer filter, and status filter.
- `GET /:id` — Detailed view with stepper stage progression (`pending` to `dispatched`).
- `POST /` — Create order (Role: `admin`, `manager`).
- `PATCH /:id/status` — Advance status enforcing forward-only transitions.

### 2. Production Orders (`/api/v1/production-orders`)
File: `src/routes/productionOrders.ts`
- `GET /` — List active production orders joined with machines and target progress.
- `GET /:id` — Single production order.
- `POST /` — Create production order, assigning a machine and linking to sales order.
- `PATCH /:id` — Update output metres or status (`in_progress`, `paused`, `completed`).

### 3. Fabric Rolls & QC (`/api/v1/fabric-rolls`)
File: `src/routes/fabricRolls.ts`
- `GET /` — Roll traceability listing with QC filter (`passed`, `rework`, `rejected`, `pending`).
- `GET /pending` — Rolls awaiting QC inspection.
- `GET /stats` — Total rolls, total metres, pass rate, rejection rate.
- `GET /:id` — Single roll profile.
- `POST /` — Log a freshly produced fabric roll.
- `PATCH /:id/qc` — Submit QC decision (`passed`, `rework`, `rejected`) with defects and inspector name.

### 4. Dispatches (`/api/v1/dispatches`)
File: `src/routes/dispatches.ts`
- `GET /` — List dispatch history.
- `GET /:id` — Single dispatch details with associated fabric rolls.
- `POST /` — Create dispatch: link passed fabric rolls, set total metres, and mark sales order as `dispatched`.
- `PATCH /:id/status` — Update dispatch state (`prepared`, `loaded`, `delivered`).

---

## Business Logic & Transactions
1. **Enforce Forward-Only Order Status Transitions:**
   `pending -> yarn_check -> spinning -> weaving -> dyeing -> quality_check -> ready_to_ship -> dispatched`
   Block backward status transitions.
2. **Fabric Roll QC Decision Guard:**
   `PATCH /fabric-rolls/:id/qc` must only execute `WHERE qc_result = 'pending'` to prevent duplicate submissions.
   Increment `qcDecisionsTotal` counter with label `result: passed|rework|rejected`.
3. **Dispatch Creation Transaction:**
   When `POST /dispatches` is called:
   - Validate sales order is `ready_to_ship`.
   - Resolve passed rolls for the order and verify total metres.
   - Insert row into `dispatches` and junction rows into `dispatch_rolls`.
   - Update `sales_orders.status = 'dispatched'`.
   - Must execute in a single Postgres transaction.
   - Increment `ordersDispatchedTotal` counter.

---

## Stubs to Implement / Replace
In `src/services/stubs.ts`:
- Replace `recordFabricRollProduced`: Insert into `fabric_rolls`, update `sales_orders.completed_metres`.
- Consume `checkMachineAvailability` to ensure machines are ready before assigning orders.
- Consume `reserveYarnStock` when advancing orders through `yarn_check`.

---

## Seed Data Requirements
Seed from `docs/frontend.md` and mock definitions:
- 8 Sales Orders: `ORD-1025` to `ORD-1045`.
- 8 Production Orders matching active sales orders.
- 10 Fabric Rolls: `FR-5501` to `FR-5510`.
- 2 Dispatches: `DSP-301` (delivered), `DSP-302` (prepared).

---

## Observability & Metrics
- Prometheus Counter: `orders_created_total`.
- Prometheus Counter: `orders_dispatched_total`.
- Prometheus Counter: `fabric_rolls_qc_decision_total{result}`.

---

## k6 Load Testing Scenario
File: `k6/scenarios/person_b_order_lifecycle.js`
- 20 VUs simulating sales managers, QC inspectors, and dispatch controllers:
  - 40% `GET /sales-orders` & `GET /fabric-rolls/pending`
  - 30% `PATCH /fabric-rolls/:id/qc`
  - 20% `POST /sales-orders`
  - 10% `POST /dispatches`
- Thresholds: p95 < 250ms for reads, p95 < 600ms for transactional dispatches, error rate < 1%.

---

## Done Checklist
- [x] Implement `sales-orders` routes and lifecycle validations.
- [x] Implement `production-orders` endpoints.
- [x] Implement `fabric-rolls` inspection and QC decision logic with concurrency guard.
- [x] Implement `dispatches` creation transaction with roll junction.
- [x] Replace `recordFabricRollProduced` stub with real DB operations.
- [x] Seed sales orders, production orders, fabric rolls, and dispatches.
- [x] Instrument counters for orders created, dispatched, and QC decisions.
- [x] Verify test suite and k6 scenario run clean.
