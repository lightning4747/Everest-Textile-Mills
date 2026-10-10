import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, AlertTriangle, TrendingUp, Activity, Clock, ArrowRight, Sparkles } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { fetchRevenueForecast, ForecastPoint } from '../../services/forecastApi';
import { api } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

interface DashboardKPIs {
  activeOrders: number;
  readyToShip: number;
  runningMachines: number;
  totalMachines: number;
  idleMachines: number;
  downMachines: number;
  outputToday: number;
  lowStockCount: number;
  pendingQC: number;
}

interface MonthlyChartPoint {
  month: string;
  revenue: number;
  cost: number;
  output: number;
  wages?: number;
}

interface QCSummary {
  passed: number;
  rejected: number;
  pending: number;
}

interface MachineHealth {
  running: number;
  idle: number;
  maintenance: number;
  breakdown: number;
}

interface RecentOrder {
  id: string;
  buyer: string;
  fabric: string;
  colour: string;
  targetMetres: number;
  completedMetres: number;
  progressPct: number;
  status: string;
  deliveryDate: string;
}

interface LowStockItem {
  id: string;
  type: string;
  colour: string;
  quantityKg: number;
  reorderLevel: number;
  location: string;
  supplier?: string | null;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; stroke?: string; color?: string }>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="card p-3 text-xs shadow-md border border-[var(--border)] bg-[var(--surface)]">
        <p className="text-[var(--text-soft)] mb-1.5 font-medium font-mono">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="font-mono font-medium" style={{ color: p.stroke || p.color }}>
            {p.name}: ₹{(p.value / 1000).toFixed(0)}K
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [, setLoadingForecast] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'historical' | 'forecast' | 'combined'>('combined');

  // Dashboard API states with reasonable initial values
  const [kpis, setKpis] = useState<DashboardKPIs>({
    activeOrders: 0,
    readyToShip: 0,
    runningMachines: 0,
    totalMachines: 0,
    idleMachines: 0,
    downMachines: 0,
    outputToday: 0,
    lowStockCount: 0,
    pendingQC: 0,
  });

  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyChartPoint[]>([]);
  const [qcCounts, setQcCounts] = useState<QCSummary>({ passed: 0, rejected: 0, pending: 0 });
  const [machineHealth, setMachineHealth] = useState<MachineHealth>({ running: 0, idle: 0, maintenance: 0, breakdown: 0 });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  // Load Dashboard data from API
  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [kpiRes, chartRes, qcRes, healthRes, ordersRes, lowStockRes] = await Promise.all([
        api.get<DashboardKPIs>('/dashboard/kpis'),
        api.get<MonthlyChartPoint[]>('/dashboard/monthly-chart'),
        api.get<QCSummary>('/dashboard/qc-summary'),
        api.get<MachineHealth>('/dashboard/machine-health'),
        api.get<RecentOrder[]>('/dashboard/recent-orders'),
        api.get<LowStockItem[]>('/dashboard/low-stock'),
      ]);

      setKpis(kpiRes.data);
      setMonthlyTrend(chartRes.data || []);
      setQcCounts(qcRes.data);
      setMachineHealth(healthRes.data);
      setRecentOrders(ordersRes.data || []);
      setLowStockItems(lowStockRes.data || []);

      // If monthly chart has data, update forecast lag
      const lastMonth = chartRes.data && chartRes.data.length > 0 ? chartRes.data[chartRes.data.length - 1] : null;
      const lastRev = lastMonth?.revenue ?? 1240000;
      fetchRevenueForecast(11, lastRev, 6)
        .then(res => setForecast(res.forecast))
        .catch(err => console.error('Failed to load ONNX forecast:', err))
        .finally(() => setLoadingForecast(false));
    } catch (err) {
      console.warn('Dashboard endpoints error, retaining current view state:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDashboardData();
    // 15-second polling for live shopfloor and dashboard telemetry
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const handleOrderRowClick = useCallback(() => navigate('/sales/status'), [navigate]);
  const handleAllOrdersClick = useCallback(() => navigate('/sales/orders'), [navigate]);
  const handleQCLogsClick = useCallback(() => navigate('/quality/checks'), [navigate]);
  const handleShopFloorClick = useCallback(() => navigate('/production/shopfloor'), [navigate]);
  const handleYarnAlertsClick = useCallback(() => navigate('/yarn/alerts'), [navigate]);

  // Historical chart data: Only past months (e.g. May through Oct)
  const historicalChartData = useMemo(() => 
    monthlyTrend.map(d => ({
      month: d.month,
      historicalRevenue: d.revenue,
      cost: d.cost,
    })),
  [monthlyTrend]);

  // Combined chart data: Historical + ONNX predictions
  const combinedChartData = useMemo(() => [
    ...monthlyTrend.map(d => ({
      month: d.month,
      historicalRevenue: d.revenue,
      cost: d.cost,
      predictedRevenue: undefined as number | undefined,
    })),
    // Link last historical month to first forecast point
    ...(monthlyTrend.length > 0 && forecast.length > 0
      ? [{
          month: monthlyTrend[monthlyTrend.length - 1].month,
          historicalRevenue: monthlyTrend[monthlyTrend.length - 1].revenue,
          cost: monthlyTrend[monthlyTrend.length - 1].cost,
          predictedRevenue: monthlyTrend[monthlyTrend.length - 1].revenue,
        }]
      : []),
    ...forecast.map(f => ({
      month: `${f.monthName} (AI)`,
      historicalRevenue: undefined as number | undefined,
      cost: undefined as number | undefined,
      predictedRevenue: f.predictedRevenue,
    })),
  ], [monthlyTrend, forecast]);

  // Active chart data based on selected viewMode
  const chartData = useMemo(() => {
    if (viewMode === 'historical') return historicalChartData;
    if (viewMode === 'forecast') return forecast.map(f => ({ month: f.monthName, revenue: f.predictedRevenue }));
    return combinedChartData;
  }, [viewMode, historicalChartData, forecast, combinedChartData]);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Orders"
          value={kpis.activeOrders}
          sub={`${kpis.readyToShip} ready for dispatch`}
          accent="warn"
          icon={<TrendingUp size={18} />}
          trend={{ value: '+3 this week', up: true }}
        />
        <StatCard
          label="Machines Running"
          value={`${kpis.runningMachines}/${kpis.totalMachines}`}
          sub={`${kpis.idleMachines} idle · ${kpis.downMachines} down`}
          accent={kpis.downMachines > 0 ? 'bad' : 'ok'}
          icon={<Factory size={18} />}
        />
        <StatCard
          label="Output Today"
          value={`${kpis.outputToday.toLocaleString()} m`}
          sub="metres of finished fabric"
          accent="default"
          icon={<Activity size={18} />}
          trend={{ value: '+8% vs yesterday', up: true }}
        />
        <StatCard
          label="Low Stock Alerts"
          value={kpis.lowStockCount}
          sub="yarn counts below reorder"
          accent={kpis.lowStockCount > 0 ? 'bad' : 'ok'}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* Chart & Quick Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <h2 className="text-base font-display font-semibold text-[var(--text)]">Financial Performance & Forecast</h2>
              <p className="text-xs text-[var(--text-soft)]">6-Month historical vs ONNX XGBoost revenue forecast</p>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              {(['combined', 'historical', 'forecast'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1 rounded text-xs capitalize transition-colors font-medium ${
                    viewMode === mode
                      ? 'bg-[var(--cyprus)] text-white'
                      : 'text-[var(--text-soft)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--cyprus-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--cyprus-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              
              {viewMode !== 'forecast' && (
                <Area type="monotone" dataKey="historicalRevenue" name="Historical Revenue" stroke="var(--cyprus)" strokeWidth={2.5} fill="var(--cyprus)" fillOpacity={0.15} dot={false} />
              )}
              {viewMode === 'combined' && (
                <Area type="monotone" dataKey="cost" name="Manufacturing Cost" stroke="var(--cyprus-muted)" strokeWidth={1.75} fill="var(--cyprus-light)" fillOpacity={0.35} dot={false} />
              )}
              {viewMode !== 'historical' && (
                <Area type="monotone" dataKey={viewMode === 'forecast' ? 'revenue' : 'predictedRevenue'} name="ONNX Forecast" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" fill="#10b981" fillOpacity={0.2} dot={{ r: 3, fill: '#10b981' }} />
              )}
            </AreaChart>
          </ResponsiveContainer>

          {/* ONNX Model Info Banner */}
          <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--text-soft)]">
              <Sparkles size={16} className="text-emerald-500 flex-shrink-0" />
              <span>
                Model: <strong className="text-[var(--text)] font-mono">revenue_model.onnx</strong> · Runtime: <strong className="text-[var(--text)] font-mono">onnxruntime-node</strong>
              </span>
            </div>
            {forecast.length > 0 && (
              <div className="font-mono text-[var(--text-soft)]">
                Next 6M Forecast Avg: <strong className="text-emerald-600 font-bold">₹{(forecast.reduce((a, b) => a + b.predictedRevenue, 0) / forecast.length / 1000).toFixed(1)}K/mo</strong>
              </div>
            )}
          </div>
        </div>

        {/* Quick Summaries */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="section-title mb-3">QC Batch Status</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Passed',   count: qcCounts.passed,   dot: 'dot-ok' },
                { label: 'Pending',  count: kpis.pendingQC || qcCounts.pending, dot: 'dot-idle' },
                { label: 'Rejected', count: qcCounts.rejected, dot: 'dot-bad' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={item.dot}></span>
                    <span className="text-xs text-[var(--text)]">{item.label}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[var(--text)]">{item.count}</span>
                </div>
              ))}
            </div>
            <button onClick={handleQCLogsClick} className="btn-ghost w-full mt-3 justify-center text-xs">
              View all inspection logs <ArrowRight size={12} className="ml-1" />
            </button>
          </div>

          <div className="card p-4">
            <h3 className="section-title mb-3">Shop Floor Machine Health</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Running',     count: machineHealth.running,     dot: 'dot-ok' },
                { label: 'Idle',        count: machineHealth.idle,        dot: 'dot-idle' },
                { label: 'Maintenance', count: machineHealth.maintenance, dot: 'dot-warn' },
                { label: 'Breakdown',   count: machineHealth.breakdown,   dot: 'dot-bad' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={item.dot}></span>
                    <span className="text-xs text-[var(--text)]">{item.label}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[var(--text)]">{item.count}</span>
                </div>
              ))}
            </div>
            <button onClick={handleShopFloorClick} className="btn-ghost w-full mt-3 justify-center text-xs">
              Open Shop Floor Board <ArrowRight size={12} className="ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Order Pipeline */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--warn)]" />
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">Live Production & Order Pipeline</h2>
          </div>
          <button onClick={handleAllOrdersClick} className="btn-ghost text-xs">
            All orders <ArrowRight size={12} className="ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                {['Order ID', 'Buyer', 'Fabric & Colour', 'Qty (m)', 'Delivery', 'Progress', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 section-title">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {recentOrders.map(order => {
                const pct = order.progressPct ?? Math.round((order.completedMetres / order.targetMetres) * 100);
                return (
                  <tr
                    key={order.id}
                    className="table-row-hover cursor-pointer"
                    onClick={handleOrderRowClick}
                  >
                    <td className="px-5 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)]">{order.id}</td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-[var(--text)]">{order.buyer}</td>
                    <td className="px-5 py-3.5 text-xs text-[var(--text-soft)]">{order.fabric} · {order.colour}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[var(--text)]">{order.targetMetres.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[var(--text-soft)]">{order.deliveryDate}</td>
                    <td className="px-5 py-3.5 w-40">
                      <ProgressBar value={pct} color={pct >= 100 ? 'ok' : pct > 50 ? 'warn' : 'default'} showLabel />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reorder Warnings */}
      {kpis.lowStockCount > 0 && (
        <div className="card p-4 border-l-4 border-l-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-[var(--warn)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                {kpis.lowStockCount} yarn count{kpis.lowStockCount > 1 ? 's' : ''} at or below reorder threshold
              </p>
              <p className="text-xs text-[var(--text-soft)] font-mono mt-0.5">
                {lowStockItems.map(y => `${y.colour} ${y.type}`).join(' · ')}
              </p>
            </div>
          </div>
          <button onClick={handleYarnAlertsClick} className="btn-secondary text-xs flex-shrink-0">
            View Alerts Queue
          </button>
        </div>
      )}
    </div>
  );
}
