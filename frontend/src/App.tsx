import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';

// Pages
import Dashboard from './pages/dashboard/Dashboard';
import ShopFloorBoard from './pages/shopfloor/ShopFloorBoard';
import Machines from './pages/shopfloor/Machines';
import ProductionOrders from './pages/shopfloor/ProductionOrders';
import YarnReceipts from './pages/yarn/YarnReceipts';
import RawMaterialStock from './pages/yarn/RawMaterialStock';
import LowStockAlerts from './pages/yarn/LowStockAlerts';
import QualityChecks from './pages/quality/QualityChecks';
import FabricRolls from './pages/quality/FabricRolls';
import PendingInspection from './pages/quality/PendingInspection';
import SalesOrders from './pages/sales/SalesOrders';
import OrderStatus from './pages/sales/OrderStatus';
import FinishedGoods from './pages/sales/FinishedGoods';
import Dispatches from './pages/sales/Dispatches';
import OrderCosting from './pages/reports/OrderCosting';
import MachinePerformance from './pages/reports/MachinePerformance';
import MonthlySummary from './pages/reports/MonthlySummary';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Production */}
          <Route path="production/machines"  element={<Machines />} />
          <Route path="production/orders"    element={<ProductionOrders />} />
          <Route path="production/shopfloor" element={<ShopFloorBoard />} />

          {/* Yarn */}
          <Route path="yarn/receipts" element={<YarnReceipts />} />
          <Route path="yarn/stock"    element={<RawMaterialStock />} />
          <Route path="yarn/alerts"   element={<LowStockAlerts />} />

          {/* Quality */}
          <Route path="quality/checks"  element={<QualityChecks />} />
          <Route path="quality/rolls"   element={<FabricRolls />} />
          <Route path="quality/pending" element={<PendingInspection />} />

          {/* Sales */}
          <Route path="sales/orders"     element={<SalesOrders />} />
          <Route path="sales/status"     element={<OrderStatus />} />
          <Route path="sales/finished"   element={<FinishedGoods />} />
          <Route path="sales/dispatches" element={<Dispatches />} />

          {/* Reports */}
          <Route path="reports/costing"  element={<OrderCosting />} />
          <Route path="reports/machines" element={<MachinePerformance />} />
          <Route path="reports/monthly"  element={<MonthlySummary />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
