# Everest Textile Mills — Frontend Documentation

> **Source of truth for the API contract.**
> Everything here is derived directly from code. File paths cited inline.

---

## 1. App Structure & Routes

**Framework:** React 18 + React Router v6 + Vite + Tailwind CSS
**Entry:** `frontend/src/main.tsx` → `App.tsx` → `AppLayout` (sidebar + topbar shell)

```
/dashboard                              → Dashboard
/production/machines                    → Machines
/production/orders                      → ProductionOrders
/production/shopfloor                   → ShopFloorBoard
/yarn/receipts                          → YarnReceipts
/yarn/stock                             → RawMaterialStock
/yarn/alerts                            → LowStockAlerts
/quality/checks                         → QualityChecks
/quality/rolls                          → FabricRolls
/quality/pending                        → PendingInspection
/sales/orders                           → SalesOrders
/sales/status                           → OrderStatus
/sales/finished                         → FinishedGoods
/sales/dispatches                       → Dispatches
/reports/costing                        → OrderCosting
/reports/machines                       → MachinePerformance
/reports/monthly                        → MonthlySummary
/ (root)                                → redirect to /dashboard
* (fallback)                            → redirect to /dashboard
```

**Navigation sections** (Sidebar.tsx):
- Dashboard (top-level)
- Yarn Management → Receipts, Stock, Alerts
- Production → Machines, Production Orders, Shop Floor Board
- Quality Control → Quality Checks, Fabric Rolls, Pending Inspection
- Sales & Dispatch → Sales Orders, Order Status, Finished Goods, Dispatches
- Reports → Order Costing, Machine Performance, Monthly Summary

---

## 2. Entities, Fields & Types

All types are in `frontend/src/types/index.ts`. Mock data in `frontend/src/data/mockData.ts`.

### 2.1 Machine

```ts
// types/index.ts:2-15
interface Machine {
  id: string;           // e.g. "SP-01", "WV-03", "DY-02"
  name: string;         // e.g. "Spinner Alpha"
  type: MachineType;    // 'spinning' | 'weaving' | 'dyeing'
  status: MachineStatus;// 'running' | 'idle' | 'maintenance' | 'breakdown'
  currentOrder?: string;// nullable FK → SalesOrder.id (e.g. "ORD-1042")
  operator?: string;    // nullable free text (staff name)
  progress: number;     // 0-100 integer; order completion % on this machine
  outputToday: number;  // metres produced today
  shift: 'A' | 'B' | 'C';
}
```

**Mock sample (9 machines):** SP-01..03, WV-01..03, DY-01..03

### 2.2 YarnStock

```ts
// types/index.ts:20-28
interface YarnStock {
  id: string;           // e.g. "YS-001"
  type: YarnType;       // 'Cotton' | 'Polyester' | 'Wool' | 'Silk' | 'Blended'
  colour: string;       // free text
  quantityKg: number;   // current stock in kg
  reorderLevel: number; // threshold in kg; triggers low-stock alert
  location: string;     // warehouse bay, e.g. "Bay A-1"
  lastUpdated: string;  // ISO date string
}
```

**Mock sample (8 items):** various types and colours.

**Derived rules the UI uses:**
- `isLow = quantityKg <= reorderLevel` → amber highlight + alert
- `isCritical = quantityKg <= reorderLevel * 0.4` → red highlight
- `stockLevelPct = Math.min(100, Math.round((quantityKg / (reorderLevel * 4)) * 100))` — the denominator (`reorderLevel * 4`) is a UI-only heuristic to scale the progress bar; the 4x factor is not stored anywhere.

### 2.3 YarnReceipt

```ts
// types/index.ts:30-40
interface YarnReceipt {
  id: string;           // e.g. "YR-2026-088"
  date: string;         // ISO date
  supplier: string;     // free text
  yarnType: YarnType;
  colour: string;
  quantityKg: number;
  forOrderId: string;   // FK → SalesOrder.id (not enforced in UI)
  receivedBy: string;   // staff name
  invoiceNo: string;    // e.g. "SY-INV-4421"
}
```

**Mock sample (5 receipts).**

**Gap:** No link back to a YarnStock record. The UI implies receiving yarn increases stock, but there is no mechanism shown.

### 2.4 SalesOrder

```ts
// types/index.ts:43-65
type OrderStatus =
  | 'pending' | 'yarn_check' | 'spinning' | 'weaving'
  | 'dyeing' | 'quality_check' | 'ready_to_ship' | 'dispatched';

interface SalesOrder {
  id: string;             // e.g. "ORD-1042"
  buyer: string;          // company name
  fabricType: string;     // free text, e.g. "Cotton Twill"
  colour: string;
  quantityMetres: number; // total ordered metres
  deliveryDate: string;   // ISO date
  createdDate: string;    // ISO date
  status: OrderStatus;
  machineId?: string;     // nullable FK → Machine.id (null after completion)
  completedMetres: number;// metres produced so far
  unitPrice: number;      // ₹ per metre
}
```

**Mock sample (8 orders):** statuses span full pipeline from spinning → dispatched.

**Derived values the UI computes:**
- `progress% = Math.round((completedMetres / quantityMetres) * 100)`
- `orderValue = quantityMetres * unitPrice`
- `estimatedRevenue = sum(all orders: quantityMetres * unitPrice)`
- Active = status not in `['dispatched']`
- In-production = status in `['spinning', 'weaving', 'dyeing']`

### 2.5 ProductionOrder *(type only — no mock data)*

```ts
// types/index.ts:68-77
interface ProductionOrder {
  id: string;
  salesOrderId: string;   // FK → SalesOrder.id
  machineId: string;      // FK → Machine.id
  startDate: string;
  expectedEndDate: string;
  status: 'queued' | 'in_progress' | 'paused' | 'completed';
  outputMetres: number;
  targetMetres: number;
}
```

**Gap:** This type is defined but **no `ProductionOrder` mock data exists**. The Production Orders page (`ProductionOrders.tsx`) instead filters `salesOrders` with `status ∈ {spinning, weaving, dyeing}` and renders `SalesOrder` fields augmented with the linked machine. The `ProductionOrder` entity is intended but unused in the mock layer.

### 2.6 FabricRoll

```ts
// types/index.ts:80-92
type QCResult = 'passed' | 'rework' | 'rejected' | 'pending';

interface FabricRoll {
  id: string;           // e.g. "FR-5501"
  orderId: string;      // FK → SalesOrder.id
  machineId: string;    // FK → Machine.id
  metres: number;       // metres in this roll
  producedDate: string; // ISO date
  qcResult: QCResult;
  defects?: string[];   // array of defect descriptions (null if no defects)
  checkedBy?: string;   // nullable staff name
  checkedAt?: string;   // nullable datetime string "YYYY-MM-DD HH:MM"
}
```

**Mock sample (10 rolls):** 3 pending, 5 passed, 1 rework, 1 rejected.

**Derived values:**
- `passRate = passed / (total - pending) * 100`
- `rejectionRate = rejected / (total - pending) * 100`

### 2.7 Dispatch

```ts
// types/index.ts:95-105
interface Dispatch {
  id: string;             // e.g. "DSP-301"
  orderId: string;        // FK → SalesOrder.id
  buyer: string;          // denormalized from SalesOrder
  rollIds: string[];      // array of FabricRoll.id
  totalMetres: number;    // sum of roll metres (denormalized)
  dispatchDate: string;   // ISO date
  invoiceNo: string;      // e.g. "ETM-INV-1025"
  truckNo: string;        // vehicle registration
  status: 'prepared' | 'loaded' | 'delivered';
}
```

**Mock sample (2 dispatches):** DSP-301 (delivered), DSP-302 (prepared).

**Note:** `buyer` and `totalMetres` are denormalized — they repeat data from SalesOrder and FabricRoll respectively.

### 2.8 OrderCost

```ts
// types/index.ts:108-117
interface OrderCost {
  orderId: string;    // FK → SalesOrder.id
  buyer: string;      // denormalized
  yarnCost: number;   // ₹
  labourCost: number; // ₹
  machineCost: number;// ₹
  totalCost: number;  // = yarnCost + labourCost + machineCost
  revenue: number;    // ₹ (NOT necessarily quantityMetres * unitPrice — differs in mock)
  profit: number;     // = revenue - totalCost
}
```

**Mock sample (5 orders):** Only covers completed/near-complete orders.

**Gap:** `revenue` in `OrderCost` differs from `quantityMetres * unitPrice` in `SalesOrder` (e.g. ORD-1038: 8000m × ₹95 = ₹760,000 matches; ORD-1040: 2000m × ₹130 = ₹260,000 matches). The mock appears consistent but the calculation source is not explicit.

**Gap:** `totalCost` should equal `yarnCost + labourCost + machineCost`. In mock data this holds exactly. The UI does not recompute it — it trusts the stored value.

### 2.9 MonthlyData *(anonymous, no named type)*

```ts
// mockData.ts:82-89
{ month: string; revenue: number; cost: number; output: number }[]
```

6 months of data (May–Oct 2026). No named type. Used by Dashboard (area chart) and MonthlySummary (composed chart + P&L).

### 2.10 MachineOutputData *(derived, no named type)*

```ts
// mockData.ts:91-95
machines.map(m => ({ name: m.id, output: m.outputToday, target: 500 }))
```

Target is hardcoded `500` metres per machine per day across the codebase.

---

## 3. Pages — Detail

### 3.1 Dashboard (`/dashboard`)

**Source:** `pages/dashboard/Dashboard.tsx`

| Section | Data shown | Derivations |
|---|---|---|
| KPI Strip | Active Orders, Machines Running, Output Today, Low Stock Alerts | All computed from raw arrays |
| Revenue vs Cost chart | `monthlyData` area chart (last 6 months) | Recharts AreaChart |
| QC Summary panel | Counts by QCResult | Filter on fabricRolls |
| Machine Health panel | Counts by MachineStatus | Filter on machines |
| Live Order Pipeline table | `salesOrders.slice(0, 5)` with progress bar | progress% computed |
| Low-stock banner | Shown only if lowStock > 0 | Lists yarn names inline |

**User actions:** Navigate to `/quality/checks`, `/production/shopfloor`, `/sales/orders`, `/yarn/alerts` via buttons.

**KPI formulas:**
```
runningMachines = machines where status === 'running'
idleMachines    = machines where status === 'idle'
downMachines    = machines where status in ['breakdown','maintenance']
lowStock        = yarnStock where quantityKg <= reorderLevel
activeOrders    = salesOrders where status !== 'dispatched'
readyToShip     = salesOrders where status === 'ready_to_ship'
pendingQC       = fabricRolls where qcResult === 'pending'
totalOutputToday= sum(machines.outputToday)
```

---

### 3.2 Shop Floor Board (`/production/shopfloor`)

**Source:** `pages/shopfloor/ShopFloorBoard.tsx`

- **Display:** Card grid of all machines (1–3 columns responsive).
- **Filters:** Type (all / spinning / weaving / dyeing) + Status (all / running / idle / maintenance / breakdown) — click-to-toggle on status summary buttons.
- **Per card:** name, id, status badge, type badge, current order id, shift, operator, progress bar (running only), outputToday.
- **No write actions** in this view.

---

### 3.3 Machines (`/production/machines`)

**Source:** `pages/shopfloor/Machines.tsx`

- **Display:** Table of all machines. Columns: ID, Name, Type, Status, Order, Operator, Shift, Progress bar, Output Today.
- **Actions:** "+ Add Machine" button (no form shown — stub).
- **No filtering or sorting** (pure list).

---

### 3.4 Production Orders (`/production/orders`)

**Source:** `pages/shopfloor/ProductionOrders.tsx`

- **Display:** Table of `salesOrders` filtered to `status ∈ {spinning, weaving, dyeing}`.
- **Columns:** Order ID, Buyer, Fabric·Colour, Machine (id + name from join), Target (m), Completed (m), Progress%, Status, Delivery.
- **Actions:** "+ New Production Order" button (no form — stub).
- **Note:** Uses `SalesOrder`, not `ProductionOrder`. Machine join is done by `machineId` on the sales order.

---

### 3.5 Yarn Receipts (`/yarn/receipts`)

**Source:** `pages/yarn/YarnReceipts.tsx`

- **Display:** Table of yarnReceipts. Columns: Receipt ID, Date, Supplier, Yarn Type, Colour, Qty (kg), For Order, Invoice, Received By.
- **Actions:** "+ Record Receipt" button → inline form with fields: Date, Supplier, Yarn Type (dropdown), Colour, Quantity (kg), For Order ID, Invoice No., Received By → "Save Receipt" or Cancel. **Form is UI-only; no API call exists.**

---

### 3.6 Raw Material Stock (`/yarn/stock`)

**Source:** `pages/yarn/RawMaterialStock.tsx`

- **Display:** KPI cards (Total Stock kg, Yarn Types count, Low Stock count) + table.
- **Table columns:** ID, Type, Colour, Stock (kg), Reorder Level, Stock Level (progress bar), Location, Last Updated.
- **Stock level bar:** `pct = min(100, round(quantityKg / (reorderLevel*4) * 100))` — visual-only heuristic.
- **Highlights:** `isLow` → amber row tint; `isCritical` → red text.
- **No write actions.**

---

### 3.7 Low Stock Alerts (`/yarn/alerts`)

**Source:** `pages/yarn/LowStockAlerts.tsx`

- **Display:** Shows only low-stock items. KPI (Critical count, Warning count). Per-alert card with: yarn id, colour, type, location, current kg, reorder level, deficit, supplier contact.
- **Severity:** Critical = quantityKg ≤ reorderLevel × 0.4; Warning = quantityKg > reorderLevel × 0.4 (but still ≤ reorderLevel).
- **Supplier mapping:** Hardcoded in component (Cotton/Polyester/Wool/Silk/Blended → fixed supplier strings). **Gap:** Supplier-yarn mapping belongs in data/DB, not component code.
- **Actions:** "Raise PO" button per alert (stub — no action).

---

### 3.8 Quality Checks (`/quality/checks`)

**Source:** `pages/quality/QualityChecks.tsx`

- **Display:** Filterable table of `fabricRolls`. Filter tabs: All, Passed, Rework, Rejected, Pending (with counts).
- **Columns:** Roll ID, Order, Buyer (joined), Machine id + name (joined), Metres, Produced date, Defects (tag array), Checked By, Checked At, Result (StatusBadge).
- **Actions:** "+ Log Check" button (stub).

---

### 3.9 Fabric Rolls (`/quality/rolls`)

**Source:** `pages/quality/FabricRolls.tsx`

- **Display:** KPI cards (Total Rolls, Total Metres, Pass Rate%, Rejection Rate%) + traceability list.
- **Traceability row:** Roll ID → Order → Buyer → Machine → Machine Type → Metres → QC result badge + produced date + checked by + defects.
- **No filtering. No write actions.**

---

### 3.10 Pending Inspection (`/quality/pending`)

**Source:** `pages/quality/PendingInspection.tsx`

- **Display:** Banner with count + cards for each roll where `qcResult === 'pending'`.
- **Per card:** Roll ID, Order, Buyer, Machine, Type, Metres, Produced date.
- **Actions:** **Pass**, **Rework**, **Reject** buttons per roll. These are the only write-action buttons in the quality section. **Currently stubs (no API call).**
- **This is the primary QC workflow entry point.**

---

### 3.11 Sales Orders (`/sales/orders`)

**Source:** `pages/sales/SalesOrders.tsx`

- **Display:** KPI (Total Orders, Active, Ready to Ship, Est. Revenue) + search + table.
- **Search:** Real-time filter by buyer, order ID, or fabric type.
- **Columns:** Order ID, Buyer, Fabric·Colour, Qty (m), Unit ₹, Value (computed), Delivery, Progress bar, Status.
- **Actions:** "+ New Order" → inline form with: Buyer Name, Fabric Type, Colour, Quantity (m), Unit Price (₹/m), Delivery Date → "Create Order". **Stub — no API.**

---

### 3.12 Order Status (`/sales/status`)

**Source:** `pages/sales/OrderStatus.tsx`

- **Display:** Search box (by order ID or buyer) → per-order pipeline stepper.
- **Stepper stages (in order):** pending → yarn_check → spinning → weaving → dyeing → quality_check → ready_to_ship → dispatched.
- **Per card:** Order ID, buyer, fabric, quantity, delivery, active machine, completion %.
- **No write actions.** Read-only tracker.

---

### 3.13 Finished Goods (`/sales/finished`)

**Source:** `pages/sales/FinishedGoods.tsx`

- **Display:** KPI (Finished Stock m, Passed QC Rolls count + total m, Awaiting Dispatch orders) + table.
- **Filter:** `salesOrders` where `status ∈ {quality_check, ready_to_ship, dispatched}`.
- **Columns:** Order ID, Buyer, Fabric, Colour, Completed (m), QC Rolls (count of passed rolls for this order), Status, Delivery.
- **"QC Rolls"** = count of `fabricRolls` where `orderId === order.id && qcResult === 'passed'`.
- **No write actions.**

---

### 3.14 Dispatches (`/sales/dispatches`)

**Source:** `pages/sales/Dispatches.tsx`

- **Display:** KPI (Total Dispatches, Delivered, Ready to Dispatch) + form toggle + table.
- **New Dispatch form fields:** Order ID (dropdown — only `ready_to_ship` orders), Dispatch Date, Truck/Vehicle No., Invoice No., Total Metres → "Confirm Dispatch". **Stub.**
- **Table columns:** Dispatch ID, Order, Buyer, Rolls (count of rollIds), Metres, Date, Invoice, Truck No., Status.

---

### 3.15 Order Costing (`/reports/costing`)

**Source:** `pages/reports/OrderCosting.tsx`

- **Display:** KPI (Total Revenue, Total Cost, Total Profit, Avg Margin%) + bar chart (Revenue/Cost/Profit per order) + breakdown table.
- **Table columns:** Order ID, Buyer, Yarn Cost, Labour Cost, Machine Cost, Total Cost, Revenue, Profit, Margin%.
- **Margin** = `round(profit / revenue * 100)` — visual indicator (TrendingUp if >50%, else TrendingDown).
- **No write actions.**

---

### 3.16 Machine Performance (`/reports/machines`)

**Source:** `pages/reports/MachinePerformance.tsx`

- **Hardcoded target:** `TARGET = 500` metres/machine/day.
- **Display:** KPI (Total Output Today, Machines Running x/y, Fleet Efficiency%, Daily Target m) + output bar chart with reference line at 500m + detail table.
- **Fleet Efficiency** = `totalOutput / (machineCount × 500) × 100`.
- **Per-machine efficiency** = `outputToday / 500 × 100`.
- **No write actions.**

---

### 3.17 Monthly Summary (`/reports/monthly`)

**Source:** `pages/reports/MonthlySummary.tsx`

- **Display:** Current month header (Oct 2026) + MoM revenue growth vs Sep + KPI cards + 6-month composed chart (revenue bars, cost bars, output line) + cost breakdown + P&L summary.
- **Hardcoded values:** "October 2026" as current month label; `totalWages = 385000` (₹) hardcoded in component.
- **Cost breakdown:** Raw Material (from `orderCosts.yarnCost` sum), Worker Wages (₹385,000 hardcoded), Machine & Overhead (residual from `monthlyData.cost`).
- **P&L:** Uses `monthlyData[last]` for revenue/cost; net profit = `revenue - cost`.
- **No write actions.**

---

## 4. Implicit Rules & Derived Values

| Rule | Where used | Expression |
|---|---|---|
| Low stock threshold | RawMaterialStock, LowStockAlerts, Dashboard | `quantityKg <= reorderLevel` |
| Critical stock threshold | LowStockAlerts, RawMaterialStock | `quantityKg <= reorderLevel * 0.4` |
| Stock level bar denominator | RawMaterialStock | `reorderLevel * 4` (heuristic, not stored) |
| Order progress % | Dashboard, SalesOrders, OrderStatus, ProductionOrders | `completedMetres / quantityMetres * 100` |
| Order value | SalesOrders | `quantityMetres * unitPrice` |
| Order active | Dashboard, SalesOrders | `status !== 'dispatched'` |
| In-production filter | ProductionOrders | `status ∈ {spinning, weaving, dyeing}` |
| In finished goods | FinishedGoods | `status ∈ {quality_check, ready_to_ship, dispatched}` |
| QC pass rate | FabricRolls | `passed / (total − pending) * 100` |
| QC rejection rate | FabricRolls | `rejected / (total − pending) * 100` |
| Machine efficiency | MachinePerformance | `outputToday / 500 * 100` |
| Fleet efficiency | MachinePerformance | `totalOutput / (count × 500) * 100` |
| Margin % | OrderCosting | `profit / revenue * 100` |
| MoM revenue growth | MonthlySummary | `(latest.revenue − prev.revenue) / prev.revenue * 100` |
| Dispatch eligibility | Dispatches | Only orders with `status === 'ready_to_ship'` appear in dropdown |
| Pending QC rolls | PendingInspection, Dashboard | `qcResult === 'pending'` |

---

## 5. All Status Enums

```
MachineStatus:   running | idle | maintenance | breakdown
MachineType:     spinning | weaving | dyeing
MachineShift:    A | B | C
YarnType:        Cotton | Polyester | Wool | Silk | Blended
OrderStatus:     pending | yarn_check | spinning | weaving | dyeing
                 | quality_check | ready_to_ship | dispatched
QCResult:        passed | rework | rejected | pending
ProductionStatus:queued | in_progress | paused | completed  (type only)
DispatchStatus:  prepared | loaded | delivered
```

---

## 6. Gaps & Ambiguities

| # | Gap | Impact |
|---|---|---|
| G1 | **YarnReceipt → YarnStock link missing.** Receiving yarn should increase stock, but no update mechanism is shown. | Backend must handle this transactionally. |
| G2 | **ProductionOrder has a type but no mock data.** The Production Orders page uses SalesOrder instead. | Decide: is ProductionOrder a separate table or an alias for SalesOrder stages? I assume it becomes a first-class table. |
| G3 | **Supplier–yarn mapping is hardcoded** in LowStockAlerts.tsx (5 type→supplier strings). | Needs a `suppliers` table linked to `yarn_stock`. |
| G4 | **`totalWages = 385000`** hardcoded in MonthlySummary. | Monthly wage totals need a table or config entry. |
| G5 | **`TARGET = 500` m/machine/day** hardcoded in MachinePerformance. | Should be a per-machine or global config value stored in DB. |
| G6 | **`revenue` in OrderCost** vs `quantityMetres * unitPrice` may diverge for partial deliveries. | The backend should clarify: revenue = billed amount (could differ from unit price × quantity). |
| G7 | **Dispatch form doesn't select roll IDs explicitly** — only orderId + totalMetres. But `Dispatch.rollIds` is an array. | Backend must infer rollIds from order's passed QC rolls, or the form needs a roll-picker (frontend change). |
| G8 | **No authentication.** The UI has no login page, no user concept, no role-based visibility. | Backend must add auth; frontend will need a login page. |
| G9 | **MonthlyData has no named type** and is a static array. | It becomes an aggregated query result — no direct table needed. |
| G10 | **`orderCosts.revenue`** is stored separately from the order's computed revenue. | Either store it (as a financial record) or compute it on-the-fly from `completedMetres × unitPrice`. |
| G11 | **`Dispatch.buyer`** and **`Dispatch.totalMetres`** are denormalized. | Backend returns denormalized shape (join at query time); no need to store twice. |
| G12 | **No pagination/sorting** on any table. | Backend should add `limit/offset` + sort params from the start. |
