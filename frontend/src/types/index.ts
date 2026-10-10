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

// ─── Orders ────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'yarn_check'
  | 'spinning'
  | 'weaving'
  | 'dyeing'
  | 'quality_check'
  | 'ready_to_ship'
  | 'dispatched';

export interface SalesOrder {
  id: string;
  buyer: string;
  fabricType: string;
  colour: string;
  quantityMetres: number;
  deliveryDate: string;
  createdDate: string;
  status: OrderStatus;
  machineId?: string;
  completedMetres: number;
  unitPrice: number;
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
export type QCResult = 'passed' | 'rework' | 'rejected' | 'pending';

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
export interface Dispatch {
  id: string;
  orderId: string;
  buyer: string;
  rollIds: string[];
  totalMetres: number;
  dispatchDate: string;
  invoiceNo: string;
  truckNo: string;
  status: 'prepared' | 'loaded' | 'delivered';
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
