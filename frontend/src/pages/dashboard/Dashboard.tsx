import { useNavigate } from 'react-router-dom';
import { Factory, AlertTriangle, TrendingUp, Activity, Clock, ArrowRight } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { machines, salesOrders, yarnStock, fabricRolls, monthlyData } from '../../data/mockData';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="card p-3 text-xs shadow-md border border-[var(--border)]">
        <p className="text-[var(--text-soft)] mb-1.5 font-medium font-mono">{label}</p>
        {payload.map((p: any) => (
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

  const runningMachines = machines.filter(m => m.status === 'running').length;
  const idleMachines    = machines.filter(m => m.status === 'idle').length;
  const downMachines    = machines.filter(m => m.status === 'breakdown' || m.status === 'maintenance').length;
  const lowStock        = yarnStock.filter(y => y.quantityKg <= y.reorderLevel).length;
  const activeOrders    = salesOrders.filter(o => !['dispatched'].includes(o.status)).length;
  const readyToShip     = salesOrders.filter(o => o.status === 'ready_to_ship').length;
  const pendingQC       = fabricRolls.filter(r => r.qcResult === 'pending').length;
  const totalOutputToday = machines.reduce((s, m) => s + m.outputToday, 0);

  const recentOrders = salesOrders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Orders"
          value={activeOrders}
          sub={`${readyToShip} ready for dispatch`}
          accent="warn"
          icon={<TrendingUp size={18} />}
          trend={{ value: '+3 this week', up: true }}
        />
        <StatCard
          label="Machines Running"
          value={`${runningMachines}/${machines.length}`}
          sub={`${idleMachines} idle · ${downMachines} down`}
          accent={downMachines > 0 ? 'bad' : 'ok'}
          icon={<Factory size={18} />}
        />
        <StatCard
          label="Output Today"
          value={`${totalOutputToday.toLocaleString()} m`}
          sub="metres of finished fabric"
          accent="default"
          icon={<Activity size={18} />}
          trend={{ value: '+8% vs yesterday', up: true }}
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStock}
          sub="yarn counts below reorder"
          accent={lowStock > 0 ? 'bad' : 'ok'}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* Chart & Quick Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-[var(--text)]">Revenue vs Manufacturing Cost</h2>
              <p className="text-xs text-[var(--text-soft)]">6-Month financial trend (₹ Lakhs)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-soft)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--cyprus)] inline-block"></span>
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--cyprus-muted)] inline-block"></span>
                Cost
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--cyprus-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--cyprus-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--cyprus)" strokeWidth={2.5} fill="var(--cyprus)" fillOpacity={0.15} dot={false} />
              <Area type="monotone" dataKey="cost" name="Cost" stroke="var(--cyprus-muted)" strokeWidth={1.75} fill="var(--cyprus-light)" fillOpacity={0.45} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Summaries */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="section-title mb-3">QC Batch Status</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Passed',   count: fabricRolls.filter(r => r.qcResult === 'passed').length,   dot: 'dot-ok' },
                { label: 'Pending',  count: pendingQC,                                                  dot: 'dot-idle' },
                { label: 'Rework',   count: fabricRolls.filter(r => r.qcResult === 'rework').length,   dot: 'dot-warn' },
                { label: 'Rejected', count: fabricRolls.filter(r => r.qcResult === 'rejected').length, dot: 'dot-bad' },
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
            <button onClick={() => navigate('/quality/checks')} className="btn-ghost w-full mt-3 justify-center text-xs">
              View all inspection logs <ArrowRight size={12} className="ml-1" />
            </button>
          </div>

          <div className="card p-5">
            <h3 className="section-title mb-3">Shop Floor Machine Health</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Running',     count: runningMachines,                                         dot: 'dot-ok' },
                { label: 'Idle',        count: idleMachines,                                            dot: 'dot-idle' },
                { label: 'Maintenance', count: machines.filter(m => m.status === 'maintenance').length, dot: 'dot-warn' },
                { label: 'Breakdown',   count: machines.filter(m => m.status === 'breakdown').length,   dot: 'dot-bad' },
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
            <button onClick={() => navigate('/production/shopfloor')} className="btn-ghost w-full mt-3 justify-center text-xs">
              Open Shop Floor Board <ArrowRight size={12} className="ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Order Pipeline */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--warn)]" />
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">Live Production & Order Pipeline</h2>
          </div>
          <button onClick={() => navigate('/sales/orders')} className="btn-ghost text-xs">
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
                const pct = Math.round((order.completedMetres / order.quantityMetres) * 100);
                return (
                  <tr
                    key={order.id}
                    className="table-row-hover cursor-pointer"
                    onClick={() => navigate('/sales/status')}
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
      {lowStock > 0 && (
        <div className="card p-4 border-l-4 border-l-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-[var(--warn)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                {lowStock} yarn count{lowStock > 1 ? 's' : ''} at or below reorder threshold
              </p>
              <p className="text-xs text-[var(--text-soft)] font-mono mt-0.5">
                {yarnStock.filter(y => y.quantityKg <= y.reorderLevel).map(y => `${y.colour} ${y.type}`).join(' · ')}
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/yarn/alerts')} className="btn-secondary text-xs flex-shrink-0">
            View Alerts Queue
          </button>
        </div>
      )}
    </div>
  );
}
