# Everest Textile Mills — Backend Plan

> **Tech stack:** TypeScript · Bun · Express · PostgreSQL · Drizzle ORM + drizzle-kit · Zod · Docker + docker-compose · Prometheus · Grafana · k6
>
> **Assumptions stated inline.** No microservices, no queues, no caching.

---

## 1. Data Model

### 1.1 Enums

```sql
machine_status:    running | idle | maintenance | breakdown
machine_type:      spinning | weaving | dyeing
machine_shift:     A | B | C
yarn_type:         Cotton | Polyester | Wool | Silk | Blended
order_status:      pending | yarn_check | spinning | weaving | dyeing
                   | quality_check | ready_to_ship | dispatched
production_status: queued | in_progress | paused | completed
qc_result:         passed | rework | rejected | pending
dispatch_status:   prepared | loaded | delivered
```

### 1.2 Tables

| Table | Notes |
|---|---|
| `users` | Auth table; not in frontend mock |
| `machines` | Physical machine registry |
| `machine_output_log` | Daily output per machine per date |
| `suppliers` | Was hardcoded in LowStockAlerts.tsx (G3) |
| `yarn_types_suppliers` | M2M junction |
| `yarn_stock` | Current inventory per (type, colour, location) |
| `yarn_receipts` | Immutable ledger of deliveries |
| `sales_orders` | Core order entity |
| `production_orders` | One-to-one with sales_order per stage (G2) |
| `fabric_rolls` | Physical rolls produced |
| `dispatches` | Shipment records |
| `dispatch_rolls` | Junction: dispatch ↔ fabric_roll |
| `order_costs` | Financial record per order |
| `monthly_snapshots` | Persisted monthly aggregates |
| `app_config` | Key-value: machine daily target, etc. (G4, G5) |

---

### 1.3 Drizzle Schema (Pseudocode — Columns + Constraints)

#### `users`
```ts
id            uuid PK default gen_random_uuid()
name          varchar(120) NOT NULL
email         varchar(200) UNIQUE NOT NULL
password_hash varchar(255) NOT NULL
role          enum('admin','manager','operator','qc_inspector','viewer') NOT NULL
created_at    timestamptz DEFAULT now()
```

#### `machines`
```ts
id            varchar(10) PK                -- e.g. "SP-01"
name          varchar(120) NOT NULL
type          machine_type NOT NULL
daily_target  integer NOT NULL DEFAULT 500  -- metres; was hardcoded (G5)
created_at    timestamptz DEFAULT now()
```

#### `machine_status_log`
```ts
id            uuid PK
machine_id    varchar(10) FK → machines.id
status        machine_status NOT NULL
operator      varchar(120)
shift         machine_shift NOT NULL
current_order_id varchar(20) FK → sales_orders.id nullable
progress      smallint NOT NULL DEFAULT 0   -- 0-100
recorded_at   timestamptz DEFAULT now()
INDEX: (machine_id, recorded_at DESC)
```

> **Assumption:** Machine status is the latest row in `machine_status_log`. `progress` and `output_today` are derived in queries. `outputToday` = `machine_output_log.sum` for today.

#### `machine_output_log`
```ts
id            uuid PK
machine_id    varchar(10) FK → machines.id
date          date NOT NULL
metres        integer NOT NULL DEFAULT 0
updated_at    timestamptz DEFAULT now()
UNIQUE (machine_id, date)
INDEX: (machine_id, date)
```

> Computed field for dashboard: `outputToday = SUM(metres) WHERE date = today`.

#### `suppliers`
```ts
id            uuid PK
name          varchar(200) NOT NULL
phone         varchar(30)
email         varchar(200)
notes         text
created_at    timestamptz DEFAULT now()
```

#### `yarn_types_suppliers`
```ts
yarn_type     yarn_type NOT NULL
supplier_id   uuid FK → suppliers.id
PK (yarn_type, supplier_id)
```

#### `yarn_stock`
```ts
id             varchar(20) PK               -- e.g. "YS-001"
type           yarn_type NOT NULL
colour         varchar(80) NOT NULL
quantity_kg    numeric(10,2) NOT NULL DEFAULT 0
reorder_level  numeric(10,2) NOT NULL DEFAULT 0
location       varchar(80) NOT NULL
last_updated   timestamptz DEFAULT now()
INDEX: (type)
CHECK: quantity_kg >= 0
```

#### `yarn_receipts`
```ts
id             varchar(30) PK               -- e.g. "YR-2026-088"
date           date NOT NULL
supplier_id    uuid FK → suppliers.id nullable  -- can be free-text initially
supplier_name  varchar(200) NOT NULL         -- denorm for display
yarn_type      yarn_type NOT NULL
colour         varchar(80) NOT NULL
quantity_kg    numeric(10,2) NOT NULL
yarn_stock_id  varchar(20) FK → yarn_stock.id nullable  -- G1: which stock item was updated
for_order_id   varchar(20) FK → sales_orders.id nullable
received_by    varchar(120) NOT NULL
invoice_no     varchar(80) NOT NULL
created_at     timestamptz DEFAULT now()
INDEX: (date DESC)
INDEX: (for_order_id)
```

#### `sales_orders`
```ts
id              varchar(20) PK               -- e.g. "ORD-1042"
buyer           varchar(200) NOT NULL
fabric_type     varchar(120) NOT NULL
colour          varchar(80) NOT NULL
quantity_metres numeric(10,2) NOT NULL
unit_price      numeric(10,2) NOT NULL
delivery_date   date NOT NULL
created_date    date NOT NULL DEFAULT CURRENT_DATE
status          order_status NOT NULL DEFAULT 'pending'
machine_id      varchar(10) FK → machines.id nullable
completed_metres numeric(10,2) NOT NULL DEFAULT 0
updated_at      timestamptz DEFAULT now()
INDEX: (status)
INDEX: (buyer)
INDEX: (delivery_date)
CHECK: completed_metres >= 0
CHECK: completed_metres <= quantity_metres
```

> **Computed in query (not stored):**
> - `progress_pct = ROUND(completed_metres / quantity_metres * 100)`
> - `order_value = quantity_metres * unit_price`

#### `production_orders`
```ts
id               uuid PK default gen_random_uuid()
sales_order_id   varchar(20) FK → sales_orders.id UNIQUE  -- one production order per sales order
machine_id       varchar(10) FK → machines.id NOT NULL
start_date       date NOT NULL
expected_end_date date NOT NULL
status           production_status NOT NULL DEFAULT 'queued'
output_metres    numeric(10,2) NOT NULL DEFAULT 0
target_metres    numeric(10,2) NOT NULL
created_at       timestamptz DEFAULT now()
updated_at       timestamptz DEFAULT now()
INDEX: (sales_order_id)
INDEX: (machine_id)
INDEX: (status)
```

#### `fabric_rolls`
```ts
id             varchar(20) PK               -- e.g. "FR-5501"
order_id       varchar(20) FK → sales_orders.id NOT NULL
machine_id     varchar(10) FK → machines.id NOT NULL
metres         numeric(8,2) NOT NULL
produced_date  date NOT NULL
qc_result      qc_result NOT NULL DEFAULT 'pending'
defects        jsonb                         -- string[] or null
checked_by     varchar(120)
checked_at     timestamptz
created_at     timestamptz DEFAULT now()
INDEX: (order_id)
INDEX: (machine_id)
INDEX: (qc_result)
INDEX: (produced_date DESC)
```

#### `dispatches`
```ts
id             varchar(20) PK               -- e.g. "DSP-301"
order_id       varchar(20) FK → sales_orders.id NOT NULL
buyer          varchar(200) NOT NULL         -- denorm from sales_orders
total_metres   numeric(10,2) NOT NULL       -- computed from rolls at creation time
dispatch_date  date NOT NULL
invoice_no     varchar(80) NOT NULL
truck_no       varchar(40) NOT NULL
status         dispatch_status NOT NULL DEFAULT 'prepared'
created_at     timestamptz DEFAULT now()
updated_at     timestamptz DEFAULT now()
INDEX: (order_id)
INDEX: (status)
INDEX: (dispatch_date DESC)
```

#### `dispatch_rolls`
```ts
dispatch_id    varchar(20) FK → dispatches.id
roll_id        varchar(20) FK → fabric_rolls.id
PK (dispatch_id, roll_id)
```

> Resolves G7: roll IDs are stored in a junction table. Backend selects all `passed` rolls for the order when creating a dispatch (unless frontend sends explicit roll_ids).

#### `order_costs`
```ts
order_id       varchar(20) FK → sales_orders.id PK
buyer          varchar(200) NOT NULL         -- denorm
yarn_cost      numeric(12,2) NOT NULL DEFAULT 0
labour_cost    numeric(12,2) NOT NULL DEFAULT 0
machine_cost   numeric(12,2) NOT NULL DEFAULT 0
revenue        numeric(12,2) NOT NULL DEFAULT 0
updated_at     timestamptz DEFAULT now()
```

> **Computed in query (not stored):**
> - `total_cost = yarn_cost + labour_cost + machine_cost`
> - `profit = revenue - total_cost`
> - `margin_pct = ROUND(profit / NULLIF(revenue,0) * 100)`

#### `monthly_snapshots`
```ts
id           uuid PK
year         smallint NOT NULL
month        smallint NOT NULL              -- 1-12
revenue      numeric(14,2) NOT NULL DEFAULT 0
cost         numeric(14,2) NOT NULL DEFAULT 0
output_metres numeric(14,2) NOT NULL DEFAULT 0
wages        numeric(14,2) NOT NULL DEFAULT 0  -- G4: was ₹385,000 hardcoded
created_at   timestamptz DEFAULT now()
UNIQUE (year, month)
```

#### `app_config`
```ts
key    varchar(80) PK
value  text NOT NULL
```

> Stores: `machine_daily_target_metres` = "500" (G5), etc.

---

### 1.4 Entity-Relation Summary

```
users
machines 1─────── N machine_status_log
machines 1─────── N machine_output_log
machines 1─────── N sales_orders (current machine)
machines 1─────── N production_orders
machines 1─────── N fabric_rolls

suppliers N─── M yarn_types_suppliers ─── yarn_type (enum)
yarn_receipts N→1 suppliers
yarn_receipts N→1 yarn_stock
yarn_receipts N→1 sales_orders

sales_orders 1─1 production_orders
sales_orders 1──N fabric_rolls
sales_orders 1──N dispatches
sales_orders 1─1 order_costs

dispatches N─── M dispatch_rolls ─── fabric_rolls
```

---

## 2. API Endpoints

Base prefix: `/api/v1`
Auth header: `Authorization: Bearer <jwt>`
All responses: `Content-Type: application/json`
Standard error: `{ error: string, details?: object }`
Pagination: `?page=1&limit=50` on list endpoints.

### 2.1 Auth

| Method | Path | Description | Request body | Response |
|---|---|---|---|---|
| POST | `/auth/login` | Get JWT | `{ email, password }` | `{ token, user: {id,name,role} }` |
| POST | `/auth/logout` | Invalidate token (stateless JWT → just 200 OK) | — | `200` |
| GET | `/auth/me` | Current user | — | `{ id, name, email, role }` |

### 2.2 Dashboard

| Method | Path | Description | Params | Response |
|---|---|---|---|---|
| GET | `/dashboard/kpis` | All KPI strip values | — | See below |
| GET | `/dashboard/monthly-chart` | 6-month revenue/cost/output | — | `MonthlyPoint[]` |
| GET | `/dashboard/qc-summary` | QC counts by result | — | `{ passed,rework,rejected,pending }` |
| GET | `/dashboard/machine-health` | Machine counts by status | — | `{ running,idle,maintenance,breakdown }` |
| GET | `/dashboard/recent-orders` | First 5 sales orders by created_date desc | — | `SalesOrderRow[]` |
| GET | `/dashboard/low-stock` | Yarn below reorder level | — | `YarnStockRow[]` |

**KPI response shape:**
```ts
{
  activeOrders: number,
  readyToShip: number,
  runningMachines: number,
  totalMachines: number,
  idleMachines: number,
  downMachines: number,
  outputToday: number,        // metres
  lowStockCount: number,
  pendingQC: number,
}
```

> A single `/dashboard/kpis` endpoint avoids 5 round-trips. Acceptable denormalization at this scale.

---

### 2.3 Machines

| Method | Path | Description | Body / Params | Response |
|---|---|---|---|---|
| GET | `/machines` | All machines with latest status | `?type=&status=` | `MachineRow[]` |
| GET | `/machines/:id` | Single machine | — | `MachineRow` |
| POST | `/machines` | Create machine | `CreateMachineBody` | `MachineRow` 201 |
| PATCH | `/machines/:id/status` | Update status / operator / shift / progress | `UpdateStatusBody` | `MachineRow` |
| GET | `/machines/:id/output-log` | Daily output history | `?from=&to=` | `OutputLogRow[]` |
| POST | `/machines/:id/output` | Record daily output | `{ date, metres }` | `OutputLogRow` 201 |

**MachineRow shape** (matches frontend `Machine`):
```ts
{
  id, name, type, status, currentOrder, operator,
  progress, outputToday, shift
}
```

**`CreateMachineBody`** (Zod):
```ts
{ id: string, name: string, type: MachineType, daily_target?: number }
```

**`UpdateStatusBody`** (Zod):
```ts
{
  status: MachineStatus,
  operator?: string,
  shift?: MachineShift,
  current_order_id?: string | null,
  progress?: number  // 0-100
}
```

---

### 2.4 Production Orders

| Method | Path | Description | Body / Params | Response |
|---|---|---|---|---|
| GET | `/production-orders` | All production orders | `?status=&machine_id=` | `ProductionOrderRow[]` |
| GET | `/production-orders/:id` | Single production order | — | `ProductionOrderRow` |
| POST | `/production-orders` | Create production order (links to sales order) | `CreateProductionOrderBody` | `ProductionOrderRow` 201 |
| PATCH | `/production-orders/:id` | Update status / outputMetres | `UpdateProductionOrderBody` | `ProductionOrderRow` |

**`ProductionOrderRow`** (augmented — matches frontend view):
```ts
{
  id, salesOrderId, machineId, machineName,
  startDate, expectedEndDate, status,
  outputMetres, targetMetres,
  // from join:
  buyer, fabricType, colour, deliveryDate, orderStatus
}
```

**Business logic:** Creating a production order:
1. Validates `salesOrderId` exists.
2. Updates `sales_orders.machine_id = machineId`.
3. Updates `sales_orders.status` to the appropriate stage (`spinning`/`weaving`/`dyeing` based on machine type). *(Transaction)*

---

### 2.5 Yarn

#### Yarn Stock
| Method | Path | Description | Params | Response |
|---|---|---|---|---|
| GET | `/yarn/stock` | All yarn stock | `?type=&low_stock=true` | `YarnStockRow[]` |
| GET | `/yarn/stock/alerts` | Only below reorder level | — | `YarnAlertRow[]` |
| PATCH | `/yarn/stock/:id` | Adjust stock (admin only) | `{ quantity_kg, location, reorder_level }` | `YarnStockRow` |

**`YarnAlertRow`** (extends YarnStockRow):
```ts
{
  ...YarnStockRow,
  deficit: number,           // reorder_level - quantity_kg
  severity: 'critical' | 'warning',
  suppliers: { name, phone, email }[]  // from yarn_types_suppliers join
}
```

#### Yarn Receipts
| Method | Path | Description | Body | Response |
|---|---|---|---|---|
| GET | `/yarn/receipts` | All receipts | `?from=&to=&supplier=` | `YarnReceiptRow[]` |
| POST | `/yarn/receipts` | Record new receipt | `CreateYarnReceiptBody` | `YarnReceiptRow` 201 |

**`CreateYarnReceiptBody`** (Zod):
```ts
{
  date: string,            // ISO date
  supplier_name: string,
  yarn_type: YarnType,
  colour: string,
  quantity_kg: number,
  yarn_stock_id?: string,  // which stock bin to increment
  for_order_id?: string,
  received_by: string,
  invoice_no: string,
}
```

**Business logic:** Creating a yarn receipt:
1. Inserts `yarn_receipts` row.
2. If `yarn_stock_id` provided: `UPDATE yarn_stock SET quantity_kg += quantity_kg, last_updated = now()`.
3. All in one transaction. *(Resolves G1)*

---

### 2.6 Quality Control

| Method | Path | Description | Params / Body | Response |
|---|---|---|---|---|
| GET | `/fabric-rolls` | All rolls, filterable | `?order_id=&qc_result=&machine_id=` | `FabricRollRow[]` |
| GET | `/fabric-rolls/:id` | Single roll | — | `FabricRollRow` |
| POST | `/fabric-rolls` | Create roll | `CreateFabricRollBody` | `FabricRollRow` 201 |
| PATCH | `/fabric-rolls/:id/qc` | Submit QC decision | `QCDecisionBody` | `FabricRollRow` |
| GET | `/fabric-rolls/pending` | All pending rolls | — | `FabricRollRow[]` |
| GET | `/fabric-rolls/stats` | Aggregate counts + rates | — | `FabricRollStats` |

**`QCDecisionBody`** (Zod — the key write action from PendingInspection.tsx):
```ts
{
  qc_result: 'passed' | 'rework' | 'rejected',
  checked_by: string,
  defects?: string[],   // required if rework or rejected
}
```

**Business logic on QC decision:**
- Sets `checked_at = now()`.
- If `passed`: may trigger check — if all rolls for the order are passed, backend can optionally advance `sales_orders.status = 'ready_to_ship'` (rule: when `completedMetres` matches `quantityMetres` and all rolls passed). *Mark as assumption — confirm with user.*
- `rejected` and `rework` rolls do NOT count toward `completed_metres`.

---

### 2.7 Sales Orders

| Method | Path | Description | Params / Body | Response |
|---|---|---|---|---|
| GET | `/sales-orders` | All orders | `?status=&buyer=&q=&page=&limit=` | `SalesOrderRow[]` + meta |
| GET | `/sales-orders/:id` | Single order with pipeline stages | — | `SalesOrderDetail` |
| POST | `/sales-orders` | Create new order | `CreateSalesOrderBody` | `SalesOrderRow` 201 |
| PATCH | `/sales-orders/:id/status` | Advance status (restricted) | `{ status: OrderStatus }` | `SalesOrderRow` |

**`CreateSalesOrderBody`** (Zod):
```ts
{
  buyer: string,
  fabric_type: string,
  colour: string,
  quantity_metres: number,      // > 0
  unit_price: number,           // > 0
  delivery_date: string,        // ISO date, future
}
```

**`SalesOrderDetail`** (for `/sales/status` page):
```ts
{
  ...SalesOrderRow,
  machine: { id, name } | null,
  stages: { key: OrderStatus, label: string, done: boolean, current: boolean }[]
}
```

---

### 2.8 Dispatches

| Method | Path | Description | Body | Response |
|---|---|---|---|---|
| GET | `/dispatches` | All dispatches | `?status=` | `DispatchRow[]` |
| GET | `/dispatches/:id` | Single dispatch | — | `DispatchRow` |
| POST | `/dispatches` | Create dispatch | `CreateDispatchBody` | `DispatchRow` 201 |
| PATCH | `/dispatches/:id/status` | Update status (loaded/delivered) | `{ status: DispatchStatus }` | `DispatchRow` |

**`CreateDispatchBody`** (Zod — resolves G7):
```ts
{
  order_id: string,
  dispatch_date: string,
  truck_no: string,
  invoice_no: string,
  // roll_ids is optional; if omitted, backend uses all passed QC rolls for the order
  roll_ids?: string[],
}
```

**Business logic:**
1. Validates order is `ready_to_ship`.
2. If `roll_ids` not provided, selects all `fabric_rolls WHERE order_id = ? AND qc_result = 'passed'`.
3. Computes `total_metres = SUM(metres)`.
4. Inserts `dispatches` + `dispatch_rolls` rows.
5. Updates `sales_orders.status = 'dispatched'`. *(Transaction)*

---

### 2.9 Reports

| Method | Path | Description | Params | Response |
|---|---|---|---|---|
| GET | `/reports/order-costs` | Cost breakdown per order | `?order_id=` | `OrderCostRow[]` |
| PUT | `/reports/order-costs/:order_id` | Upsert cost record | `OrderCostBody` | `OrderCostRow` |
| GET | `/reports/machine-performance` | Today's machine output | — | `MachinePerformanceRow[]` |
| GET | `/reports/monthly` | Monthly summary list | `?year=&month=` | `MonthlySummaryRow[]` |
| PUT | `/reports/monthly/:year/:month` | Upsert monthly snapshot | `MonthlySummaryBody` | `MonthlySummaryRow` |

**`OrderCostRow`** (resolves G10):
```ts
{
  orderId, buyer, yarnCost, labourCost, machineCost,
  totalCost,    // computed: yarnCost + labourCost + machineCost
  revenue,      // stored
  profit,       // computed: revenue - totalCost
  marginPct     // computed: profit / revenue * 100
}
```

**`MachinePerformanceRow`:**
```ts
{
  id, name, type, status, currentOrder, operator,
  outputToday, target,    // target from app_config or machines.daily_target
  efficiencyPct           // computed: outputToday / target * 100
}
```

---

### 2.10 Suppliers

| Method | Path | Description |
|---|---|---|
| GET | `/suppliers` | List all suppliers |
| POST | `/suppliers` | Create supplier |
| PATCH | `/suppliers/:id` | Update supplier |

---

## 3. Business Logic & Consistency Rules

### 3.1 Order Status Flow

```
pending → yarn_check → spinning → weaving → dyeing → quality_check → ready_to_ship → dispatched
```

- Status advances **forward only** (no reversals except `ready_to_ship → quality_check` if a QC failure is logged post-completion — *assumption: not allowed; mark order separately*).
- `PATCH /sales-orders/:id/status` enforces valid transitions server-side.
- `spinning/weaving/dyeing` requires a `machineId` to be set first (either via production order creation or explicit PATCH).
- `dispatched` set automatically on dispatch creation.

### 3.2 Yarn Receipt → Stock Update (Transaction)

```
BEGIN;
INSERT INTO yarn_receipts (...) VALUES (...);
IF yarn_stock_id IS NOT NULL:
  UPDATE yarn_stock SET quantity_kg = quantity_kg + $qty, last_updated = now()
  WHERE id = $yarn_stock_id;
COMMIT;
```

### 3.3 QC Decision (Transaction)

```
BEGIN;
UPDATE fabric_rolls SET qc_result=$result, checked_by=$by, checked_at=now(), defects=$defects
WHERE id = $id AND qc_result = 'pending';  -- guard against double-submit
-- if passed and order completedMetres >= quantityMetres:
--   check if all non-rejected rolls for order are passed
--   if yes: UPDATE sales_orders SET status='ready_to_ship' WHERE id=$orderId
COMMIT;
```

**Guard:** `WHERE qc_result = 'pending'` prevents re-submitting an already decided roll.

### 3.4 Dispatch Creation (Transaction)

```
BEGIN;
-- validate order status = 'ready_to_ship'
-- compute rolls if not provided
INSERT INTO dispatches (...) VALUES (...) RETURNING id;
INSERT INTO dispatch_rolls (dispatch_id, roll_id) SELECT $dispatchId, unnest($rollIds);
UPDATE sales_orders SET status='dispatched', updated_at=now() WHERE id=$orderId;
COMMIT;
```

### 3.5 Machine Status Update

- Setting a machine to `breakdown` or `maintenance` should nullify `current_order_id` (or at least not block the order).
- `progress` (0-100) is stored in `machine_status_log` — it represents the current operator's view of progress on the current order.
- `completed_metres` on `sales_orders` is the authoritative measure (incremented when production order advances or rolls are logged).

### 3.6 ID Generation Strategy

| Table | ID Pattern | Generation |
|---|---|---|
| `machines` | `SP-01`, `WV-02` | User-provided at creation |
| `sales_orders` | `ORD-NNNN` | Sequential: `SELECT MAX + 1` in a sequence |
| `yarn_stock` | `YS-NNN` | Sequential |
| `yarn_receipts` | `YR-YYYY-NNN` | Year + sequential |
| `fabric_rolls` | `FR-NNNN` | Sequential |
| `dispatches` | `DSP-NNN` | Sequential |
| `production_orders` | UUID | `gen_random_uuid()` |
| All others | UUID | `gen_random_uuid()` |

> For human-readable IDs: use a `CREATE SEQUENCE` per entity and format in application code.

---

## 4. Auth & Roles

### 4.1 Roles

| Role | Description |
|---|---|
| `admin` | Full access; manage users, machines, config |
| `manager` | Create/view orders, costs, reports; view all |
| `operator` | Update machine status, log output, create production orders |
| `qc_inspector` | Submit QC decisions, create fabric rolls |
| `viewer` | Read-only access to all pages |

### 4.2 Endpoint Access Matrix

| Endpoint group | admin | manager | operator | qc_inspector | viewer |
|---|---|---|---|---|---|
| Auth | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dashboard (all GETs) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Machines GET | ✓ | ✓ | ✓ | ✓ | ✓ |
| Machines POST/PATCH | ✓ | ✓ | ✓ operator only status | — | — |
| Production orders | ✓ | ✓ | ✓ | — | view |
| Yarn receipts GET | ✓ | ✓ | ✓ | ✓ | ✓ |
| Yarn receipts POST | ✓ | ✓ | ✓ | — | — |
| Yarn stock PATCH | ✓ | ✓ | — | — | — |
| Fabric rolls GET | ✓ | ✓ | ✓ | ✓ | ✓ |
| Fabric rolls POST + QC | ✓ | ✓ | — | ✓ | — |
| Sales orders GET | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sales orders POST | ✓ | ✓ | — | — | — |
| Sales orders status PATCH | ✓ | ✓ | — | — | — |
| Dispatches GET | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dispatches POST/PATCH | ✓ | ✓ | — | — | — |
| Reports GET | ✓ | ✓ | — | — | ✓ |
| Reports PUT (costs, monthly) | ✓ | ✓ | — | — | — |
| Suppliers | ✓ | ✓ | — | — | view |

### 4.3 Implementation

- **Library:** `jsonwebtoken` (JWT, HS256, 8h expiry).
- Middleware: `authenticate` → parses Bearer token → attaches `req.user`.
- Middleware: `authorize(...roles)` → checks `req.user.role`.
- No refresh tokens in v1 (keep it simple; add if needed).
- Passwords: `bcrypt` with cost factor 12.

---

## 5. Observability

### 5.1 Prometheus Metrics (via `prom-client`)

#### HTTP Metrics (auto-instrumented via middleware)
```
http_request_duration_seconds{method, route, status_code} — histogram, buckets [.01,.05,.1,.5,1,5]
http_requests_total{method, route, status_code}            — counter
```

#### Database Metrics
```
db_query_duration_seconds{operation, table}   — histogram
db_pool_connections_active                    — gauge
db_pool_connections_idle                      — gauge
```

#### Business Metrics
```
orders_created_total                          — counter
orders_dispatched_total                       — counter
fabric_rolls_qc_decision_total{result}        — counter (passed/rework/rejected)
yarn_stock_low_count                          — gauge (checked on each stock fetch)
machine_status_current{machine_id, status}    — gauge (1/0)
production_output_metres_today                — gauge
```

Expose at `GET /metrics` (scrape every 15s).

### 5.2 Grafana Dashboards

| Dashboard | Panels |
|---|---|
| **API Health** | Request rate, error rate, p50/p95/p99 latency by route |
| **Database** | Query duration, pool utilization, slow queries |
| **Business KPIs** | Active orders, machines running, low stock count, daily output (gauge + sparkline) |
| **QC Overview** | Pass/reject/rework rate over time (bar chart) |
| **Production** | Orders dispatched per day, order lifecycle duration |

### 5.3 Structured Logging (via `pino`)

```json
{
  "level": "info",
  "time": "2026-10-10T06:45:00.000Z",
  "req": { "method": "POST", "url": "/api/v1/dispatches", "id": "req-xyz" },
  "res": { "statusCode": 201 },
  "responseTime": 42,
  "userId": "uuid",
  "action": "dispatch.created",
  "orderId": "ORD-1029"
}
```

- Log level: `info` in production, `debug` in development.
- `pino-pretty` in dev; JSON in prod.
- Request ID via `express-request-id` or `crypto.randomUUID()`.

---

## 6. Load Testing (k6)

### 6.1 Scenarios

#### Scenario A: Normal Read Traffic (steady state)
```js
// 20 concurrent users browsing for 5 minutes
target: 20 VUs, duration: 5m
flows: GET /dashboard/kpis, GET /machines, GET /sales-orders,
       GET /fabric-rolls?qc_result=pending
```

#### Scenario B: Busy Production Day (ramp up)
```js
// Ramp: 0→50 VUs in 2m, hold 50 VUs for 5m, ramp down 2m
flows:
  40% → Dashboard poll (GET /dashboard/kpis every 30s)
  20% → QC inspector: GET /fabric-rolls/pending → PATCH /:id/qc
  20% → Operator: PATCH /machines/:id/status + POST /machines/:id/output
  20% → Manager: GET /sales-orders, POST /sales-orders
```

#### Scenario C: Dispatch Burst
```js
// 10 concurrent dispatches (simulate shift-end)
flows: POST /dispatches × 10 concurrently
```

### 6.2 Thresholds

```js
thresholds: {
  'http_req_duration{scenario:read_traffic}':   ['p95 < 200'],   // ms
  'http_req_duration{scenario:busy_day}':        ['p95 < 500'],
  'http_req_duration{scenario:dispatch_burst}':  ['p95 < 1000'],
  'http_req_failed':                             ['rate < 0.01'], // < 1% errors
  'checks':                                      ['rate > 0.99'],
}
```

### 6.3 Seed Data for k6

- 50 sales orders, 20 machines, 200 fabric rolls, 100 yarn stock entries.
- Pre-create via seed script before k6 run.

---

## 7. Project Structure & Docker

### 7.1 Folder Layout

```
backend/
├── src/
│   ├── index.ts                  # Express app bootstrap
│   ├── config.ts                 # env vars via Zod parse
│   ├── db/
│   │   ├── schema/               # Drizzle schema files (one per domain)
│   │   │   ├── machines.ts
│   │   │   ├── yarn.ts
│   │   │   ├── orders.ts
│   │   │   ├── quality.ts
│   │   │   ├── dispatches.ts
│   │   │   ├── reports.ts
│   │   │   └── users.ts
│   │   ├── index.ts              # Drizzle client + pool
│   │   └── migrate.ts            # run migrations on startup
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── metrics.ts            # Prometheus HTTP middleware
│   │   ├── logger.ts             # pino request logger
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── dashboard.ts
│   │   ├── machines.ts
│   │   ├── productionOrders.ts
│   │   ├── yarn.ts
│   │   ├── fabricRolls.ts
│   │   ├── salesOrders.ts
│   │   ├── dispatches.ts
│   │   ├── reports.ts
│   │   └── suppliers.ts
│   ├── services/                 # Business logic (transactional)
│   │   ├── yarnService.ts
│   │   ├── qcService.ts
│   │   ├── dispatchService.ts
│   │   └── orderService.ts
│   ├── validators/               # Zod schemas per route
│   │   ├── machineValidators.ts
│   │   ├── orderValidators.ts
│   │   └── ...
│   └── metrics.ts                # prom-client registry + business metrics
├── drizzle/
│   └── migrations/               # generated by drizzle-kit
├── drizzle.config.ts
├── seed.ts                       # seed from frontend mock data
├── k6/
│   ├── scenarios/
│   │   ├── readTraffic.js
│   │   ├── busyDay.js
│   │   └── dispatchBurst.js
│   └── helpers.js
├── Dockerfile
├── .env.example
├── bunfig.toml
└── package.json
```

### 7.2 Additional Small Libraries

| Library | Reason |
|---|---|
| `prom-client` | Prometheus metrics export |
| `pino` + `pino-http` | Structured JSON logging |
| `helmet` | HTTP security headers (XSS, HSTS, etc.) |
| `cors` | CORS headers for frontend origin |
| `jsonwebtoken` | JWT sign/verify |
| `bcrypt` | Password hashing |
| `express-request-id` | Attach unique request IDs for log correlation |

### 7.3 Docker Compose

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: everest_erp
      POSTGRES_USER: erp_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports: ["5432:5432"]
    healthcheck: pg_isready

  backend:
    build: ./backend
    depends_on: [db]
    environment:
      DATABASE_URL: postgres://erp_user:${DB_PASSWORD}@db:5432/everest_erp
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3000
    ports: ["3000:3000"]

  prometheus:
    image: prom/prometheus:v2.51.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - promdata:/prometheus
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:10.4.0
    depends_on: [prometheus]
    volumes:
      - grafdata:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    ports: ["3001:3000"]

volumes:
  pgdata:
  promdata:
  grafdata:
```

> **Frontend** is served separately (Vite dev or nginx) — not in this compose file for now.

### 7.4 Environment Config (`.env.example`)

```
PORT=3000
DATABASE_URL=postgres://erp_user:secret@db:5432/everest_erp
JWT_SECRET=change_me_in_production_min_32_chars
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
```

### 7.5 Migration & Seed Strategy

**Migrations:**
- `drizzle-kit generate` creates SQL migration files under `drizzle/migrations/`.
- `drizzle-kit migrate` (or `drizzle/migrate.ts` on app startup in dev) applies pending migrations.
- CI runs `drizzle-kit migrate` before tests.

**Seed (`seed.ts`):**
- Directly maps frontend mock data (`mockData.ts`) to DB inserts.
- Idempotent: checks if data exists before inserting (or truncates in dev only).
- Seed order: users → machines → suppliers → yarn_stock → sales_orders → production_orders → yarn_receipts → fabric_rolls → dispatches → dispatch_rolls → order_costs → monthly_snapshots.
- Adds a default admin user (`admin@everest.local` / changeme123).

---

## 8. Build Order (Shippable Milestones)

### Milestone 1 — Vertical Slice (Week 1)
**Goal:** Working endpoint that powers the Dashboard page end-to-end.

- [x] Bun + Express + TypeScript scaffold
- [x] Docker Compose (db + backend)
- [x] Drizzle setup + migrations for: `machines`, `machine_output_log`, `yarn_stock`, `sales_orders`, `fabric_rolls`, `monthly_snapshots`
- [x] Seed from mock data
- [x] `GET /api/v1/dashboard/kpis` (all KPI values)
- [x] `GET /api/v1/dashboard/monthly-chart`
- [x] `GET /api/v1/dashboard/recent-orders`
- [x] `GET /api/v1/dashboard/low-stock`
- [x] Health check `GET /health`
- [x] Prometheus middleware + `/metrics`
- [x] Basic JWT auth (login endpoint + authenticate middleware)
- [x] Frontend wired to real API for Dashboard page

**Verification:** Dashboard renders real data; `/metrics` scraped by Prometheus.

---

### Milestone 2 — Machines + Shop Floor (Week 2)
- [x] Full `machines` CRUD
- [x] `machine_status_log` table + PATCH status endpoint
- [x] `machine_output_log` table + POST output endpoint
- [x] ShopFloorBoard and Machines pages wired
- [x] MachinePerformance report endpoint
- [x] Role middleware (`operator` can update status)

---

### Milestone 3 — Yarn (Week 2-3)
- [x] `suppliers` table + endpoints
- [x] `yarn_stock` table + PATCH endpoint
- [x] `yarn_receipts` table + POST (with stock update transaction)
- [x] `/yarn/stock/alerts` endpoint
- [x] All yarn pages wired
- [x] LowStockAlerts supplier data from DB (removes hardcoded component data)

---

### Milestone 4 — Sales Orders + Production Orders (Week 3)
- [x] `sales_orders` CRUD + status PATCH
- [x] `production_orders` CRUD
- [x] Status flow validation
- [x] SalesOrders, OrderStatus pages wired
- [x] Production Orders page wired

---

### Milestone 5 — Quality Control (Week 4)
- [x] `fabric_rolls` CRUD
- [x] `PATCH /fabric-rolls/:id/qc` with guard
- [x] Auto-advance order to `ready_to_ship` on completion
- [x] QualityChecks, FabricRolls, PendingInspection pages wired
- [x] QC Prometheus counter

---

### Milestone 6 — Dispatches + Reports (Week 4-5)
- [x] `dispatches` + `dispatch_rolls` tables
- [x] POST dispatch (transaction)
- [x] PATCH dispatch status
- [x] `order_costs` table + upsert endpoint
- [x] Monthly snapshot endpoint
- [x] All remaining pages wired
- [x] Grafana dashboards provisioned

---

### Milestone 7 — Load Testing + Hardening (Week 5)
- [x] k6 scenarios (A, B, C)
- [x] Index tuning from k6 results
- [x] Pagination on list endpoints
- [x] Rate limiting on auth endpoints (100 req/min via `express-rate-limit`)
- [x] Production Dockerfile (multi-stage, non-root user)
- [x] Secrets audit (no hardcoded values)
- [x] Frontend: login page + token storage (sessionStorage, not localStorage)

---

## 9. Frontend Changes Required

| # | Change | Reason |
|---|---|---|
| F1 | Add login page (`/login`) and JWT header injection in fetch/axios | Auth required (G8) |
| F2 | Add `yarn_stock_id` field to Yarn Receipt form | Link receipt to stock bin for stock update |
| F3 | Add roll-picker (or confirm auto-select) to Dispatch form | `rollIds` must be resolved (G7) |
| F4 | Wire all form submit handlers to real API endpoints | Currently all stubs |
| F5 | Add pagination controls to all tables | Backend returns paginated results |
| F6 | Remove hardcoded supplier map from LowStockAlerts.tsx | Now served from `/yarn/stock/alerts` |
| F7 | Monthly Summary: current month should be dynamic (not "October 2026") | Backend derives from `monthly_snapshots` |
| F8 | Machine target (500m) should come from API (`/app-config` or machine record) | G5 |
| F9 | Worker wages should come from API (`monthly_snapshots.wages`) | G4 |

---

## 10. Open Questions

| # | Question | Default assumption |
|---|---|---|
| Q1 | Should `completed_metres` on a SalesOrder be updated automatically when fabric rolls are created, or manually by operators? | **Assume:** Auto-updated when rolls are logged (POST fabric-roll increases completed_metres). |
| Q2 | Can an order go backwards in status (e.g., from `ready_to_ship` back to `quality_check`)? | **Assume:** No backward transitions. |
| Q3 | A dispatch should auto-select all passed rolls — or require explicit roll selection? | **Assume:** Auto-select; show roll count in confirmation. |
| Q4 | Is `OrderCost.revenue` = `quantityMetres × unitPrice` or the actual billed amount (may differ for partial shipments)? | **Assume:** Stored independently (billed amount). |
| Q5 | Is there a concept of partial dispatch (dispatch some rolls, ship rest later)? | **Assume:** Not in v1. One dispatch per order. |
| Q6 | Are shifts (A/B/C) time-based (auto) or manually set by operator? | **Assume:** Manually set on machine status update. |
| Q7 | `ProductionOrder` vs `SalesOrder` stages — is there exactly one production order per sales order, or can an order pass through multiple machines sequentially? | **Assume:** One production order per sales order (one active machine at a time). |

---

## 11. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Concurrent QC decisions on same roll | Low | `WHERE qc_result = 'pending'` guard in UPDATE |
| Dispatch created while order status changes | Low | Transaction + status validation before insert |
| Yarn stock going negative if receipt transaction fails mid-way | Low | Postgres transaction; `CHECK quantity_kg >= 0` |
| ID generation collision for human-readable IDs | Low | Postgres sequences are atomic |
| JWT secret leaked in env files | Medium | Use Docker secrets or a secrets manager in prod; never commit `.env` |
| Monthly snapshot data missing → MonthlySummary shows 0 | Medium | Seed includes 6 months of data; add a cron job or manual trigger to snapshot monthly |
| k6 tests break the dev DB | Low | k6 runs against a separate test environment |

---

## 12. Deliberately Left Out

- **Caching (Redis):** At 9 machines and ~50 orders, no need. Add if DB query time exceeds 100ms at scale.
- **Message queues:** No async workflows that require it. QC decisions and dispatches are synchronous and fast.
- **Email/SMS notifications:** "Raise PO" and low-stock alerts are display-only in v1. Could be added as a webhook or email trigger later.
- **Multi-tenancy:** Single factory, single company. No tenant isolation needed.
- **Audit log table:** Not in v1. `created_at` / `updated_at` columns provide basic history.
- **WebSocket / real-time push:** Dashboard polls or refreshes on page load. No live push in v1.
- **File uploads:** No documents, invoices, or images attached to any entity.
- **Soft deletes:** No `deleted_at` columns. Physical deletes are acceptable for this domain.
- **Background jobs / schedulers:** Monthly snapshots could be automated later; v1 uses manual upsert endpoint.
