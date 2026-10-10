# Task Assignment: Person A

**Branch:** `feat/person-a`  
**Domain Focus:** Upstream Supply & Plant Infrastructure (Yarn Management, Suppliers, Machine Fleet, Shop Floor Operations)

---

## Why This Split?
Person A owns raw materials and machine infrastructure:
1. **Upstream Independence:** Yarn inventory and machine statuses do not rely on sales order creation to function. Receipts replenish physical stock, and machines report running status, shifts, and operators independently.
2. **Minimal Blocking:** Person A can implement, test, and seed their entire domain without waiting for order lifecycle or QC states from Person B.
3. **Clean Boundaries:** Handoffs to Person B happen at well-defined interfaces (machine availability checks and yarn stock reservations).

---

## Owned Modules & Endpoints

### 1. Machines & Shop Floor (`/api/v1/machines`)
File: `src/routes/machines.ts`
- `GET /` — List all machines with latest status log, operator, shift, progress, and today's output metres.
- `GET /:id` — Detailed machine profile with historical output logs.
- `POST /` — Register a new machine (Role: `admin`, `manager`).
- `PATCH /:id/status` — Record real-time machine status, operator, shift, progress (Role: `admin`, `manager`, `operator`).
- `GET /:id/output-log` — Output history by date range.
- `POST /:id/output` — Log metres produced for today.

### 2. Yarn Inventory & Receipts (`/api/v1/yarn`)
File: `src/routes/yarn.ts`
- `GET /stock` — List all yarn stock with calculated low-stock alerts.
- `GET /stock/alerts` — Critical and warning low-stock items linked with supplier contact info.
- `PATCH /stock/:id` — Adjust yarn bin location, quantity, or reorder level (Role: `admin`, `manager`).
- `GET /receipts` — Historical yarn delivery records.
- `POST /receipts` — Record a new yarn delivery with transaction updating stock (Role: `admin`, `manager`, `operator`).

### 3. Suppliers (`/api/v1/suppliers`)
File: `src/routes/suppliers.ts`
- `GET /` — List yarn suppliers.
- `POST /` — Add supplier (Role: `admin`, `manager`).

---

## Business Logic & Transactions
1. **Yarn Receipt Transaction:**
   When `POST /yarn/receipts` executes:
   - Insert row into `yarn_receipts`.
   - Update `yarn_stock.quantity_kg = quantity_kg + receipt_kg`, updating `last_updated = now()`.
   - Must run in a single Postgres transaction (`db.transaction`).
2. **Machine Status History:**
   When machine status updates via `PATCH /machines/:id/status`:
   - Append to `machine_status_log`. The latest entry dictates current machine status.
   - If machine goes to `breakdown` or `maintenance`, disassociate or flag active run.
3. **Machine Daily Output Aggregation:**
   - Ensure `machine_output_log` upserts for current date.
   - Keep `productionOutputMetresToday` Prometheus gauge up-to-date.

---

## Stubs to Implement / Replace
In `src/services/stubs.ts`:
- Replace `checkMachineAvailability`: Query `machineStatusLog` to return whether a machine is available for scheduling.
- Replace `notifyLowStock`: Trigger gauge updates when yarn falls below reorder levels.
- Provide real implementation for `reserveYarnStock` once Person B requests material consumption.

---

## Seed Data Requirements
Seed from `docs/frontend.md` and mock definitions:
- 9 Machines: `SP-01` to `SP-03`, `WV-01` to `WV-03`, `DY-01` to `DY-03`.
- 8 Yarn Stock items: `YS-001` to `YS-008`.
- 5 Yarn Receipts: `YR-2026-084` to `YR-2026-088`.
- 4 Suppliers with telephone numbers.

---

## Observability & Metrics
- Prometheus Gauge: `yarn_stock_low_count` (update on stock modifications).
- Prometheus Gauge: `production_output_metres_today` (sum from output logs).

---

## k6 Load Testing Scenario
File: `k6/scenarios/person_a_shopfloor.js`
- 20 VUs simulating concurrent operator status logs and dashboard reads:
  - 50% `GET /machines` & `GET /yarn/stock`
  - 30% `PATCH /machines/:id/status`
  - 20% `POST /yarn/receipts`
- Thresholds: p95 < 200ms for reads, p95 < 500ms for status writes, error rate < 1%.

---

## Done Checklist
- [ ] Implement `machines` routes and DB service.
- [ ] Implement `yarn` stock and receipt transaction.
- [ ] Implement `suppliers` routes.
- [ ] Replace `checkMachineAvailability` stub with real query.
- [ ] Seed machines, yarn stock, and suppliers accurately.
- [ ] Instrument gauges for machine output and low yarn stock.
- [ ] Verify test suite and k6 scenario run clean.
