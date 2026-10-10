# Frontend Data Audit — Everest Textile Mills ERP

**Audit Date:** 2026-10-10  
**Codebase:** `frontend/src`  
**Framework / Stack:** React 18, Vite, TypeScript, TailwindCSS, Recharts, Lucide Icons  

---

## 1. Overview & Architectural Assumptions

### Data Sources & State Strategy
- **Mock Data Layer:** Nearly all pages currently import in-memory static arrays directly from [`frontend/src/data/mockData.ts`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/data/mockData.ts).
- **Local Mutability:** Write operations (e.g., in [`YarnInspection.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/yarn/YarnInspection.tsx) and [`PendingInspection.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/quality/PendingInspection.tsx)) mutate local component state (`useState`) without persisting anywhere. Other forms (e.g., [`SalesOrders.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/sales/SalesOrders.tsx), [`Dispatches.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/sales/Dispatches.tsx), [`YarnReceipts.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/yarn/YarnReceipts.tsx)) render inputs and buttons but have no `onSubmit` handlers or state bindings attached.
- **Client-Side Pagination & Filtering:** Handled locally via [`frontend/src/hooks/usePagination.ts`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/hooks/usePagination.ts) (which slices array data in memory and synchronizes `page` and `limit` URL query parameters) and [`frontend/src/hooks/useDebounce.ts`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/hooks/useDebounce.ts).
- **Authentication & Session:** The frontend currently has **no authentication flow**, no login page, no token storage (`localStorage` / cookies), and no request interceptor. TopBar hardcodes "Shift Supervisor · Mill Floor A".
- **Only Active Network Service:** [`frontend/src/services/forecastApi.ts`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/services/forecastApi.ts) connects via `fetch` to `POST /api/v1/forecast`, defaulting to base URL `http://localhost:3001` with fallback static data.

---

## 2. Page & Component Data Inventory

Below is the complete audit of every page and layout component across the frontend application.

| Page / Component | File Path | Data Read | Data Written / Sent | Source / Origin | Loading / Empty / Error States |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TopBar** | [`TopBar.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/components/layout/TopBar.tsx) | `yarnStock` | Local `readIds` (Set in `useState`) | `mockData.ts` (filters `quantityKg <= reorderLevel`) | Empty state: "All yarn stock levels are healthy." |
| **Dashboard** | [`Dashboard.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/dashboard/Dashboard.tsx) | `machines`, `salesOrders`, `yarnStock`, `fabricRolls`, `monthlyData`, Forecast API | None (View-only) | `mockData.ts` + `forecastApi.ts` | `loadingForecast` boolean state. Fallback values inside `forecastApi.ts`. |
| **Yarn Receipts** | [`YarnReceipts.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/yarn/YarnReceipts.tsx) | `yarnReceipts` | Form inputs for new consignment (unwired button) | `mockData.ts`, `usePagination` | No empty state handled if receipts array is empty. |
| **Raw Material Stock** | [`RawMaterialStock.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/yarn/RawMaterialStock.tsx) | `yarnStock` | None (View-only) | `mockData.ts`, `usePagination` | No empty state handled. |
| **Low Stock Alerts** | [`LowStockAlerts.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/yarn/LowStockAlerts.tsx) | `yarnStock`, hardcoded supplier map | "Raise PO" action button (unwired) | `mockData.ts`, constant `suppliers` object | Handled: "All yarn stock levels are healthy" empty card. |
| **Yarn Inspection** | [`YarnInspection.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/yarn/YarnInspection.tsx) | `yarnInspections` | Accept/Reject verdict updates | `mockData.ts` into local `records` `useState` | Handled: "No records in this category." modal for reject reason. |
| **Machine Fleet** | [`Machines.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/shopfloor/Machines.tsx) | `machines` | "Add Machine Unit" button (unwired) | `mockData.ts`, `usePagination`, `useDebounce` | Handled: "No machines match the current filters" empty state. |
| **Production Orders** | [`ProductionOrders.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/shopfloor/ProductionOrders.tsx) | `salesOrders` (filtered to spinning/weaving/dyeing), `machines` | "New Production Order" button (unwired) | `mockData.ts`, `usePagination`, `useDebounce` | Handled: "No production orders match the current filters" empty state. |
| **Shop Floor Board** | [`ShopFloorBoard.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/shopfloor/ShopFloorBoard.tsx) | `machines` | Filter tabs (`all`, `spinning`, `weaving`, `dyeing`), status toggle | `mockData.ts`, local filters | Grid renders empty if no machines match filter. |
| **Quality Checks** | [`QualityChecks.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/quality/QualityChecks.tsx) | `fabricRolls`, `salesOrders`, `machines` | "Log Quality Inspection" button (unwired) | `mockData.ts`, `usePagination`, `useDebounce` | Handled: "No inspection records match the current filters" empty state. |
| **Fabric Rolls** | [`FabricRolls.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/quality/FabricRolls.tsx) | `fabricRolls`, `salesOrders`, `machines` | Search filter | `mockData.ts`, `usePagination`, `useDebounce` | Handled: "No fabric rolls match the current filters" empty state. |
| **Pending Inspection** | [`PendingInspection.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/quality/PendingInspection.tsx) | `fabricRolls`, `salesOrders`, `machines` | `handleAction(rollId, 'passed' \| 'rework' \| 'rejected')` | `mockData.ts` into local `rolls` `useState` | Handled: "All produced fabric rolls have been inspected and cleared." |
| **Sales Orders** | [`SalesOrders.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/sales/SalesOrders.tsx) | `salesOrders` | Order booking form inputs (unwired) | `mockData.ts`, `usePagination`, `useDebounce` | Handled: "No orders match the current filters" empty state. |
| **Order Status** | [`OrderStatus.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/sales/OrderStatus.tsx) | `salesOrders`, `machines` | Search query | `mockData.ts`, `usePagination`, `useDebounce` | Handled: "No orders match query" empty state. |
| **Finished Goods** | [`FinishedGoods.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/sales/FinishedGoods.tsx) | `salesOrders`, `fabricRolls` | None (View-only) | `mockData.ts`, `usePagination` | No explicit empty state. |
| **Dispatches** | [`Dispatches.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/sales/Dispatches.tsx) | `dispatches`, `salesOrders` | New Dispatch Manifest form inputs (unwired) | `mockData.ts`, `usePagination` | No explicit empty state. |
| **Order Costing** | [`OrderCosting.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/reports/OrderCosting.tsx) | `orderCosts`, `salesOrders` | Export CSV trigger | `mockData.ts`, `usePagination`, `useDebounce` | Handled: "No orders match the current filters." |
| **Machine Performance** | [`MachinePerformance.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/reports/MachinePerformance.tsx) | `machines` | Export CSV trigger | `mockData.ts`, `usePagination`, `useDebounce` | Handled: "No machines match the current filters." |
| **Monthly Summary** | [`MonthlySummary.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/reports/MonthlySummary.tsx) | `monthlyData`, `orderCosts` | Range dropdowns, Export CSV | `mockData.ts`, local slice | No explicit empty state. |

---

## 3. Frontend Entity Definitions & Types

Referenced from [`frontend/src/types/index.ts`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/types/index.ts).

### 3.1 Machine
```typescript
type MachineStatus = 'running' | 'idle' | 'maintenance' | 'breakdown';
type MachineType = 'spinning' | 'weaving' | 'dyeing';

interface Machine {
  id: string;               // e.g. "SP-01", "WV-01"
  name: string;             // e.g. "Spinner Alpha"
  type: MachineType;        // 'spinning' | 'weaving' | 'dyeing'
  status: MachineStatus;    // 'running' | 'idle' | 'maintenance' | 'breakdown'
  currentOrder?: string;    // e.g. "ORD-1042" (optional)
  operator?: string;        // e.g. "Ravi Kumar" (optional)
  progress: number;         // 0 - 100 percentage
  outputToday: number;      // Metres of fabric produced in current shift
  shift: 'A' | 'B' | 'C';   // 8-hour shift indicator
}
```

### 3.2 Yarn Stock & Yarn Receipt
```typescript
type YarnType = 'Cotton' | 'Polyester' | 'Wool' | 'Silk' | 'Blended';

interface YarnStock {
  id: string;               // e.g. "YS-001"
  type: YarnType;
  colour: string;           // e.g. "Navy Blue", "White"
  quantityKg: number;       // Warehouse balance in kg
  reorderLevel: number;     // Minimum safety threshold in kg
  location: string;         // Warehouse bin (e.g. "Bay A-1")
  lastUpdated: string;      // Date string ("YYYY-MM-DD")
}

interface YarnReceipt {
  id: string;               // e.g. "YR-2026-088"
  date: string;             // Delivery date ("YYYY-MM-DD")
  supplier: string;         // Supplier mill name (e.g. "Shree Yarns Pvt. Ltd.")
  yarnType: YarnType;
  colour: string;
  quantityKg: number;       // Inward weight in kg
  forOrderId: string;       // Linked sales order (e.g. "ORD-1045")
  receivedBy: string;       // Store clerk name (e.g. "Ganesh P.")
  invoiceNo: string;        // Supplier invoice reference (e.g. "SY-INV-4421")
}
```

### 3.3 Yarn Inspection Record
```typescript
type YarnInspectionVerdict = 'accepted' | 'rejected' | 'pending';

interface YarnInspectionRecord {
  id: string;               // e.g. "YI-001"
  receiptId: string;        // References YarnReceipt.id (e.g. "YR-2026-088")
  date: string;             // "YYYY-MM-DD"
  supplier: string;
  yarnType: YarnType;
  colour: string;
  batchLot: string;         // e.g. "SY-B-4421-A"
  quantityKg: number;
  sampledKg: number;        // Physical quantity pulled for lab test
  damagePct: number;        // Percentage 0-100 (Threshold: 30% warn, 40% reject)
  tensileStrength: number;  // N/tex
  moisture: number;         // % moisture content
  countNe: number;          // English cotton yarn count
  inspector: string;        // Quality officer name
  verdict: YarnInspectionVerdict; // 'accepted' | 'rejected' | 'pending'
  rejectionReason?: string;
  inspectedAt: string;      // Timestamp string
}
```

### 3.4 Sales Order
```typescript
type OrderStatus =
  | 'pending'
  | 'yarn_check'
  | 'spinning'
  | 'weaving'
  | 'dyeing'
  | 'quality_check'
  | 'ready_to_ship'
  | 'dispatched';

interface SalesOrder {
  id: string;               // e.g. "ORD-1042"
  buyer: string;            // Customer entity name (e.g. "Fabindia Exports")
  fabricType: string;       // e.g. "Cotton Twill"
  colour: string;           // e.g. "White"
  quantityMetres: number;   // Contract length in metres
  deliveryDate: string;     // Deadline ("YYYY-MM-DD")
  createdDate: string;      // Booking date ("YYYY-MM-DD")
  status: OrderStatus;
  machineId?: string;       // Assigned unit (optional)
  completedMetres: number;  // Production metres logged to date
  unitPrice: number;        // Selling price per metre in INR (₹)
}
```

### 3.5 Fabric Roll
```typescript
type QCResult = 'passed' | 'rework' | 'rejected' | 'pending';

interface FabricRoll {
  id: string;               // e.g. "FR-5501"
  orderId: string;          // Linked SalesOrder ID (e.g. "ORD-1033")
  machineId: string;        // Producing loom (e.g. "DY-01")
  metres: number;           // Roll batch length in metres
  producedDate: string;     // "YYYY-MM-DD"
  qcResult: QCResult;       // 'passed' | 'rework' | 'rejected' | 'pending'
  defects?: string[];       // e.g. ["Colour mismatch", "Holes"]
  checkedBy?: string;       // Inspector name (e.g. "Vijay QC")
  checkedAt?: string;       // Formatted date-time string
}
```

### 3.6 Dispatch
```typescript
interface Dispatch {
  id: string;               // e.g. "DSP-301"
  orderId: string;          // Linked SalesOrder ID (e.g. "ORD-1025")
  buyer: string;            // Recipient buyer name
  rollIds: string[];        // Array of cleared roll IDs (e.g. ["FR-5490", "FR-5491"])
  totalMetres: number;      // Total dispatched metres
  dispatchDate: string;     // "YYYY-MM-DD"
  invoiceNo: string;        // Outward tax invoice (e.g. "ETM-INV-1025")
  truckNo: string;          // Freight carrier registration (e.g. "KA-01-AB-4521")
  status: 'prepared' | 'loaded' | 'delivered';
}
```

### 3.7 Order Cost & Reports
```typescript
interface OrderCost {
  orderId: string;          // e.g. "ORD-1025"
  buyer: string;
  yarnCost: number;         // Raw material cost (₹)
  labourCost: number;       // Direct floor labour (₹)
  machineCost: number;      // Power + machine depreciation (₹)
  totalCost: number;        // yarnCost + labourCost + machineCost (₹)
  revenue: number;          // Total order contract value (₹)
  profit: number;           // revenue - totalCost (₹)
}

// In mockData.ts for monthly chart
interface MonthlyDataPoint {
  month: string;            // 'May', 'Jun', 'Jul', etc.
  revenue: number;
  cost: number;
  output: number;           // Metres produced
}
```

---

## 4. UI Request Shapes & Payload Requirements

If the UI triggers real HTTP requests, the following shapes are required by current UI controls:

### 4.1 Filter, Search & Pagination Params
- **Pagination Hook ([`usePagination.ts`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/hooks/usePagination.ts)):**
  - `?page=1` (1-indexed number)
  - `?limit=20` (default 20, or 10 on some queues)
- **Text Search ([`useDebounce.ts`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/hooks/useDebounce.ts)):**
  - Debounced by 300ms.
  - Machines: search by ID, name, or process type.
  - Sales Orders / Status: search by order ID, buyer, or fabric type.
  - Quality Checks / Rolls: search by roll ID or order ID.
- **Categorical Filters:**
  - Machines / Shopfloor: `type` (`all | spinning | weaving | dyeing`), `status` (`all | running | idle | maintenance | breakdown`).
  - Quality: `qcResult` (`all | passed | rework | rejected | pending`).
  - Reports: `buyer` (`all | <BuyerName>`), `fromMonth` and `toMonth` indices.

### 4.2 Form Payloads Designed in UI
1. **Record Yarn Inward Receipt ([`YarnReceipts.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/yarn/YarnReceipts.tsx#L21-L65)):**
   - Date: `string` (YYYY-MM-DD)
   - Supplier / Mill: `string`
   - Yarn Variety: `'Cotton' | 'Polyester' | 'Wool' | 'Silk' | 'Blended'`
   - Colour / Shade: `string`
   - Inward Net (kg): `number`
   - Linked Order Ref: `string` ("ORD-XXXX")
   - Supplier Invoice #: `string` ("INV-XXXX")
   - Receiving Officer: `string`
2. **Book New Sales Order ([`SalesOrders.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/sales/SalesOrders.tsx#L56-L79)):**
   - Buyer Entity: `string`
   - Fabric Quality: `string`
   - Colourway: `string`
   - Quantity (metres): `number`
   - Rate (₹/metre): `number`
   - Target Delivery: `string` (YYYY-MM-DD)
3. **Log QC Inspection Verdict ([`PendingInspection.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/quality/PendingInspection.tsx#L84-L106)):**
   - Action buttons send: `rollId` + `result: 'passed' | 'rework' | 'rejected'`.
   - Local state currently injects `checkedBy: 'Supervisor'`, `checkedAt: 'Just now'`.
4. **Generate Freight Dispatch ([`Dispatches.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/sales/Dispatches.tsx#L41-L73)):**
   - Select Ready Order: `orderId`
   - Dispatch Date: `string` (YYYY-MM-DD)
   - Lorry / Vehicle Reg #: `truckNo`
   - Tax Invoice #: `invoiceNo`
   - Total Length (m): `number`
   *(Note: The form currently does not contain roll selection checkboxes)*
5. **Yarn Inspection Action ([`YarnInspection.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/yarn/YarnInspection.tsx#L62-L86)):**
   - Accept: `id`
   - Reject: `id` + `rejectionReason: string`

---

## 5. UI-Derived & Computed Values

The frontend computes substantial business calculations in client-side `useMemo` hooks:
1. **Dashboard KPIs ([`Dashboard.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/dashboard/Dashboard.tsx#L43-L66)):**
   - `runningMachines`, `idleMachines`, `downMachines`, `totalMachines`
   - `lowStockCount` (count of yarns where `quantityKg <= reorderLevel`)
   - `activeOrders` (status not 'dispatched')
   - `readyToShip` (status === 'ready_to_ship')
   - `pendingQC` (rolls where qcResult === 'pending')
   - `totalOutputToday` (sum of `outputToday` across machines)
   - `qcCounts` breakdown (`passed`, `pending`, `rework`, `rejected`)
   - `recentOrders` progress percentage: `Math.round((completedMetres / quantityMetres) * 100)`
2. **Order Costing & Reports ([`OrderCosting.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/reports/OrderCosting.tsx#L50-L63)):**
   - `totalRevenue = sum(revenue)`
   - `totalCost = sum(totalCost)`
   - `totalProfit = sum(profit)`
   - `margin = Math.round((totalProfit / totalRevenue) * 100)`
3. **Machine Performance ([`MachinePerformance.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/reports/MachinePerformance.tsx#L48-L54)):**
   - Target is hardcoded to 500m: `const TARGET = 500;`
   - `avgEff = Math.round((totalOutput / (filtered.length * TARGET)) * 100)`
   - Per-machine efficiency: `Math.round((m.outputToday / TARGET) * 100)`
4. **Monthly Summary ([`MonthlySummary.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/reports/MonthlySummary.tsx#L34-L46)):**
   - `revGrowth = Math.round(((latest.revenue - prev.revenue) / prev.revenue) * 100)`
   - Hardcoded `totalWages = 385000`
5. **Fabric Rolls ([`FabricRolls.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/quality/FabricRolls.tsx#L13-L21)):**
   - `totalMetres = sum(metres)`
   - `passRate = Math.round((passed / inspectedCount) * 100)`
   - `rejectRate = Math.round((rejected / inspectedCount) * 100)`
6. **Stock Alerts ([`LowStockAlerts.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/pages/yarn/LowStockAlerts.tsx#L14-L17)):**
   - `critical = quantityKg <= reorderLevel * 0.4`
   - `warning = quantityKg > reorderLevel * 0.4 && quantityKg <= reorderLevel`
   - `deficit = max(0, reorderLevel - quantityKg)`
   - `stockPct = min(100, Math.round((quantityKg / reorderLevel) * 100))`

---

## 6. Auth & Session Assumptions in Frontend

- **Authentication Presence:** Completely missing. The routing in [`App.tsx`](file:///home/bow/projects/Everest-Textile-Mills/frontend/src/App.tsx) has no `<ProtectedRoute>` wrapper, no `/login` route, and redirects `/` directly to `/dashboard`.
- **TopBar User Identity:** Hardcoded static label: `Shift Supervisor` / `Mill Floor A`.
- **RBAC Handling:** The frontend has no concept of roles (`admin`, `manager`, `operator`, `qc_inspector`, `viewer`). All buttons, forms, and tabs are universally visible to anyone viewing the browser.
- **Session Expiry / 401s:** Not handled.
