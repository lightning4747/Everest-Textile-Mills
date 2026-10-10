import { useNavigate } from 'react-router-dom';
import { Factory, AlertTriangle, TrendingUp, Activity, Clock } from 'lucide-react';
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
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-lg">
        <p className="text-slate-500 mb-1 font-medium">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Orders"      value={activeOrders}                    sub={`${readyToShip} ready to ship`}             accent="amber"                          icon={<TrendingUp size={16} />} trend={{ value: '+3 this week', up: true }} />
        <StatCard label="Machines Running"   value={`${runningMachines}/${machines.length}`} sub={`${idleMachines} idle · ${downMachines} down`} accent={downMachines > 0 ? 'red' : 'green'} icon={<Factory size={16} />} />
        <StatCard label="Output Today"       value={`${totalOutputToday.toLocaleString()} m`} sub="metres of fabric"                            accent="sky"                            icon={<Activity size={16} />} trend={{ value: '+8% vs yesterday', up: true }} />
        <StatCard label="Low Stock Alerts"   value={lowStock}                        sub="yarn types need reorder"                    accent={lowStock > 0 ? 'red' : 'green'}  icon={<AlertTriangle size={16} />} />
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Revenue vs Cost</p>
              <p className="text-xs text-slate-400">Last 6 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block"></span>Cost</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#94A3B8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#F59E0B" strokeWidth={2} fill="url(#revGrad)" dot={false} />
              <Area type="monotone" dataKey="cost"    name="Cost"    stroke="#94A3B8" strokeWidth={2} fill="url(#costGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="space-y-3">
          <div className="card p-4">
            <p className="section-title mb-3">QC Summary</p>
            <div className="space-y-2">
              {[
                { label: 'Passed',   count: fabricRolls.filter(r => r.qcResult === 'passed').length,   color: 'bg-emerald-500' },
                { label: 'Pending',  count: pendingQC,                                                  color: 'bg-amber-400' },
                { label: 'Rework',   count: fabricRolls.filter(r => r.qcResult === 'rework').length,   color: 'bg-orange-400' },
                { label: 'Rejected', count: fabricRolls.filter(r => r.qcResult === 'rejected').length, color: 'bg-red-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-700">{item.count}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/quality/checks')} className="btn-ghost w-full mt-3 justify-center text-xs">
              View all checks →
            </button>
          </div>

          <div className="card p-4">
            <p className="section-title mb-3">Machine Health</p>
            <div className="space-y-2">
              {[
                { label: 'Running',     count: runningMachines,                                              color: 'bg-emerald-500' },
                { label: 'Idle',        count: idleMachines,                                                 color: 'bg-slate-300' },
                { label: 'Maintenance', count: machines.filter(m => m.status === 'maintenance').length,      color: 'bg-amber-400' },
                { label: 'Breakdown',   count: machines.filter(m => m.status === 'breakdown').length,        color: 'bg-red-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-700">{item.count}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/production/shopfloor')} className="btn-ghost w-full mt-3 justify-center text-xs">
              Shop Floor →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-amber-500" />
            <p className="text-sm font-semibold text-slate-800">Live Order Pipeline</p>
          </div>
          <button onClick={() => navigate('/sales/orders')} className="btn-ghost text-xs">
            All orders →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Order ID', 'Buyer', 'Fabric', 'Qty (m)', 'Delivery', 'Progress', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left section-title">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => {
                const pct = Math.round((order.completedMetres / order.quantityMetres) * 100);
                return (
                  <tr key={order.id} className="border-b border-slate-50 table-row-hover cursor-pointer" onClick={() => navigate('/sales/status')}>
                    <td className="px-5 py-3 text-xs font-mono text-amber-600 font-semibold">{order.id}</td>
                    <td className="px-5 py-3 text-xs text-slate-800 font-medium">{order.buyer}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{order.fabricType} · {order.colour}</td>
                    <td className="px-5 py-3 text-xs font-mono text-slate-700">{order.quantityMetres.toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{order.deliveryDate}</td>
                    <td className="px-5 py-3 w-36">
                      <ProgressBar value={pct} color={pct > 80 ? 'green' : 'amber'} showLabel />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts strip */}
      {lowStock > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">{lowStock} yarn type{lowStock > 1 ? 's' : ''} below reorder level</p>
              <p className="text-xs text-amber-600/70">
                {yarnStock.filter(y => y.quantityKg <= y.reorderLevel).map(y => `${y.colour} ${y.type}`).join(' · ')}
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/yarn/alerts')} className="btn-secondary text-xs flex-shrink-0">
            View Alerts
          </button>
        </div>
      )}
    </div>
  );
}
