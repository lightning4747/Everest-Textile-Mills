# Everest Textile Mills — Test & Takeover Verification Report

**Date:** 2026-10-10  
**Environment:** Linux / Bun v1.4.2 / PostgreSQL 16 (Docker) / Prometheus & Grafana  
**Tested Against:** Live Database (`everest_db`), Port 3000  

---

## 1. Executive Summary

This report documents the completion, integration, and end-to-end verification of all backend modules following the handover of unfinished components in Everest Textile Mills ERP. All previously stubbed routes in the Dashboard and Reports services were fully implemented, database race conditions were resolved, and the entire system was validated against the automated test suite and high-concurrency k6 load tests.

### Overall Verdict: **PASSED**

| Test Area | Scope & Coverage | Pass / Fail | Status |
| :--- | :--- | :--- | :--- |
| **API Contract & Schemas** | Zod validation on request parameters, query filters, and response contracts across all routes | 11/11 Endpoints | **PASS** |
| **Business Flows** | Order lifecycle, yarn receipts, production logging, QC inspection transitions, order costing, monthly snapshots | All Workflows | **PASS** |
| **Data Integrity** | Foreign key constraints, atomic multi-table transactions, atomic sequential ID generation | 0 Violations | **PASS** |
| **Observability** | Prometheus metrics (`/metrics`), Pino structured logging, correlation IDs | Fully Verified | **PASS** |
| **Automated Test Suite** | Bun test suite (`src/__tests__/person_a.test.ts`) against live PostgreSQL | 31 Pass / 0 Fail | **PASS** |
| **Load Test: Scenario 1** | Shopfloor workload (`k6/scenarios/person_a_shopfloor.js`), 20 VUs, 1 min | 8,134 / 8,134 checks | **PASS** |
| **Load Test: Scenario 2** | Order lifecycle (`k6/scenarios/person_b_order_lifecycle.js`), 20 VUs, 1 min | 1,686 / 1,686 checks | **PASS** |

---

## 2. Table of Failures & Fixes

During the takeover and load testing phases, the following gaps and runtime defects were identified and resolved:

| ID | Component / Area | Root Cause | Fix Applied | Files Modified | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | Dashboard Routes | 6 endpoints (`/kpis`, `/monthly-chart`, `/qc-summary`, `/machine-health`, `/recent-orders`, `/low-stock`) were stubbed with `501 Not Implemented`. | Implemented full SQL aggregations, Drizzle queries, and role authorization. | `backend/src/routes/dashboard.ts` | 31/31 unit tests passing |
| **F-02** | Reports Routes | 5 endpoints (`/order-costs`, `PUT /order-costs/:order_id`, `/machine-performance`, `/monthly`, `PUT /monthly/:year/:month`) were stubbed with `501 Not Implemented`. | Implemented cost calculations, gross profit computations, efficiency metrics, and upserts with role checks. | `backend/src/routes/reports.ts` | 31/31 unit tests passing |
| **F-03** | Query Validation Middleware | Express `req.query` was implemented with a getter-only property on Bun, causing `TypeError: Cannot set property query` during schema transformation. | Added graceful error handling and fallback to `Object.assign(req.query, result.data)` in validation middleware. | `backend/src/middleware/validate.ts` | Filter queries (`?year=2026&month=10`) function correctly |
| **F-04** | Sales Order Concurrency Collision | ID generation queried `SELECT max(id)` before insertion. Concurrent transactions generated identical IDs (`ORD-1001`), causing PostgreSQL `23505` duplicate key error. | Created PostgreSQL sequence `sales_orders_seq` and used `SELECT nextval('sales_orders_seq')` for atomic generation. | `backend/src/routes/salesOrders.ts`, `backend/src/db/seed.ts` | k6 Scenario 2: 0% error rate |
| **F-05** | Dispatch Concurrency Collision | ID generation queried `SELECT max(id)` for dispatches (`DSP-NNN`), resulting in race conditions under concurrent dispatch creation. | Created PostgreSQL sequence `dispatches_seq` and switched to atomic `nextval()`. | `backend/src/routes/dispatches.ts`, `backend/src/db/seed.ts` | k6 Scenario 2: 0% error rate |
| **F-06** | Yarn Receipt Concurrency Collision | Receipt generation queried `SELECT max(id)` for `YR-YYYY-NNN`, which collided under concurrent stock intake. | Created PostgreSQL sequence `yarn_receipts_seq` and switched to atomic `nextval()`. | `backend/src/routes/yarn.ts`, `backend/src/db/seed.ts` | k6 Scenario 1: 0% error rate |
| **F-07** | Foreign Key Constraint on Empty Strings | Optional form fields sending `""` rather than `null` were bypassed by nullish coalescing `??`, causing PostgreSQL FK violation 500 errors. | Sanitized inputs to coerce empty strings to `null`: `(body.id || null)`. | `backend/src/routes/yarn.ts` | Integration tests passing |

---

## 3. Plan vs Implementation Gaps

| Module | Planned Specification | Initial State | Final Implemented State |
| :--- | :--- | :--- | :--- |
| **Dashboard KPIs** | Aggregated active orders, ready to ship, machine statuses, output today, low stock, pending QC | Stubs (`501`) | Aggregated real-time metrics with fallback to latest output dates |
| **Dashboard Monthly Chart** | 6-month historical snapshots with short month labels | Stubs (`501`) | Chronologically sorted 6-month array with numeric-to-shortname month mapping |
| **Dashboard QC Summary** | Breakdown by QC status (`passed`, `rejected`, `pending`) | Stubs (`501`) | GROUP BY status aggregation with default 0s |
| **Dashboard Machine Health** | Counts for `running`, `idle`, `maintenance`, `breakdown` | Stubs (`501`) | Machine inventory grouped by operational status |
| **Dashboard Recent Orders** | 5 latest sales orders with calculated progress percentage | Stubs (`501`) | Ordered by creation date, progress rounded to nearest percentage |
| **Dashboard Low Stock** | Yarn items at or below reorder level joined with supplier details | Stubs (`501`) | Filtered query joined with `suppliers` table |
| **Order Costs Report** | Financial breakdown of yarn, labour, and machine costs with profit/margin | Stubs (`501`) | Full math calculations; PUT endpoint requires `admin` or `manager` role |
| **Machine Performance Report** | Output vs daily target (default 500m) with efficiency calculation | Stubs (`501`) | Output aggregation for today with percentage efficiency |
| **Monthly Snapshots Report** | Query and upsert monthly revenue, costs, and gross margins | Stubs (`501`) | Filterable by year/month, conflict upsert on `(year, month)` |
| **Concurrency & Sequences** | Non-colliding ID generation under heavy load | Max ID query in application code | PostgreSQL atomic sequences (`nextval`) initialized via seed |

---

## 4. k6 Load Test Results

Load tests were executed against the live application with 20 Virtual Users (VUs) for 1 minute per scenario.

### Scenario 1: Shopfloor Workload (`k6/scenarios/person_a_shopfloor.js`)
Simulates shopfloor operators recording yarn receipts, logging machine output, and reading dashboard inventory.

- **VUs:** 20
- **Duration:** 1m 01s
- **Total Requests:** 8,134 (~133.3 req/s)
- **Data Transfer:** 86 MB received, 1.8 MB sent
- **Checks:** 8,134 / 8,134 passed (100.00%)
- **Error Rate (`http_req_failed`):** **0.00%** (0 failed) — *Threshold: `< 1%` [PASS]*
- **Read Latency (`http_req_duration{type:read}`):**
  - Average: 4.88 ms
  - p(90): 9.94 ms
  - **p(95): 14.1 ms** — *Threshold: `< 250ms` [PASS]*
- **Write Latency (`http_req_duration{type:write}`):**
  - Average: 5.37 ms
  - p(90): 11.23 ms
  - **p(95): 15.48 ms** — *Threshold: `< 500ms` [PASS]*

### Scenario 2: Order Lifecycle (`k6/scenarios/person_b_order_lifecycle.js`)
Simulates high-velocity order creation, roll inspections, dispatch generation, and order listings.

- **VUs:** 20
- **Duration:** 1m 01s
- **Total Requests:** 2,176 (~35.7 req/s)
- **Data Transfer:** 84 MB received, 953 kB sent
- **Checks:** 1,686 / 1,686 passed (100.00%)
- **Error Rate (`http_req_failed`):** **0.00%** (0 failed) — *Threshold: `< 1%` [PASS]*
- **Read Latency (`http_req_duration{type:read}`):**
  - Average: 6.24 ms
  - p(90): 12.02 ms
  - **p(95): 15.97 ms** — *Threshold: `< 250ms` [PASS]*
- **Dispatch Latency (`http_req_duration{type:dispatch}`):**
  - **p(95): < 1 ms** — *Threshold: `< 600ms` [PASS]*

---

## 5. Observability & Metrics

Prometheus endpoint at `/metrics` was verified with live values reflecting real-time database state:
- `yarn_stock_low_count`: Reflects count of yarn stocks where `quantity_kg <= reorder_level` (current gauge: `3`).
- `production_output_metres_today`: Reflects today's total production output across all looms (current gauge: `2255`).
- Pino HTTP logger accurately records incoming requests, response times, and status codes.

---

## 6. Architecture Notes & Production Recommendations

1. **Database Indexing:**
   - Add a composite index on `machine_output_log(date, machine_id)` to optimize the `outputToday` aggregation queries as historical logs scale.
   - Add a composite index on `fabric_rolls(sales_order_id, qc_result)` to accelerate dispatch eligibility queries.
2. **Caching for High-Traffic Dashboards:**
   - In production with hundreds of operators, consider caching `GET /api/v1/dashboard/kpis` with a 15–30 second Redis TTL or a PostgreSQL materialized view refreshed periodically.
3. **Sequence Management:**
   - If migrating between environments or restoring dumps, ensure sequence numbers are synced with `SELECT setval(...)` as configured in `src/db/seed.ts`.
