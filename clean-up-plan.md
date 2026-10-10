# Verification & Code Clean-Up Plan

## 1. Verification of Reported Issues Against Codebase

Each reported anomaly and logical inconsistency was verified by directly inspecting the source code:

| Issue | Reported Anomaly | Code Verification Result | Verified Location | Root Cause in Code |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | "Completed Metres" & Order Progress Disconnect | **CONFIRMED** | `backend/src/routes/fabricRolls.ts:280-303`<br/>`backend/src/services/stubs.ts:164-210` | `POST /fabric-rolls` inserts a roll and returns 201 immediately without incrementing `sales_orders.completedMetres`. Meanwhile, `recordFabricRollProduced` in `stubs.ts` has the logic to increment `completedMetres` upon roll logging, but is completely unused. `completedMetres` is currently only updated in `PATCH /fabric-rolls/:id/qc` when `qc_result === 'passed'`. |
| **1.2** | "Ghost" Yarn Stock (Materials Never Deplete) | **CONFIRMED** | `backend/src/routes/salesOrders.ts:263-270`<br/>`backend/src/services/stubs.ts:29-37` | In `salesOrders.ts`, advancing an order calls `reserveYarnStock({ orderId, quantityKg })` without passing `yarnStockId` because `sales_orders` only stores `fabricType`. `stubs.ts` immediately falls back to `if (!input.yarnStockId) return { success: true, ... }` without querying or deducting from `yarn_stock`. Furthermore, the response is never checked. |
| **1.3** | 1-to-1 Production Order Lock vs Multi-Stage Flow | **CONFIRMED** | `backend/src/routes/productionOrders.ts:206-215`<br/>`backend/src/db/schema.ts:138` | `productionOrders.ts` explicitly rejects new production orders if `existingPo` exists. Additionally, the PostgreSQL schema has `unique('production_orders_sales_order_id_unique')` on `sales_order_id`, physically blocking subsequent stage assignments (e.g. spinning -> weaving -> dyeing). |
| **1.4** | Machine Breakdown Leaves Orders in Limbo | **CONFIRMED** | `backend/src/routes/machines.ts:236-246` | When setting machine status to `breakdown` or `maintenance`, `machines.ts` sets `machineStatusLog.currentOrderId = null`, but leaves `sales_orders.machineId` pointing to the broken machine and does not pause/update active production orders. |
| **1.5** | Double-Dispatching Risk on Auto-Select | **CONFIRMED** | `backend/src/routes/dispatches.ts:224-234` | In `POST /dispatches`, when `rollIds` is omitted, the query selects `WHERE order_id = ? AND qc_result = 'passed'` without checking `notInArray(fabricRolls.id, db.select({ id: dispatchRolls.rollId }).from(dispatchRolls))`. |
| **1.6** | Dashboard "Time Travel" Fallback | **CONFIRMED** | `backend/src/routes/dashboard.ts:86-101`<br/>`backend/src/routes/reports.ts:204-217` | If `outputToday === 0`, both routes run a fallback query finding the latest historical date with output and report that as today's output. |

---

## 2. Fallow Static Analysis & Dead Code Findings

Running `npx fallow dead-code` across the codebase revealed the following unused artifacts:

1. **Unused Files**:
   - `frontend/src/data/mockData.ts` (100% dead code; frontend pages fetch directly from API; DB seed used a copy).
   - `k6/scenarios/person_a_shopfloor.js` (unused exports).
   - `k6/scenarios/person_b_order_lifecycle.js` (unused exports).
2. **Unused Functions & Exports in Backend**:
   - `backend/src/services/stubs.ts`: `recordFabricRollProduced`, `notifyLowStock`.
   - `backend/src/metrics.ts`: Unused metric constants (`dbQueryDuration`).
   - `backend/src/lib/response.ts`: `fail`.
   - `backend/src/middleware/validate.ts`: `paginationSchema`.
   - `backend/src/routes/salesOrders.ts`: `ORDER_STAGES`.
3. **Complexity & Hotspots**:
   - `backend/src/services/stubs.ts`: Splits domain logic across stubs and route files, leading to duplicated and bypassed business logic.

---

## 3. Systematic Clean-Up & Resolution Plan

### Phase 1: Database Schema & Migration Adjustment
- **Remove Unique Constraint on `production_orders.sales_order_id`**:
  - In `backend/src/db/schema.ts`, drop `.unique()` on `productionOrders.salesOrderId`.
  - Execute PostgreSQL migration: `ALTER TABLE production_orders DROP CONSTRAINT IF EXISTS production_orders_sales_order_id_unique;`
  - Allows an order to have multiple production orders sequentially (Spinning -> Weaving -> Dyeing).

### Phase 2: Backend Logic Corrections
1. **Decouple Produced vs. Passed Metres (`fabricRolls.ts`)**:
   - When `POST /fabric-rolls` is called, update the order's `completedMetres` with the newly produced meters (reflecting floor production).
   - If total produced reaches `quantityMetres`, transition order to `quality_check` stage if it is still in production stages (`spinning`, `weaving`, `dyeing`).
   - In `PATCH /fabric-rolls/:id/qc`, track passed meters and advance to `ready_to_ship` when passed rolls meet the target.
2. **Dynamic Yarn Deduction (`salesOrders.ts` & `yarn.ts`)**:
   - Remove no-op `reserveYarnStock` stub fallback.
   - Match `salesOrders.fabricType` to `yarnStock.type` (e.g. `Cotton -> Cotton`).
   - Query available `quantity_kg` in `yarn_stock`. If `available < requiredKg`, reject with HTTP 400: `"Cannot advance order: [X] kg of [Type] required, but only [Y] kg available in stock"`.
   - If sufficient, deduct `quantity_kg` from `yarn_stock` atomically and update `last_updated`.
3. **Allow Multi-Stage Production Orders (`productionOrders.ts`)**:
   - Remove the blocker: `if (existingPo) badRequest(...)`.
   - Allow new production order creation for an order on a different machine or stage.
4. **Re-route on Machine Breakdown (`machines.ts`)**:
   - When patching a machine to `breakdown` or `maintenance`:
     - Disassociate machine in `machineStatusLog`.
     - Clear `sales_orders.machineId = null` for the currently running order.
     - Update active `production_orders` on that machine to `paused` or `queued`.
5. **Exclude Dispatched Rolls (`dispatches.ts`)**:
   - In `POST /dispatches`, when auto-selecting rolls, add:
     `notInArray(fabricRolls.id, db.select({ id: dispatchRolls.rollId }).from(dispatchRolls))`
   - For explicitly passed `rollIds`, verify none are already in `dispatch_rolls`.
6. **Eliminate Time-Travel Fallbacks (`dashboard.ts`, `reports.ts`)**:
   - Remove the fallback query that substitutes previous days' output for today.
   - Return actual `outputToday = 0` when no output has been logged today.
7. **Consolidate and Clean Up Stubs (`stubs.ts`)**:
   - Eliminate dead stub functions (`recordFabricRollProduced`, `notifyLowStock`).
   - Keep only active Prometheus metric updater helpers or migrate them directly to `metrics.ts`.

### Phase 3: Dead Code Removal & Code Quality
- Remove `frontend/src/data/mockData.ts` to eliminate dead code identified by `fallow`.
- Remove dead exports in `backend/src/lib/response.ts` (`fail`) and `backend/src/middleware/validate.ts` (`paginationSchema`).

### Phase 4: Verification
- Run `bun test` on backend test suites.
- Run `npx -y fallow dead-code` to confirm dead code resolution.
- Test endpoint workflows (Yarn -> Production Order -> Fabric Roll -> QC -> Dispatch).
