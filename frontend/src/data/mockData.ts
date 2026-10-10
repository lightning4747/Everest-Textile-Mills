import type {
  Machine, YarnStock, YarnReceipt, SalesOrder,
  FabricRoll, Dispatch, OrderCost
} from '../types';

// ─── Machines ──────────────────────────────────────────────────────────────
export const machines: Machine[] = [
  { id: 'SP-01', name: 'Spinner Alpha', type: 'spinning', status: 'running', currentOrder: 'ORD-1042', operator: 'Ravi Kumar', progress: 68, outputToday: 340, shift: 'A' },
  { id: 'SP-02', name: 'Spinner Beta', type: 'spinning', status: 'running', currentOrder: 'ORD-1045', operator: 'Suresh M.', progress: 32, outputToday: 180, shift: 'A' },
  { id: 'SP-03', name: 'Spinner Gamma', type: 'spinning', status: 'idle', operator: undefined, progress: 0, outputToday: 210, shift: 'B' },
  { id: 'WV-01', name: 'Weaver Prime', type: 'weaving', status: 'running', currentOrder: 'ORD-1038', operator: 'Anil T.', progress: 91, outputToday: 520, shift: 'A' },
  { id: 'WV-02', name: 'Weaver Duo', type: 'weaving', status: 'breakdown', currentOrder: undefined, operator: 'Maintenance', progress: 0, outputToday: 0, shift: 'A' },
  { id: 'WV-03', name: 'Weaver Trio', type: 'weaving', status: 'running', currentOrder: 'ORD-1040', operator: 'Praveen R.', progress: 55, outputToday: 390, shift: 'B' },
  { id: 'DY-01', name: 'Dyer One', type: 'dyeing', status: 'running', currentOrder: 'ORD-1033', operator: 'Mohan L.', progress: 77, outputToday: 280, shift: 'A' },
  { id: 'DY-02', name: 'Dyer Two', type: 'dyeing', status: 'maintenance', currentOrder: undefined, operator: 'Tech Team', progress: 0, outputToday: 0, shift: 'A' },
  { id: 'DY-03', name: 'Dyer Three', type: 'dyeing', status: 'running', currentOrder: 'ORD-1041', operator: 'Kiran S.', progress: 45, outputToday: 195, shift: 'C' },
];

// ─── Yarn Stock ────────────────────────────────────────────────────────────
export const yarnStock: YarnStock[] = [
  { id: 'YS-001', type: 'Cotton', colour: 'White', quantityKg: 4200, reorderLevel: 1000, location: 'Bay A-1', lastUpdated: '2026-10-10' },
  { id: 'YS-002', type: 'Cotton', colour: 'Navy Blue', quantityKg: 780, reorderLevel: 1000, location: 'Bay A-2', lastUpdated: '2026-10-09' },
  { id: 'YS-003', type: 'Polyester', colour: 'Black', quantityKg: 3100, reorderLevel: 800, location: 'Bay B-1', lastUpdated: '2026-10-10' },
  { id: 'YS-004', type: 'Polyester', colour: 'Red', quantityKg: 290, reorderLevel: 500, location: 'Bay B-2', lastUpdated: '2026-10-08' },
  { id: 'YS-005', type: 'Wool', colour: 'Grey', quantityKg: 1650, reorderLevel: 400, location: 'Bay C-1', lastUpdated: '2026-10-10' },
  { id: 'YS-006', type: 'Silk', colour: 'Ivory', quantityKg: 450, reorderLevel: 200, location: 'Bay D-1', lastUpdated: '2026-10-07' },
  { id: 'YS-007', type: 'Blended', colour: 'Khaki', quantityKg: 2200, reorderLevel: 600, location: 'Bay E-1', lastUpdated: '2026-10-10' },
  { id: 'YS-008', type: 'Cotton', colour: 'Olive Green', quantityKg: 160, reorderLevel: 500, location: 'Bay A-3', lastUpdated: '2026-10-06' },
];

// ─── Yarn Receipts ─────────────────────────────────────────────────────────
export const yarnReceipts: YarnReceipt[] = [
  { id: 'YR-2026-088', date: '2026-10-10', supplier: 'Shree Yarns Pvt. Ltd.', yarnType: 'Cotton', colour: 'White', quantityKg: 1200, forOrderId: 'ORD-1045', receivedBy: 'Ganesh P.', invoiceNo: 'SY-INV-4421' },
  { id: 'YR-2026-087', date: '2026-10-09', supplier: 'National Fibres', yarnType: 'Polyester', colour: 'Black', quantityKg: 800, forOrderId: 'ORD-1044', receivedBy: 'Ganesh P.', invoiceNo: 'NF-9032' },
  { id: 'YR-2026-086', date: '2026-10-08', supplier: 'Bombay Textiles', yarnType: 'Wool', colour: 'Grey', quantityKg: 500, forOrderId: 'ORD-1040', receivedBy: 'Ramesh K.', invoiceNo: 'BT-7701' },
  { id: 'YR-2026-085', date: '2026-10-07', supplier: 'Shree Yarns Pvt. Ltd.', yarnType: 'Cotton', colour: 'Navy Blue', quantityKg: 600, forOrderId: 'ORD-1038', receivedBy: 'Ganesh P.', invoiceNo: 'SY-INV-4398' },
  { id: 'YR-2026-084', date: '2026-10-05', supplier: 'Silk Route Traders', yarnType: 'Silk', colour: 'Ivory', quantityKg: 150, forOrderId: 'ORD-1033', receivedBy: 'Ramesh K.', invoiceNo: 'SR-2210' },
];

// ─── Sales Orders ──────────────────────────────────────────────────────────
export const salesOrders: SalesOrder[] = [
  { id: 'ORD-1042', buyer: 'Fabindia Exports', fabricType: 'Cotton Twill', colour: 'White', quantityMetres: 5000, deliveryDate: '2026-10-25', createdDate: '2026-10-01', status: 'spinning', machineId: 'SP-01', completedMetres: 3400, unitPrice: 85 },
  { id: 'ORD-1041', buyer: 'Mafatlal Industries', fabricType: 'Poly-blend', colour: 'Khaki', quantityMetres: 3500, deliveryDate: '2026-10-28', createdDate: '2026-10-03', status: 'dyeing', machineId: 'DY-03', completedMetres: 1575, unitPrice: 72 },
  { id: 'ORD-1040', buyer: 'Welspun Corp', fabricType: 'Wool Tweed', colour: 'Grey', quantityMetres: 2000, deliveryDate: '2026-11-02', createdDate: '2026-10-04', status: 'weaving', machineId: 'WV-03', completedMetres: 1100, unitPrice: 130 },
  { id: 'ORD-1038', buyer: 'Arvind Ltd.', fabricType: 'Cotton Denim', colour: 'Navy Blue', quantityMetres: 8000, deliveryDate: '2026-11-10', createdDate: '2026-09-25', status: 'weaving', machineId: 'WV-01', completedMetres: 7280, unitPrice: 95 },
  { id: 'ORD-1045', buyer: 'Trident Group', fabricType: 'Cotton Plain', colour: 'White', quantityMetres: 4500, deliveryDate: '2026-10-30', createdDate: '2026-10-07', status: 'spinning', machineId: 'SP-02', completedMetres: 1440, unitPrice: 68 },
  { id: 'ORD-1033', buyer: 'Bombay Dyeing', fabricType: 'Silk Charmeuse', colour: 'Ivory', quantityMetres: 1200, deliveryDate: '2026-10-20', createdDate: '2026-09-20', status: 'quality_check', machineId: 'DY-01', completedMetres: 1200, unitPrice: 320 },
  { id: 'ORD-1029', buyer: 'Raymond Ltd.', fabricType: 'Wool Suiting', colour: 'Charcoal', quantityMetres: 3000, deliveryDate: '2026-10-15', createdDate: '2026-09-15', status: 'ready_to_ship', machineId: undefined, completedMetres: 3000, unitPrice: 180 },
  { id: 'ORD-1025', buyer: 'Grasim Industries', fabricType: 'Viscose Blend', colour: 'Teal', quantityMetres: 2500, deliveryDate: '2026-10-05', createdDate: '2026-09-10', status: 'dispatched', machineId: undefined, completedMetres: 2500, unitPrice: 110 },
];

// ─── Fabric Rolls ──────────────────────────────────────────────────────────
export const fabricRolls: FabricRoll[] = [
  { id: 'FR-5501', orderId: 'ORD-1033', machineId: 'DY-01', metres: 120, producedDate: '2026-10-09', qcResult: 'passed', checkedBy: 'Vijay QC', checkedAt: '2026-10-10 09:15' },
  { id: 'FR-5502', orderId: 'ORD-1033', machineId: 'DY-01', metres: 115, producedDate: '2026-10-09', qcResult: 'passed', checkedBy: 'Vijay QC', checkedAt: '2026-10-10 09:30' },
  { id: 'FR-5503', orderId: 'ORD-1033', machineId: 'DY-01', metres: 118, producedDate: '2026-10-09', qcResult: 'rework', defects: ['Colour mismatch'], checkedBy: 'Vijay QC', checkedAt: '2026-10-10 09:45' },
  { id: 'FR-5504', orderId: 'ORD-1033', machineId: 'DY-01', metres: 122, producedDate: '2026-10-10', qcResult: 'pending' },
  { id: 'FR-5505', orderId: 'ORD-1038', machineId: 'WV-01', metres: 200, producedDate: '2026-10-08', qcResult: 'passed', checkedBy: 'Meena QC', checkedAt: '2026-10-09 14:00' },
  { id: 'FR-5506', orderId: 'ORD-1038', machineId: 'WV-01', metres: 195, producedDate: '2026-10-08', qcResult: 'rejected', defects: ['Holes', 'Uneven weaving'], checkedBy: 'Meena QC', checkedAt: '2026-10-09 14:20' },
  { id: 'FR-5507', orderId: 'ORD-1029', machineId: 'WV-03', metres: 180, producedDate: '2026-10-06', qcResult: 'passed', checkedBy: 'Suresh QC', checkedAt: '2026-10-07 11:00' },
  { id: 'FR-5508', orderId: 'ORD-1029', machineId: 'WV-03', metres: 175, producedDate: '2026-10-06', qcResult: 'passed', checkedBy: 'Suresh QC', checkedAt: '2026-10-07 11:15' },
  { id: 'FR-5509', orderId: 'ORD-1040', machineId: 'WV-03', metres: 160, producedDate: '2026-10-10', qcResult: 'pending' },
  { id: 'FR-5510', orderId: 'ORD-1040', machineId: 'WV-03', metres: 165, producedDate: '2026-10-10', qcResult: 'pending' },
];

// ─── Dispatches ────────────────────────────────────────────────────────────
export const dispatches: Dispatch[] = [
  { id: 'DSP-301', orderId: 'ORD-1025', buyer: 'Grasim Industries', rollIds: ['FR-5490', 'FR-5491', 'FR-5492'], totalMetres: 2500, dispatchDate: '2026-10-06', invoiceNo: 'ETM-INV-1025', truckNo: 'KA-01-AB-4521', status: 'delivered' },
  { id: 'DSP-302', orderId: 'ORD-1029', buyer: 'Raymond Ltd.', rollIds: ['FR-5507', 'FR-5508'], totalMetres: 355, dispatchDate: '2026-10-11', invoiceNo: 'ETM-INV-1029', truckNo: 'KA-05-CD-7890', status: 'prepared' },
];

// ─── Order Costs ───────────────────────────────────────────────────────────
export const orderCosts: OrderCost[] = [
  { orderId: 'ORD-1025', buyer: 'Grasim Industries', yarnCost: 62500, labourCost: 18000, machineCost: 12000, totalCost: 92500, revenue: 275000, profit: 182500 },
  { orderId: 'ORD-1029', buyer: 'Raymond Ltd.', yarnCost: 108000, labourCost: 27000, machineCost: 18000, totalCost: 153000, revenue: 540000, profit: 387000 },
  { orderId: 'ORD-1033', buyer: 'Bombay Dyeing', yarnCost: 96000, labourCost: 14400, machineCost: 9600, totalCost: 120000, revenue: 384000, profit: 264000 },
  { orderId: 'ORD-1038', buyer: 'Arvind Ltd.', yarnCost: 240000, labourCost: 64000, machineCost: 48000, totalCost: 352000, revenue: 760000, profit: 408000 },
  { orderId: 'ORD-1040', buyer: 'Welspun Corp', yarnCost: 78000, labourCost: 24000, machineCost: 16000, totalCost: 118000, revenue: 260000, profit: 142000 },
];

// ─── Monthly chart data ─────────────────────────────────────────────────────
export const monthlyData = [
  { month: 'May', revenue: 820000, cost: 540000, output: 18400 },
  { month: 'Jun', revenue: 960000, cost: 620000, output: 21200 },
  { month: 'Jul', revenue: 880000, cost: 580000, output: 19800 },
  { month: 'Aug', revenue: 1120000, cost: 700000, output: 25000 },
  { month: 'Sep', revenue: 1050000, cost: 680000, output: 23500 },
  { month: 'Oct', revenue: 1240000, cost: 760000, output: 27800 },
];

export const machineOutputData = machines.map(m => ({
  name: m.id,
  output: m.outputToday,
  target: 500,
}));
