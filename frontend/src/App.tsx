import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import PageSkeleton from './components/ui/PageSkeleton';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth page
const LoginPage        = React.lazy(() => import('./pages/auth/LoginPage'));

// Portal pages
const PortalLayout     = React.lazy(() => import('./pages/portal/PortalLayout'));
const ClientOrders     = React.lazy(() => import('./pages/portal/ClientOrders'));
const NewOrder         = React.lazy(() => import('./pages/portal/NewOrder'));

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
const DeliveryStatus   = React.lazy(() => import('./pages/sales/DeliveryStatus'));
const OrderCosting     = React.lazy(() => import('./pages/reports/OrderCosting'));
const MachinePerformance = React.lazy(() => import('./pages/reports/MachinePerformance'));
const MonthlySummary   = React.lazy(() => import('./pages/reports/MonthlySummary'));
const AuditLedger      = React.lazy(() => import('./pages/inventory/AuditLedger'));

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: import('./context/AuthContext').UserRole[] }) {
  const { isAuthenticated, user, isAuthorized } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !isAuthorized(...allowedRoles)) {
    // If the user is a client, redirect them to the client portal
    if (user?.role === 'client') {
      return <Navigate to="/portal/orders" replace />;
    }
    // Otherwise redirect unauthorized users to dashboard or a not-authorized page
    return <Navigate to="/dashboard" replace />;
  }

  // If a client tries to access the root '/', redirect them to portal
  if (user?.role === 'client' && location.pathname === '/dashboard') {
      return <Navigate to="/portal/orders" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Dedicated full-page login route without AppLayout */}
            <Route path="/login" element={<LoginPage />} />

            {/* Client Portal Routes */}
            <Route
              path="/portal"
              element={
                <ProtectedRoute>
                  <PortalLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="orders" replace />} />
              <Route path="orders" element={<ClientOrders />} />
              <Route path="new-order" element={<NewOrder />} />
            </Route>

            {/* Protected mill operations routes inside AppLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'operator', 'qc_inspector', 'viewer']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
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

              {/* Inventory */}
              <Route path="inventory/ledger" element={<AuditLedger />} />

              {/* Sales */}
              <Route path="sales/orders"     element={<SalesOrders />} />
              <Route path="sales/status"     element={<OrderStatus />} />
              <Route path="sales/finished"   element={<FinishedGoods />} />
              <Route path="sales/dispatches" element={<Dispatches />} />
              <Route path="sales/delivery"   element={<DeliveryStatus />} />

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
    </AuthProvider>
  );
}
