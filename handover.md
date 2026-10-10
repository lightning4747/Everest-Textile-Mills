# Engineering Handover: Everest Textile Mills Backend

**Date:** October 10, 2026  
**Repository Branch:** `main` (Clean working tree, ready for next stage)  
**Target Environment:** Bun 1.4+, Node/Alpine container compatible, PostgreSQL 16, Prometheus, Grafana, k6  

---

## 1. Executive Summary & Context

This repository hosts the backend ERP system for **Everest Textile Mills**, managing yarn inventory, shop floor machinery, production orders, fabric roll quality control (QC), dispatches, and executive reporting.

The codebase represents a merge of two functional domains:
- **Upstream Domain (Plant & Raw Materials):** Machines, Yarn Stock & Receipts, Suppliers.
- **Downstream Domain (Order Lifecycle & Quality):** Sales Orders, Production Orders, Fabric Rolls & QC, Dispatches.

### Crucial Note for the Incoming Agent
**Person A did not fully complete their assigned tasks prior to merge.**  
While Person A's foundational routes (`machines.ts`, `yarn.ts`, `suppliers.ts`) and database tables were merged in, **Person A left the following critical modules as stubs returning `{ _stub: true }`**:
1. `src/routes/dashboard.ts` (6 endpoints: `/kpis`, `/monthly-chart`, `/qc-summary`, `/machine-health`, `/recent-orders`, `/low-stock`).
2. `src/routes/reports.ts` (5 endpoints: `/order-costs`, `PUT /order-costs/:order_id`, `/machine-performance`, `/monthly`, `PUT /monthly/:year/:month`).

**Your primary responsibility is to:**
1. Implement the remaining endpoints in `src/routes/dashboard.ts` and `src/routes/reports.ts`.
2. Ensure all cross-module handoffs and Prometheus metrics are live and accurate.
3. Write/complete end-to-end integration tests using `bun test` against the live PostgreSQL database.
4. Execute the k6 load testing scenarios.
5. Compile and generate the final `test-report.md`.

---

## 2. System Architecture & Running Services

### Infrastructure Stack
- **Runtime:** Bun 1.4.2 / TypeScript
- **Framework:** Express 4.x with Helmet, CORS, Morgan / Pino logging
- **Database & ORM:** PostgreSQL 16 with Drizzle ORM (`drizzle-orm/node-postgres`, `pg`)
- **Validation:** Zod schemas
- **Observability:** `prom-client` exporting metrics on `/metrics`, Prometheus v2.51.0, Grafana 10.4.0
- **Load Testing:** k6 scenarios in `k6/scenarios/`

### Running Containers (docker-compose)
The following containers are running and healthy via `docker compose up -d`:
| Container Name | Service | Ports / Address | Notes |
|---|---|---|---|
| `everest_db` | PostgreSQL 16 | `5432:5432` | DB: `everest_erp`, User: `erp_user`, Pass: `secret` |
| `everest_prometheus` | Prometheus | `9090:9090` | Scrapes `http://backend:3000/metrics` or `host.docker.internal:3000` |
| `everest_grafana` | Grafana | `3001:3000` | Provisioned dashboards in `grafana/` |

### Environment Configuration
The backend uses `backend/.env`:
```env
PORT=3000
DATABASE_URL=postgres://erp_user:secret@localhost:5432/everest_erp
JWT_SECRET=super-secret-textile-erp-key-2026-production
NODE_ENV=development
```

---

## 3. Status of Implemented Modules

### 3.1 Completed Modules
| Module | File | Endpoints / Capabilities | Status |
|---|---|---|---|
| **Auth** | `src/routes/auth.ts` | `POST /login`, `GET /me`, JWT signing, RBAC (`admin`, `manager`, `operator`, `qc_inspector`, `viewer`) | Complete |
| **Sales Orders** | `src/routes/salesOrders.ts` | `GET /` (with `?q=`, `?buyer=`, `?status=`), `GET /:id`, `POST /`, `PATCH /:id/status` (enforcing forward-only stage stepper: `pending -> yarn_check -> spinning -> weaving -> dyeing -> quality_check -> ready_to_ship -> dispatched`) | Complete |
| **Production Orders** | `src/routes/productionOrders.ts` | `GET /`, `GET /:id`, `POST /` (links to sales order and machine), `PATCH /:id` | Complete |
| **Fabric Rolls** | `src/routes/fabricRolls.ts` | `GET /`, `GET /pending`, `GET /stats`, `GET /:id`, `POST /`, `PATCH /:id/qc` with atomic concurrency guard (`WHERE qc_result = 'pending'`), defect logging, and completed metres update | Complete |
| **Dispatches** | `src/routes/dispatches.ts` | `GET /`, `GET /:id`, `POST /` (single PostgreSQL transaction verifying `ready_to_ship`, attaching rolls via `dispatch_rolls`, marking `dispatched`), `PATCH /:id/status` | Complete |
| **Machines** | `src/routes/machines.ts` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id/status`, `GET /:id/output-log`, `POST /:id/output` | Complete |
| **Yarn** | `src/routes/yarn.ts` | `GET /stock`, `GET /stock/alerts`, `PATCH /stock/:id`, `GET /receipts`, `POST /receipts` (transactional receipt creation updating stock) | Complete |
| **Suppliers** | `src/routes/suppliers.ts` | `GET /`, `POST /` | Complete |
| **Database Schema** | `src/db/schema.ts` | 14 tables, enums, relationships, all defined in Drizzle | Complete |
| **Database Seed** | `src/db/seed.ts` | Full seed data matching `docs/frontend.md` (8 sales orders, 9 machines, 8 yarn items, 10 fabric rolls, 2 dispatches, 5 order costs, 6 monthly snapshots, demo users) | Complete |
| **Cross-Module Stubs** | `src/services/stubs.ts` | `recordFabricRollProduced`, `reserveYarnStock`, `checkMachineAvailability`, `notifyLowStock`, gauge helpers | Complete |

---

## 4. Incomplete Tasks Left by Person A: Specifications & Implementation Guide

The incoming agent must implement the remaining endpoints in `src/routes/dashboard.ts` and `src/routes/reports.ts`. Below are the exact requirements, query logic, and response shapes derived from `docs/plan.md` and `docs/frontend.md`.

### 4.1 Module: `src/routes/dashboard.ts`

All endpoints require authentication (`router.use(authenticate)`). Accessible by all authenticated roles (`admin`, `manager`, `operator`, `qc_inspector`, `viewer`).

#### 1. `GET /api/v1/dashboard/kpis`
- **Purpose:** Consolidated KPI strip avoiding multiple round trips.
- **Query & Formulas:**
  - `activeOrders`: Count of `sales_orders` where `status != 'dispatched'`.
  - `readyToShip`: Count of `sales_orders` where `status = 'ready_to_ship'`.
  - `runningMachines`: Count of machines where latest status is `'running'`.
  - `idleMachines`: Count of machines where latest status is `'idle'`.
  - `downMachines`: Count of machines where latest status in `['breakdown', 'maintenance']`.
  - `totalMachines`: Total count of rows in `machines`.
  - `outputToday`: Sum of `metres` from `machine_output_log` where `date = CURRENT_DATE` (or fallback to latest day).
  - `lowStockCount`: Count of `yarn_stock` where `quantity_kg <= reorder_level`.
  - `pendingQC`: Count of `fabric_rolls` where `qc_result = 'pending'`.
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": {
      "activeOrders": 7,
      "readyToShip": 1,
      "runningMachines": 6,
      "totalMachines": 9,
      "idleMachines": 2,
      "downMachines": 1,
      "outputToday": 3120,
      "lowStockCount": 2,
      "pendingQC": 3
    }
  }
  ```

#### 2. `GET /api/v1/dashboard/monthly-chart`
- **Purpose:** 6-month financial and production trend for AreaChart.
- **Query:**
  - Query `monthly_snapshots` ordered by `year ASC, month ASC`, limit 6.
  - Convert month number (1-12) to month abbreviation (e.g. `5 -> 'May'`, `10 -> 'Oct'`).
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      { "month": "May", "revenue": 820000, "cost": 540000, "output": 18400, "wages": 385000 },
      { "month": "Jun", "revenue": 960000, "cost": 620000, "output": 21200, "wages": 385000 },
      ...
    ]
  }
  ```

#### 3. `GET /api/v1/dashboard/qc-summary`
- **Purpose:** QC counts by result.
- **Query:**
  - Query `fabric_rolls`, aggregate counts by `qc_result`:
    - `passed`: `COUNT(*) WHERE qc_result = 'passed'`
    - `rework`: `COUNT(*) WHERE qc_result = 'rework'`
    - `rejected`: `COUNT(*) WHERE qc_result = 'rejected'`
    - `pending`: `COUNT(*) WHERE qc_result = 'pending'`
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": {
      "passed": 5,
      "rework": 1,
      "rejected": 1,
      "pending": 3
    }
  }
  ```

#### 4. `GET /api/v1/dashboard/machine-health`
- **Purpose:** Machine counts by status.
- **Query:**
  - Resolve the latest status log per machine from `machine_status_log` (or machine state).
  - Count machines by status: `running`, `idle`, `maintenance`, `breakdown`.
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": {
      "running": 6,
      "idle": 2,
      "maintenance": 1,
      "breakdown": 0
    }
  }
  ```

#### 5. `GET /api/v1/dashboard/recent-orders`
- **Purpose:** First 5 sales orders for the live order pipeline table.
- **Query:**
  - Query `sales_orders` ordered by `created_at DESC` limit 5.
  - Include calculated field `progressPct`: `Math.round((completed_metres / target_metres) * 100)`.
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "ORD-1045",
        "buyer": "Raymond Ltd.",
        "fabric": "Cotton Twill 240 GSM",
        "colour": "Navy Blue",
        "targetMetres": 5000,
        "completedMetres": 0,
        "progressPct": 0,
        "status": "pending",
        "deliveryDate": "2026-10-28"
      }
    ]
  }
  ```

#### 6. `GET /api/v1/dashboard/low-stock`
- **Purpose:** Yarn stock items below reorder level.
- **Query:**
  - Query `yarn_stock` where `quantity_kg <= reorder_level`.
  - Join supplier name if available.
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "YS-003",
        "type": "Polyester 150D",
        "colour": "Optic White",
        "quantityKg": 180,
        "reorderLevel": 300,
        "bin": "B-03"
      }
    ]
  }
  ```

---

### 4.2 Module: `src/routes/reports.ts`

Requires authentication. Mutation endpoints (`PUT`) require `authorize('admin', 'manager')`.

#### 1. `GET /api/v1/reports/order-costs`
- **Params:** Optional query `?order_id=ORD-XXXX`.
- **Query & Formulas:**
  - Select from `order_costs`. If `order_id` provided, filter `WHERE order_id = ?`.
  - Calculate:
    - `totalCost = yarnCost + labourCost + machineCost`
    - `profit = revenue - totalCost`
    - `marginPct = revenue > 0 ? (profit / revenue) * 100 : 0`
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "orderId": "ORD-1025",
        "buyer": "Grasim Industries",
        "yarnCost": 62500,
        "labourCost": 18000,
        "machineCost": 12000,
        "totalCost": 92500,
        "revenue": 275000,
        "profit": 182500,
        "marginPct": 66.36
      }
    ]
  }
  ```

#### 2. `PUT /api/v1/reports/order-costs/:order_id`
- **Auth:** `authorize('admin', 'manager')`
- **Body:** `{ yarnCost: number, labourCost: number, machineCost: number, revenue: number, buyer?: string }`
- **Logic:**
  - Verify `sales_orders` with `:order_id` exists. If not, return 404.
  - Upsert into `order_costs` on conflict on `order_id`.
  - Return updated record with computed `totalCost`, `profit`, `marginPct`.

#### 3. `GET /api/v1/reports/machine-performance`
- **Query:**
  - List all machines with latest status, operator, today's output metres.
  - Target is 500 metres per machine (or `daily_target` from `machines`).
  - Calculate `efficiencyPct = Math.round((outputToday / target) * 100)`.
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "SP-01",
        "name": "Ring Frame 1",
        "type": "spinning",
        "status": "running",
        "currentOrder": "ORD-1025",
        "operator": "Ramesh Kumar",
        "outputToday": 420,
        "target": 500,
        "efficiencyPct": 84
      }
    ]
  }
  ```

#### 4. `GET /api/v1/reports/monthly`
- **Params:** Optional query `?year=2026&month=10`.
- **Query:**
  - Query `monthly_snapshots` ordered by `year DESC, month DESC`.
  - Include computed fields:
    - `grossProfit = revenue - cost`
    - `marginPct = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0`
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "...",
        "year": 2026,
        "month": 10,
        "revenue": 1240000,
        "cost": 750000,
        "outputMetres": 26800,
        "wages": 385000,
        "grossProfit": 490000,
        "marginPct": 39.52
      }
    ]
  }
  ```

#### 5. `PUT /api/v1/reports/monthly/:year/:month`
- **Auth:** `authorize('admin', 'manager')`
- **Body:** `{ revenue: number, cost: number, outputMetres: number, wages?: number }`
- **Logic:**
  - Upsert row into `monthly_snapshots` on conflict on `(year, month)`.
  - Return updated snapshot row.

---

## 5. End-to-End Testing & Verification Plan

Once the dashboard and reports endpoints are implemented, perform full end-to-end testing as outlined below.

### 5.1 Test Execution Instructions
Do not mock the database. Run tests against the active PostgreSQL database (`localhost:5432` or via docker-compose test DB).

1. **Reset and Seed Database:**
   ```bash
   cd /home/bow/projects/Everest-Textile-Mills/backend
   bun run src/db/seed.ts
   ```
2. **Execute Unit/Integration Test Suites:**
   ```bash
   bun test
   ```
   *Note:* Ensure existing tests in `src/__tests__/person_a.test.ts` pass, and write/run integration tests for the full system (`salesOrders`, `fabricRolls`, `dispatches`, `dashboard`, `reports`, auth, concurrency).

### 5.2 Key Business Flows to Verify
- **Yarn Receipt Transaction:** Adding receipt increases yarn stock quantity; stock below reorder level updates low-stock gauge.
- **Order Lifecycle Stepper:** Advancing an order through `pending -> yarn_check -> spinning -> weaving -> dyeing -> quality_check -> ready_to_ship -> dispatched`. Backward status jumps must be rejected with 400.
- **Roll Creation & QC Decision Guard:** Creating a roll updates order completed metres. QC decision `PATCH /fabric-rolls/:id/qc` must be atomic and succeed only once when `qc_result == 'pending'`.
- **Dispatch Creation Transaction:** Must require order status `ready_to_ship`, assign only passed rolls, update sales order status to `dispatched`, and reject duplicate dispatches.
- **Dashboard & Cost Calculations:** Verify that numbers returned by `/dashboard/kpis` match actual database count queries.

### 5.3 k6 Load Testing
Run both k6 scenarios against the active backend server:
```bash
# Scenario 1: Shop Floor & Machinery
k6 run k6/scenarios/person_a_shopfloor.js

# Scenario 2: Order Lifecycle & Quality Control
k6 run k6/scenarios/person_b_order_lifecycle.js
```
**Thresholds to Verify:**
- Read endpoints: p95 < 200–250ms
- Write / Transaction endpoints: p95 < 500–600ms
- Error rate < 1%
- Data consistency post-run: no negative yarn stock, no duplicate dispatches, roll metres correctly aggregated.

### 5.4 Observability Checks
- Verify `/metrics` endpoint returns Prometheus counters:
  - `orders_created_total`
  - `orders_dispatched_total`
  - `fabric_rolls_qc_decision_total{result="..."}`
  - Gauges `yarn_stock_low_count` and `production_output_metres_today`
- Verify Prometheus scrapes `http://localhost:9090` without scrape errors.

---

## 6. Output Deliverable: `test-report.md`

After implementing the missing endpoints and executing tests and load runs, generate `test-report.md` at the project root with the following structure:
1. **Summary:** Pass/fail counts per section (API Contract, Business Flows, Data Integrity, Observability, Load Testing).
2. **Table of Failures / Fixes:** Endpoint/Feature, expected vs actual, resolution status.
3. **Plan vs Implementation Gaps:** Any deviations from `docs/plan.md` or `docs/frontend.md`.
4. **k6 Load Test Results:** p90/p95 latencies, request rates, error rates for both scenarios.
5. **Open Questions / Architecture Notes.**

---

## 7. Quick Reference: Useful Commands

```bash
# Start background dependencies
docker compose up -d

# Check docker logs
docker compose logs -f db

# Run database migrations
bun run src/db/migrate.ts

# Re-seed database
bun run src/db/seed.ts

# Start dev server
bun --env-file=.env run dev

# Run TypeScript type check
bun run tsc --noEmit

# Run test suite
bun test

# Run load tests
k6 run k6/scenarios/person_a_shopfloor.js
k6 run k6/scenarios/person_b_order_lifecycle.js
```

---
*End of Handover Document.*
