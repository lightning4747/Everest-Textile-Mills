import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import PageSkeleton from './components/ui/PageSkeleton';

// Pages — lazy loaded for route-level code splitting
const Dashboard        = React.lazy(() => import('./pages/dashboard/Dashboard'));
const ShopFloorBoard   = React.lazy(() => import('./pages/shopfloor/ShopFloorBoard'));
const Machines         = React.lazy(() => import('./pages/shopfloor/Machines'));
const ProductionOrders = React.lazy(() => import('./pages/shopfloor/ProductionOrders'));
const YarnReceipts     = React.lazy(() => import('./pages/yarn/YarnReceipts'));
const RawMaterialStock = React.lazy(() => import('./pages/yarn/RawMaterialStock'));
const LowStockAlerts   = React.lazy(() => import('./pages/yarn/LowStockAlerts'));
const YarnInspection   = React.lazy(() => import('./pages/yarn/YarnInspection'));
const QualityChecks    = React.lazy(() => import('./pages/quality/QualityChecks'));
const FabricRolls      = React.lazy(() => import('./pages/quality/FabricRolls'));
const PendingInspection = React.lazy(() => import('./pages/quality/PendingInspection'));
const SalesOrders      = React.lazy(() => import('./pages/sales/SalesOrders'));
const OrderStatus      = React.lazy(() => import('./pages/sales/OrderStatus'));
const FinishedGoods    = React.lazy(() => import('./pages/sales/FinishedGoods'));
const Dispatches       = React.lazy(() => import('./pages/sales/Dispatches'));
const OrderCosting     = React.lazy(() => import('./pages/reports/OrderCosting'));
const MachinePerformance = React.lazy(() => import('./pages/reports/MachinePerformance'));
const MonthlySummary   = React.lazy(() => import('./pages/reports/MonthlySummary'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Production */}
            <Route path="production/machines"  element={<Machines />} />
            <Route path="production/orders"    element={<ProductionOrders />} />
            <Route path="production/shopfloor" element={<ShopFloorBoard />} />

            {/* Yarn */}
            <Route path="yarn/receipts"    element={<YarnReceipts />} />
            <Route path="yarn/stock"       element={<RawMaterialStock />} />
            <Route path="yarn/alerts"      element={<LowStockAlerts />} />
            <Route path="yarn/inspection"  element={<YarnInspection />} />

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
      </Suspense>
    </BrowserRouter>
  );
}
