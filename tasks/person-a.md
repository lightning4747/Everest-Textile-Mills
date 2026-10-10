# Task Assignment: Person A (Inventory Core)

**Branch:** `feat/person-a-inventory-core`  
**Domain Focus:** Dual-Layer Inventory Architecture, Ledger Immutability, Material Balances, Centralized Inventory Service, Production & QC Movements, Inventory Reconciliation.

---

## 1. Scope & Ownership

Each table, module, and page has exactly one owner. Person A owns:

- **Owned Database Tables:**
  - `inventory_balances` (Material snapshot: on-hand, reserved, location, check constraints)
  - `inventory_movements` (Immutable append-only event ledger)
  - `yarn_stock` (Warehouse bin metadata, location, reorder thresholds)
  - `fabric_rolls` (Roll physical inventory & QC state progression)
- **Owned Backend Modules:**
  - `backend/src/services/inventoryService.ts` (Sole engine permitted to execute material balance and ledger writes)
  - `backend/src/routes/inventory.ts` (`/api/v1/inventory/balances`, `/api/v1/inventory/movements`, `/api/v1/inventory/reconciliation`, `/api/v1/inventory/adjust`)
  - `backend/src/routes/fabricRolls.ts` (Refactored to route roll production and QC decisions through `inventoryService`)
- **Owned Frontend Pages:**
  - `/yarn/stock` (`RawMaterialStock.tsx` — connected to real-time `inventory_balances`)
  - `/quality/checks`, `/quality/rolls`, `/quality/pending` (`FabricRolls.tsx`, `PendingInspection.tsx`, `QualityChecks.tsx` — zero rework traces)
  - `/inventory/ledger` (New Audit Ledger & Reconciliation Dashboard)
- **Owned Tests & Scenarios:**
  - `backend/src/__tests__/inventory_concurrency.test.ts` (10 parallel reservations against limited balance)
  - `backend/src/__tests__/inventory_idempotency.test.ts` (Network retry deduplication via unique constraints)
  - `backend/src/__tests__/inventory_reconciliation.test.ts` (4 mathematical cross-checks: zero drift)
  - `backend/src/__tests__/k6/k6_rolls.js` (High-frequency roll logging load test)
- **Owned Prometheus Metrics:**
  - `inventory_movements_total{state, direction, reason}`
  - `inventory_reconciliation_drift_count`
  - `inventory_lock_wait_seconds`

---

## 2. Technical Standards & Invariants

1. **Dual-Layer Invariant:** No route or controller may update `yarn_stock` or `inventory_balances` directly. All writes must invoke `inventoryService`.
2. **PostgreSQL Trigger Immutability:** `inventory_movements` must have a database trigger rejecting all `UPDATE` and `DELETE` queries.
3. **Deterministic Row Locking:** When locking multiple balance rows, sort queries alphabetically by `(item_id, state)` before `SELECT ... FOR UPDATE` to mathematically prevent deadlocks.
4. **Pre-Insert Existence Pattern:** Execute `INSERT INTO inventory_balances ... ON CONFLICT DO NOTHING` before acquiring a row lock.
5. **Zero Rework:** QC outcomes must strictly be `passed` (diverts to `finished_goods`) or `rejected` (diverts to `scrap_fabric`).

---

## 3. Ordered Implementation Steps

### Step 1: Phase 0 Schema & Contract Contribution
1. Collaborate on Phase 0 PR: define `inventory_balances`, `inventory_movements`, and enums in `schema.ts`.
2. Implement PostgreSQL trigger `trg_no_update_delete_inventory_movements` in the migration script.
3. Define `IInventoryService` stub interface in `backend/src/types/contract.ts`.

### Step 2: Build Centralized `inventoryService.ts`
Implement atomic transaction methods in `backend/src/services/inventoryService.ts`:
- `recordReceipt(tx, params)`: Credits `raw_yarn` physical balance; logs movement (`reason: 'receipt'`).
- `reserveYarnForOrder(tx, params)`: Acquires deterministic row lock on yarn bin; increments `reserved_quantity`; logs movement (`reason: 'reservation'`); returns shortfall if unreserved balance is insufficient.
- `consumeYarnToWip(tx, params)`: Atomically debits `raw_yarn` and credits `wip`; logs dual movements (`reason: 'consumption'`).
- `produceRoll(tx, params)`: Debits `wip` and credits `fabric_pending_qc`; inserts `fabric_rolls`.
- `recordQcVerdict(tx, params)`: Debits `fabric_pending_qc`; credits `finished_goods` (if `passed`) or `scrap_fabric` (if `rejected`).
- `dispatchRolls(tx, params)`: Debits `finished_goods` for selected passed rolls; records dispatch movement.
- `reconcileInventory(tx)`: Executes 4 integrity cross-checks and calculates variance.

### Step 3: Implement Inventory Routes & Endpoints
1. Create `backend/src/routes/inventory.ts`:
   - `GET /api/v1/inventory/balances` (filters: `state`, `item_type`).
   - `GET /api/v1/inventory/movements` (paginated, filters: `item_id`, `state`, `reason`).
   - `GET /api/v1/inventory/reconciliation` (runs verification suite).
   - `POST /api/v1/inventory/adjust` (restricted to `admin`, logs audited compensating movement).
2. Mount in `backend/src/index.ts` under `/api/v1/inventory`.

### Step 4: Refactor Fabric Rolls & QC Route
1. In `backend/src/routes/fabricRolls.ts`, eliminate direct DB mutations:
   - Route `POST /api/v1/fabric-rolls` through `inventoryService.produceRoll`.
   - Route `PATCH /api/v1/fabric-rolls/:id/qc` through `inventoryService.recordQcVerdict`.
2. Enforce strict binary QC outcomes (`passed` or `rejected`). Verify all `'rework'` traces are completely absent.

### Step 5: Frontend Updates
1. **Raw Material Stock (`/yarn/stock`):** Wire to `GET /api/v1/inventory/balances?state=raw_yarn`. Display on-hand, reserved, and available quantities.
2. **Quality Control Views (`/quality/*`):** Ensure `FabricRolls.tsx` and `PendingInspection.tsx` only present binary pass/reject actions with updated status badges.
3. **Audit Ledger View (`/inventory/ledger`):** Build a new UI component displaying the immutable movement ledger with live reconciliation health status.

### Step 6: Testing & Load Verification
1. Run concurrency suite `inventory_concurrency.test.ts`.
2. Run idempotency suite `inventory_idempotency.test.ts`.
3. Run reconciliation check: confirm drift is 0 across all 4 checks.
4. Execute k6 benchmark `k6_rolls.js`: verify p95 latency < 45ms.

---

## 4. Done Checklist

- [ ] `inventory_balances` has database check constraints (`quantity >= 0`, `quantity >= reserved_quantity`).
- [ ] `inventory_movements` database trigger blocks all updates and deletes.
- [ ] No application code updates stock balances outside of `inventoryService.ts`.
- [ ] Row locks are acquired in strict alphabetical order of `(item_id, state)`.
- [ ] QC workflow supports only `passed` and `rejected`; no reference to `rework` exists anywhere.
- [ ] Reconciliation endpoint cross-checks balances vs. ledger sum and rolls with 0 drift.
- [ ] Concurrency and idempotency integration tests pass in CI.
- [ ] Frontend pages (`/yarn/stock`, `/quality/*`, `/inventory/ledger`) render correctly without console warnings.
