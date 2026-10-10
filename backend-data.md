# Backend Data Audit — Everest Textile Mills ERP

**Audit Date:** 2026-10-10  
**Codebase:** `backend/src`  
**Runtime / Stack:** Bun v1.4.2 / Node, Express 4, Drizzle ORM, PostgreSQL 16, Zod, JWT, Pino  

---

## 1. System Configuration, Base URLs & CORS

Referenced from [`backend/src/config.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/config.ts) and [`backend/src/index.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/index.ts):

- **Port:** `config.PORT` (defaults to `3000`).
- **Base URL Prefix:**
  - Standard REST API: `http://localhost:3000/api/v1`
  - Observability / Health: `http://localhost:3000/health`, `http://localhost:3000/metrics`
  - Direct ML Forecast: `http://localhost:3000/api/forecast` and `http://localhost:3000/api/v1/forecast`
- **CORS Configuration:**
  - `cors({ origin: config.CORS_ORIGIN, credentials: true })`
  - `config.CORS_ORIGIN` defaults to `'http://localhost:5173'` (standard Vite dev server port).
- **Global Error & Response Shape ([`backend/src/lib/response.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/lib/response.ts)):**
  - **Success Shape:**
    ```json
    {
      "success": true,
      "data": <Payload>,
      "meta": {
        "page": 1,
        "limit": 50,
        "total": 120
      }
    }
    ```
  - **Error Shape:**
    ```json
    {
      "success": false,
      "error": "Error message description",
      "code": "BAD_REQUEST | NOT_FOUND | UNAUTHORIZED | FORBIDDEN | CONFLICT | INTERNAL_ERROR",
      "details": { ... }
    }
    ```

---

## 2. Authentication, Tokens & Role-Based Access Control (RBAC)

Referenced from [`backend/src/middleware/auth.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/middleware/auth.ts) and [`backend/src/routes/auth.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/auth.ts):

### User Roles
- `admin` — Unrestricted access across all endpoints.
- `manager` — Financial reports, status updates, ordering, machine allocation.
- `operator` — Machine status updates, machine output logging, yarn receipts.
- `qc_inspector` — Fabric roll creation and QC pass/rework/reject decisions.
- `viewer` — Read-only access to standard views.

### Token Flow
1. **Login:** `POST /api/v1/auth/login` with `{ email, password }`.
2. **Payload:** Signs JWT with `{ sub: user.id, email: user.email, role: user.role, name: user.name }` valid for 8 hours (`expiresIn: '8h'`).
3. **Header:** Client must transmit `Authorization: Bearer <token>` on all requests to protected routes.
4. **Current User:** `GET /api/v1/auth/me` returns current user claims.

---

## 3. Complete Endpoint Reference

Below is the definitive catalog of all 28 API endpoints across the backend.

### 3.1 Authentication & Health

| Method | Path | Auth / Role | Params / Query | Request Body | Response Shape & Data | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | None | None | `{ status: "healthy", timestamp, env }` | `200` |
| `GET` | `/metrics` | Public | None | None | Prometheus text-formatted metrics | `200` |
| `POST` | `/api/v1/auth/login` | Public | None | `{ email: string, password: string }` | `{ token: string, user: { id, name, email, role } }` | `200`, `400`, `401` |
| `GET` | `/api/v1/auth/me` | Authenticated | None | None | `{ sub, email, role, name }` | `200`, `401` |
| `POST` | `/api/v1/auth/logout` | Authenticated | None | None | `{ message: "Logged out" }` | `200`, `401` |

---

### 3.2 Dashboard Routes ([`backend/src/routes/dashboard.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/dashboard.ts))

All dashboard endpoints require `authenticate`. Accessible to all roles.

| Method | Path | Query Params | Request Body | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/kpis` | None | None | `{ activeOrders: number, readyToShip: number, runningMachines: number, totalMachines: number, idleMachines: number, downMachines: number, outputToday: number, lowStockCount: number, pendingQC: number }` | `200`, `401` |
| `GET` | `/api/v1/dashboard/monthly-chart` | None | None | Array of `{ month: string ("May"), revenue: number, cost: number, output: number, wages: number }` (last 6 months) | `200`, `401` |
| `GET` | `/api/v1/dashboard/qc-summary` | None | None | `{ passed: number, rework: number, rejected: number, pending: number }` | `200`, `401` |
| `GET` | `/api/v1/dashboard/machine-health` | None | None | `{ running: number, idle: number, maintenance: number, breakdown: number }` | `200`, `401` |
| `GET` | `/api/v1/dashboard/recent-orders` | None | None | Array (top 5) of `{ id, buyer, fabric, colour, targetMetres: number, completedMetres: number, progressPct: number, status, deliveryDate }` | `200`, `401` |
| `GET` | `/api/v1/dashboard/low-stock` | None | None | Array of `{ id, type, colour, quantityKg: number, reorderLevel: number, bin: string, location: string, supplier: string \| null }` | `200`, `401` |

---

### 3.3 Yarn Management Routes ([`backend/src/routes/yarn.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/yarn.ts))

All yarn endpoints require `authenticate`.

| Method | Path | Auth / Role | Query Params | Request Body | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/yarn/stock` | Authenticated | `?type=Cotton`, `?low_stock=true` | None | Array of `{ id, type, colour, quantityKg: number, reorderLevel: number, location: string, lastUpdated: string ("YYYY-MM-DD"), isLowStock: boolean }` | `200`, `401` |
| `GET` | `/api/v1/yarn/stock/alerts` | Authenticated | None | None | Array of `{ id, type, colour, quantityKg, reorderLevel, location, lastUpdated, deficit: number, severity: 'critical' \| 'warning', supplier: string, suppliers: Array<{ id, name, phone, email }> }` | `200`, `401` |
| `PATCH` | `/api/v1/yarn/stock/:id` | `admin`, `manager` | None | `{ quantity_kg?, quantityKg?, reorder_level?, reorderLevel?, location? }` | Updated single YarnStock object | `200`, `400`, `401`, `403`, `404` |
| `GET` | `/api/v1/yarn/receipts` | Authenticated | `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, `?supplier=string` | None | Array of `{ id, date, supplier, supplierName, supplierId, yarnType, colour, quantityKg: number, yarnStockId, forOrderId, receivedBy, invoiceNo, createdAt }` | `200`, `401` |
| `POST` | `/api/v1/yarn/receipts` | `admin`, `manager`, `operator` | None | `{ id?, date?, supplier / supplierName, supplierId?, yarnType, colour, quantityKg, yarnStockId?, forOrderId?, receivedBy?, invoiceNo? }` | Newly created YarnReceipt object (automatically increments target stock balance and sequence) | `201`, `400`, `401`, `403` |

---

### 3.4 Machines & Shopfloor Routes ([`backend/src/routes/machines.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/machines.ts))

All machine endpoints require `authenticate`.

| Method | Path | Auth / Role | Query Params | Request Body | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/machines` | Authenticated | `?type=spinning`, `?status=running` | None | Array of `{ id, name, type, dailyTarget: number, status, currentOrder?: string, currentOrderId: string \| null, operator?: string, progress: number, shift: 'A'\|'B'\|'C', outputToday: number, createdAt }` | `200`, `401` |
| `GET` | `/api/v1/machines/:id` | Authenticated | None | None | Machine object joined with output history array: `outputLogs: Array<{ id, date, metres, updatedAt }>` | `200`, `401`, `404` |
| `POST` | `/api/v1/machines` | `admin`, `manager` | None | `{ id: string, name: string, type: 'spinning'\|'weaving'\|'dyeing', dailyTarget?: number }` | Created Machine object | `201`, `400`, `401`, `403`, `409` |
| `PATCH` | `/api/v1/machines/:id/status` | `admin`, `manager`, `operator` | None | `{ status: 'running'\|'idle'\|'maintenance'\|'breakdown', operator?, shift?, currentOrderId?, progress? }` | Updated Machine status record | `200`, `400`, `401`, `403`, `404` |
| `GET` | `/api/v1/machines/:id/output-log` | Authenticated | `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD` | None | Array of `{ id, machineId, date, metres, updatedAt }` | `200`, `401`, `404` |
| `POST` | `/api/v1/machines/:id/output` | `admin`, `manager`, `operator` | None | `{ date?: string, metres: number }` | Upserted daily output log record | `201`, `400`, `401`, `403`, `404` |

---

### 3.5 Sales Orders Routes ([`backend/src/routes/salesOrders.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/salesOrders.ts))

All sales order endpoints require `authenticate`.

| Method | Path | Auth / Role | Query Params | Request Body | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sales-orders` | Authenticated | `?q=`, `?buyer=`, `?status=`, `?page=1`, `?limit=50` | None | Array of `{ id, buyer, fabricType, colour, quantityMetres: number, completedMetres: number, unitPrice: number, deliveryDate, createdDate, status, machineId, progress: number, value: number, updatedAt }` with `meta: { page, limit, total }` | `200`, `401` |
| `GET` | `/api/v1/sales-orders/:id` | Authenticated | None | None | Single SalesOrder object with joined `machine: { id, name, type }` and `stages: Array<{ key, label, done: boolean, current: boolean }>` | `200`, `401`, `404` |
| `POST` | `/api/v1/sales-orders` | `admin`, `manager` | None | `{ buyer: string, fabricType: string, colour: string, quantityMetres: number, unitPrice: number, deliveryDate: string }` | Created SalesOrder with atomic `ORD-NNNN` sequence ID | `201`, `400`, `401`, `403` |
| `PATCH` | `/api/v1/sales-orders/:id/status` | `admin`, `manager` | None | `{ status: OrderStatus }` | Updated SalesOrder (enforces forward-only transitions; auto-reserves yarn stock when entering `yarn_check`) | `200`, `400`, `401`, `403`, `404` |

---

### 3.6 Production Orders Routes ([`backend/src/routes/productionOrders.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/productionOrders.ts))

All production order endpoints require `authenticate`.

| Method | Path | Auth / Role | Query Params | Request Body | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/production-orders` | Authenticated | `?status=`, `?machine_id=`, `?page=1`, `?limit=50` | None | Array of `{ id, salesOrderId, machineId, machineName, machineType, startDate, expectedEndDate, status, outputMetres: number, targetMetres: number, progress: number, buyer, fabricType, colour, deliveryDate, orderStatus, createdAt, updatedAt }` with `meta: { page, limit, total }` | `200`, `401` |
| `GET` | `/api/v1/production-orders/:id` | Authenticated | None | None | Single joined ProductionOrder record | `200`, `401`, `404` |
| `POST` | `/api/v1/production-orders` | `admin`, `manager` | None | `{ salesOrderId, machineId, startDate, expectedEndDate, targetMetres, status? }` | Created ProductionOrder | `201`, `400`, `401`, `403` |
| `PATCH` | `/api/v1/production-orders/:id` | `admin`, `manager`, `operator` | None | `{ status?: 'queued'\|'in_progress'\|'paused'\|'completed', outputMetres?: number }` | Updated ProductionOrder | `200`, `400`, `401`, `403`, `404` |

---

### 3.7 Fabric Rolls & QC Routes ([`backend/src/routes/fabricRolls.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/fabricRolls.ts))

All fabric roll endpoints require `authenticate`.

| Method | Path | Auth / Role | Query Params | Request Body | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/fabric-rolls/pending` | Authenticated | None | None | Array of pending rolls joined with buyer and machine | `200`, `401` |
| `GET` | `/api/v1/fabric-rolls/stats` | Authenticated | None | None | `{ totalRolls, totalMetres, passedCount, rejectedCount, reworkCount, pendingCount, passRate, rejectionRate }` | `200`, `401` |
| `GET` | `/api/v1/fabric-rolls` | Authenticated | `?order_id=`, `?qc_result=`, `?machine_id=`, `?page=1`, `?limit=50` | None | Array of `{ id, orderId, buyer, machineId, machineName, machineType, metres: number, producedDate, qcResult, defects: string[], checkedBy, checkedAt, createdAt }` with `meta` | `200`, `401` |
| `GET` | `/api/v1/fabric-rolls/:id` | Authenticated | None | None | Single FabricRoll detail record | `200`, `401`, `404` |
| `POST` | `/api/v1/fabric-rolls` | `admin`, `manager`, `operator`, `qc_inspector` | None | `{ orderId: string, machineId: string, metres: number, producedDate?: string }` | Created FabricRoll (generates `FR-NNNN` sequence ID) | `201`, `400`, `401`, `403`, `404` |
| `PATCH` | `/api/v1/fabric-rolls/:id/qc` | `admin`, `manager`, `qc_inspector` | None | `{ qc_result: 'passed'\|'rework'\|'rejected', checked_by: string, defects?: string[] }` | Updated FabricRoll (advances `completedMetres` on SalesOrder if passed) | `200`, `400`, `401`, `403`, `404` |

---

### 3.8 Dispatches Routes ([`backend/src/routes/dispatches.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/dispatches.ts))

All dispatch endpoints require `authenticate`.

| Method | Path | Auth / Role | Query Params | Request Body | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dispatches` | Authenticated | `?status=`, `?order_id=`, `?page=1`, `?limit=50` | None | Array of `{ id, orderId, buyer, rollIds: string[], totalMetres: number, dispatchDate, invoiceNo, truckNo, status, createdAt, updatedAt }` with `meta` | `200`, `401` |
| `GET` | `/api/v1/dispatches/:id` | Authenticated | None | None | Single Dispatch object joined with `rolls: Array<{ rollId, metres, producedDate, qcResult }>` | `200`, `401`, `404` |
| `POST` | `/api/v1/dispatches` | `admin`, `manager` | None | `{ orderId: string, dispatchDate: string, truckNo: string, invoiceNo: string, rollIds?: string[] }` | Atomic transaction: checks `ready_to_ship`, auto-selects passed rolls if `rollIds` omitted, generates `DSP-NNN`, updates order to `dispatched` | `201`, `400`, `401`, `403`, `404` |
| `PATCH` | `/api/v1/dispatches/:id/status` | `admin`, `manager` | None | `{ status: 'prepared'\|'loaded'\|'delivered' }` | Updated Dispatch object | `200`, `400`, `401`, `403`, `404` |

---

### 3.9 Reports Routes ([`backend/src/routes/reports.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/reports.ts))

All reports endpoints require `authenticate`.

| Method | Path | Auth / Role | Query Params | Request Body | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/order-costs` | Authenticated | `?order_id=ORD-XXXX` | None | Array of `{ orderId, buyer, yarnCost: number, labourCost: number, machineCost: number, totalCost: number, revenue: number, profit: number, marginPct: number, updatedAt }` | `200`, `401` |
| `PUT` | `/api/v1/reports/order-costs/:order_id` | `admin`, `manager` | None | `{ yarnCost: number, labourCost: number, machineCost: number, revenue: number, buyer?: string }` | Upserted OrderCost record with computed financials | `200`, `400`, `401`, `403`, `404` |
| `GET` | `/api/v1/reports/machine-performance` | Authenticated | None | None | Array of `{ id, name, type, status, currentOrder: string \| null, operator: string \| null, outputToday: number, target: number, efficiencyPct: number }` | `200`, `401` |
| `GET` | `/api/v1/reports/monthly` | Authenticated | `?year=2026`, `?month=10` | None | Array of `{ id, year: number, month: number, revenue: number, cost: number, outputMetres: number, wages: number, grossProfit: number, marginPct: number, createdAt }` | `200`, `400`, `401` |
| `PUT` | `/api/v1/reports/monthly/:year/:month` | `admin`, `manager` | None | `{ revenue: number, cost: number, outputMetres: number, wages?: number }` | Upserted MonthlySnapshot record with computed `grossProfit` and `marginPct` | `200`, `400`, `401`, `403` |

---

### 3.10 Forecast Routes ([`backend/src/routes/forecast.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/forecast.ts))

Publicly accessible (no authentication required).

| Method | Path | Auth / Role | Query / Body Params | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` or `GET` | `/api/v1/forecast` & `/api/forecast` | Public | `{ startMonthNum?: number (1-12), lastRevenue?: number, horizon?: number (1-24) }` | `{ forecast: Array<{ monthNum: number, monthName: string, predictedRevenue: number }>, initialLagRevenue: number, startMonthNum: number, horizon: number }` | `200`, `400` |

---

### 3.11 Suppliers Routes ([`backend/src/routes/suppliers.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/routes/suppliers.ts))

All suppliers endpoints require `authenticate`.

| Method | Path | Auth / Role | Request Body | Response Shape (`data`) | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/suppliers` | Authenticated | None | Array of `{ id, name, phone, email, notes, yarnTypes: string[], createdAt }` | `200`, `401` |
| `POST` | `/api/v1/suppliers` | `admin`, `manager` | `{ name, phone?, email?, notes?, yarnTypes?: string[] }` | Created Supplier record | `201`, `400`, `401`, `403` |
| `PATCH` | `/api/v1/suppliers/:id` | `admin`, `manager` | `{ name?, phone?, email?, notes?, yarnTypes?: string[] }` | Updated Supplier record | `200`, `400`, `401`, `403`, `404` |

---

## 4. Database Schema Entities & Storage Representations

Referenced from [`backend/src/db/schema.ts`](file:///home/bow/projects/Everest-Textile-Mills/backend/src/db/schema.ts):

| Table Name | Primary Key | Key Columns & Types | Enums / Constraints |
| :--- | :--- | :--- | :--- |
| `users` | `id` (UUID) | `name` (varchar), `email` (varchar, unique), `passwordHash` (varchar), `role` | `user_role`: admin, manager, operator, qc_inspector, viewer |
| `machines` | `id` (varchar 10) | `name` (varchar), `type`, `dailyTarget` (int default 500) | `machine_type`: spinning, weaving, dyeing |
| `machine_status_log` | `id` (UUID) | `machineId` (FK), `status`, `operator` (varchar), `shift`, `currentOrderId` (varchar), `progress` (smallint 0-100), `recordedAt` (timestamptz) | `machine_status`: running, idle, maintenance, breakdown; `machine_shift`: A, B, C |
| `machine_output_log`| `id` (UUID) | `machineId` (FK), `date` (date), `metres` (int) | Unique constraint on `(machineId, date)` |
| `suppliers` | `id` (UUID) | `name` (varchar), `phone` (varchar), `email` (varchar), `notes` (text) | |
| `yarn_type_suppliers`| Composite | `yarnType`, `supplierId` (FK) | Unique on `(yarnType, supplierId)` |
| `yarn_stock` | `id` (varchar 20) | `type`, `colour` (varchar), `quantityKg` (numeric 10,2), `reorderLevel` (numeric 10,2), `location` (varchar), `lastUpdated` (timestamptz) | `yarn_type`: Cotton, Polyester, Wool, Silk, Blended |
| `yarn_receipts` | `id` (varchar 30) | `date` (date), `supplierId` (UUID FK), `supplierName` (varchar), `yarnType`, `colour`, `quantityKg` (numeric), `yarnStockId` (FK), `forOrderId` (FK), `receivedBy`, `invoiceNo` | |
| `sales_orders` | `id` (varchar 20) | `buyer` (varchar), `fabricType` (varchar), `colour` (varchar), `quantityMetres` (numeric), `unitPrice` (numeric), `deliveryDate` (date), `createdDate` (date), `status`, `machineId` (FK), `completedMetres` (numeric) | `order_status`: pending, yarn_check, spinning, weaving, dyeing, quality_check, ready_to_ship, dispatched |
| `production_orders`| `id` (UUID) | `salesOrderId` (FK, unique), `machineId` (FK), `startDate` (date), `expectedEndDate` (date), `status`, `outputMetres` (numeric), `targetMetres` (numeric) | `production_status`: queued, in_progress, paused, completed |
| `fabric_rolls` | `id` (varchar 20) | `orderId` (FK), `machineId` (FK), `metres` (numeric), `producedDate` (date), `qcResult`, `defects` (jsonb string array), `checkedBy`, `checkedAt` | `qc_result`: passed, rework, rejected, pending |
| `dispatches` | `id` (varchar 20) | `orderId` (FK), `buyer` (varchar), `totalMetres` (numeric), `dispatchDate` (date), `invoiceNo`, `truckNo`, `status` | `dispatch_status`: prepared, loaded, delivered |
| `dispatch_rolls` | Composite | `dispatchId` (FK), `rollId` (FK) | Unique on `(dispatchId, rollId)` |
| `order_costs` | `orderId` (FK) | `buyer`, `yarnCost` (numeric), `labourCost` (numeric), `machineCost` (numeric), `revenue` (numeric) | Financial computations performed in queries |
| `monthly_snapshots`| `id` (UUID) | `year` (smallint), `month` (smallint 1-12), `revenue` (numeric), `cost` (numeric), `outputMetres` (numeric), `wages` (numeric) | Unique on `(year, month)` |

---

## 5. Pagination, Sorting & Filtering Conventions

- **Paginated Endpoints:**
  - `sales-orders`: query params `page` (default 1), `limit` (default 50, max 200). Sort: `createdDate DESC, id DESC`.
  - `production-orders`: query params `page` (default 1), `limit` (default 50). Sort: natural insertion.
  - `fabric-rolls`: query params `page` (default 1), `limit` (default 50). Sort: `producedDate DESC, id DESC`.
  - `dispatches`: query params `page` (default 1), `limit` (default 50). Sort: `dispatchDate DESC, id DESC`.
- **Unpaginated Endpoints (Full Collection Return):**
  - `machines`: ordered by `id ASC`.
  - `yarn/stock`: ordered by `id ASC`.
  - `yarn/receipts`: ordered by `date DESC, createdAt DESC`.
  - `reports/order-costs`: ordered by `orderId ASC`.
  - `reports/machine-performance`: ordered by machine `id ASC`.
  - `reports/monthly`: ordered by `year DESC, month DESC`.
  - `dashboard/*`: all return specialized consolidated aggregates.
