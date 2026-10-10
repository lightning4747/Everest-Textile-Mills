import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, AlertTriangle, TrendingUp, Activity, Clock, ArrowRight, Cpu, Sparkles } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { machines, salesOrders, yarnStock, fabricRolls, monthlyData } from '../../data/mockData';
import { fetchRevenueForecast, ForecastPoint } from '../../services/forecastApi';

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

  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'historical' | 'forecast' | 'combined'>('combined');

  useEffect(() => {
    fetchRevenueForecast(11, 1240000, 6)
      .then(res => setForecast(res.forecast))
      .catch(err => console.error('Failed to load ONNX forecast:', err))
      .finally(() => setLoadingForecast(false));
  }, []);

  const stats = useMemo(() => ({
    runningMachines: machines.filter(m => m.status === 'running').length,
    idleMachines: machines.filter(m => m.status === 'idle').length,
    downMachines: machines.filter(m => m.status === 'breakdown' || m.status === 'maintenance').length,
    lowStock: yarnStock.filter(y => y.quantityKg <= y.reorderLevel).length,
    activeOrders: salesOrders.filter(o => !['dispatched'].includes(o.status)).length,
    readyToShip: salesOrders.filter(o => o.status === 'ready_to_ship').length,
    pendingQC: fabricRolls.filter(r => r.qcResult === 'pending').length,
    totalOutputToday: machines.reduce((s, m) => s + m.outputToday, 0),
    recentOrders: salesOrders.slice(0, 5),
    qcCounts: {
      passed: fabricRolls.filter(r => r.qcResult === 'passed').length,
      pending: fabricRolls.filter(r => r.qcResult === 'pending').length,
      rework: fabricRolls.filter(r => r.qcResult === 'rework').length,
      rejected: fabricRolls.filter(r => r.qcResult === 'rejected').length,
    },
    machineHealth: {
      running: machines.filter(m => m.status === 'running').length,
      idle: machines.filter(m => m.status === 'idle').length,
      maintenance: machines.filter(m => m.status === 'maintenance').length,
      breakdown: machines.filter(m => m.status === 'breakdown').length,
    },
    lowStockItems: yarnStock.filter(y => y.quantityKg <= y.reorderLevel),
  }), []);

  const handleOrderRowClick = useCallback(() => navigate('/sales/status'), [navigate]);
  const handleAllOrdersClick = useCallback(() => navigate('/sales/orders'), [navigate]);
  const handleQCLogsClick = useCallback(() => navigate('/quality/checks'), [navigate]);
  const handleShopFloorClick = useCallback(() => navigate('/production/shopfloor'), [navigate]);
  const handleYarnAlertsClick = useCallback(() => navigate('/yarn/alerts'), [navigate]);

  // Combined chart data: Historical + ONNX predictions
  const combinedChartData = [
    ...monthlyData.map(d => ({
      month: d.month,
      historicalRevenue: d.revenue,
      cost: d.cost,
      predictedRevenue: undefined as number | undefined,
    })),
    // Link last historical month to first forecast point
    ...(monthlyData.length > 0 && forecast.length > 0
      ? [{
          month: monthlyData[monthlyData.length - 1].month,
          historicalRevenue: monthlyData[monthlyData.length - 1].revenue,
          cost: monthlyData[monthlyData.length - 1].cost,
          predictedRevenue: monthlyData[monthlyData.length - 1].revenue,
        }]
      : []),
    ...forecast.map(f => ({
      month: `${f.monthName} (AI)`,
      historicalRevenue: undefined as number | undefined,
      cost: undefined as number | undefined,
      predictedRevenue: f.predictedRevenue,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Orders"
          value={stats.activeOrders}
          sub={`${stats.readyToShip} ready for dispatch`}
          accent="warn"
          icon={<TrendingUp size={18} />}
          trend={{ value: '+3 this week', up: true }}
        />
        <StatCard
          label="Machines Running"
          value={`${stats.runningMachines}/${machines.length}`}
          sub={`${stats.idleMachines} idle · ${stats.downMachines} down`}
          accent={stats.downMachines > 0 ? 'bad' : 'ok'}
          icon={<Factory size={18} />}
        />
        <StatCard
          label="Output Today"
          value={`${stats.totalOutputToday.toLocaleString()} m`}
          sub="metres of finished fabric"
          accent="default"
          icon={<Activity size={18} />}
          trend={{ value: '+8% vs yesterday', up: true }}
        />
        <StatCard
          label="Low Stock Alerts"
          value={stats.lowStock}
          sub="yarn counts below reorder"
          accent={stats.lowStock > 0 ? 'bad' : 'ok'}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* Chart & Quick Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-semibold text-[var(--text)]">Financial Performance & Forecast</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Cpu size={12} /> ONNX Engine
                </span>
              </div>
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
            <AreaChart data={viewMode === 'forecast' ? forecast.map(f => ({ month: f.monthName, revenue: f.predictedRevenue })) : combinedChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
                { label: 'Passed',   count: stats.qcCounts.passed,   dot: 'dot-ok' },
                { label: 'Pending',  count: stats.pendingQC,          dot: 'dot-idle' },
                { label: 'Rework',   count: stats.qcCounts.rework,   dot: 'dot-warn' },
                { label: 'Rejected', count: stats.qcCounts.rejected, dot: 'dot-bad' },
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
                { label: 'Running',     count: stats.machineHealth.running,     dot: 'dot-ok' },
                { label: 'Idle',        count: stats.machineHealth.idle,        dot: 'dot-idle' },
                { label: 'Maintenance', count: stats.machineHealth.maintenance, dot: 'dot-warn' },
                { label: 'Breakdown',   count: stats.machineHealth.breakdown,   dot: 'dot-bad' },
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
              {stats.recentOrders.map(order => {
                const pct = Math.round((order.completedMetres / order.quantityMetres) * 100);
                return (
                  <tr
                    key={order.id}
                    className="table-row-hover cursor-pointer"
                    onClick={handleOrderRowClick}
                  >
                    <td className="px-5 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)]">{order.id}</td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-[var(--text)]">{order.buyer}</td>
                    <td className="px-5 py-3.5 text-xs text-[var(--text-soft)]">{order.fabricType} · {order.colour}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[var(--text)]">{order.quantityMetres.toLocaleString()}</td>
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
      {stats.lowStock > 0 && (
        <div className="card p-4 border-l-4 border-l-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-[var(--warn)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                {stats.lowStock} yarn count{stats.lowStock > 1 ? 's' : ''} at or below reorder threshold
              </p>
              <p className="text-xs text-[var(--text-soft)] font-mono mt-0.5">
                {stats.lowStockItems.map(y => `${y.colour} ${y.type}`).join(' · ')}
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
