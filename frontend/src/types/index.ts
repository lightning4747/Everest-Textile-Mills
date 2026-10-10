// ─── Machine ───────────────────────────────────────────────────────────────
export type MachineStatus = 'running' | 'idle' | 'maintenance' | 'breakdown';
export type MachineType = 'spinning' | 'weaving' | 'dyeing';

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  status: MachineStatus;
  currentOrder?: string;
  operator?: string;
  progress: number; // 0-100
  outputToday: number; // metres
  shift: 'A' | 'B' | 'C';
}

// ─── Yarn / Raw Material ───────────────────────────────────────────────────
export type YarnType = 'Cotton' | 'Polyester' | 'Wool' | 'Silk' | 'Blended';

export interface YarnStock {
  id: string;
  type: YarnType;
  colour: string;
  quantityKg: number;
  reorderLevel: number;
  location: string;
  lastUpdated: string;
}

export interface YarnReceipt {
  id: string;
  date: string;
  supplier: string;
  yarnType: YarnType;
  colour: string;
  quantityKg: number;
  forOrderId: string;
  receivedBy: string;
  invoiceNo: string;
}

// ─── Products (New) ────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  fabricType: string;
  gsm: number;
  widthInches: number;
  yarnType: string;
  yarnKgPerMetre: number;
  pricePerMetre: number;
  isActive: boolean;
}

// ─── Orders ────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'awaiting_yarn'
  | 'yarn_check'
  | 'spinning'
  | 'weaving'
  | 'dyeing'
  | 'quality_check'
  | 'ready_to_ship'
  | 'dispatched';

export interface SalesOrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product; // Expanded by backend
  fabricType?: string; // Fallback
  colour?: string; // Fallback
  sequence: number;
  quantityMetres: number;
  completedMetres: number;
  dispatchedMetres: number;
  unitPrice: number;
  status: OrderStatus;
  yarnRequiredKg: number;
}

export interface SalesOrder {
  id: string;
  clientId?: string;
  buyer: string;
  deliveryDate: string;
  createdDate: string;
  status: OrderStatus;
  totalAmount: number;
  items: SalesOrderItem[];
}

// ─── Production ────────────────────────────────────────────────────────────
export interface ProductionOrder {
  id: string;
  salesOrderId: string;
  machineId: string;
  startDate: string;
  expectedEndDate: string;
  status: 'queued' | 'in_progress' | 'paused' | 'completed';
  outputMetres: number;
  targetMetres: number;
}

// ─── Quality Control ──────────────────────────────────────────────────────
export type QCResult = 'passed' | 'rejected' | 'pending';

export interface FabricRoll {
  id: string;
  orderId: string;
  machineId: string;
  metres: number;
  producedDate: string;
  qcResult: QCResult;
  defects?: string[];
  checkedBy?: string;
  checkedAt?: string;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────
export interface DispatchItem {
  id: string;
  dispatchId: string;
  orderItemId: string;
  metres: number;
  item?: SalesOrderItem; // Expanded
}

export interface Dispatch {
  id: string;
  orderId: string;
  buyer: string;
  truckNo: string;
  invoiceNo: string;
  status: 'prepared' | 'loaded' | 'delivered';
  dispatchDate: string;
  totalMetres: number;
  rollIds?: string[];
  items?: DispatchItem[];
}

// ─── Reports ──────────────────────────────────────────────────────────────
export interface OrderCost {
  orderId: string;
  buyer: string;
  yarnCost: number;
  labourCost: number;
  machineCost: number;
  totalCost: number;
  revenue: number;
  profit: number;
}

// ─── Yarn Inspection ──────────────────────────────────────────────────────
export type YarnInspectionVerdict = 'accepted' | 'rejected' | 'pending';

export interface YarnInspectionRecord {
  id: string;
  receiptId: string;          // links to YarnReceipt
  date: string;
  supplier: string;
  yarnType: YarnType;
  colour: string;
  batchLot: string;
  quantityKg: number;
  sampledKg: number;          // kg pulled for inspection
  damagePct: number;          // 0–100, calculated from test
  tensileStrength: number;    // N/tex
  moisture: number;           // % moisture content
  countNe: number;            // yarn count in Ne
  inspector: string;
  verdict: YarnInspectionVerdict;
  rejectionReason?: string;
  inspectedAt: string;
}
