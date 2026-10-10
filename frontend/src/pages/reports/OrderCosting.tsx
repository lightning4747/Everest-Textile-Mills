import { TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { orderCosts, salesOrders } from '../../data/mockData';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-lg">
        <p className="text-slate-600 mb-2 font-medium">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="mb-0.5">{p.name}: ₹{(p.value / 1000).toFixed(1)}K</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function OrderCosting() {
  const totalRevenue = orderCosts.reduce((s, o) => s + o.revenue, 0);
  const totalCost    = orderCosts.reduce((s, o) => s + o.totalCost, 0);
  const totalProfit  = orderCosts.reduce((s, o) => s + o.profit, 0);
  const margin       = Math.round((totalProfit / totalRevenue) * 100);

  const chartData = orderCosts.map(o => {
    const order = salesOrders.find(s => s.id === o.orderId);
    return { name: o.orderId, buyer: order?.buyer ?? '', Revenue: o.revenue, 'Total Cost': o.totalCost, Profit: o.profit };
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${(totalRevenue/100000).toFixed(1)}L`, color: 'text-emerald-600' },
          { label: 'Total Cost',    value: `₹${(totalCost/100000).toFixed(1)}L`,    color: 'text-slate-700' },
          { label: 'Total Profit',  value: `₹${(totalProfit/100000).toFixed(1)}L`,  color: 'text-amber-600' },
          { label: 'Avg. Margin',   value: `${margin}%`,                             color: margin > 50 ? 'text-emerald-600' : 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1">{s.label}</p>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-800 mb-4">Revenue vs Cost per Order</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
            <Bar dataKey="Revenue"    fill="#10B981" radius={[3,3,0,0]} />
            <Bar dataKey="Total Cost" fill="#CBD5E1" radius={[3,3,0,0]} />
            <Bar dataKey="Profit"     fill="#F59E0B" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Cost Breakdown per Order</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Order ID','Buyer','Yarn Cost','Labour Cost','Machine Cost','Total Cost','Revenue','Profit','Margin'].map(h=>(
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderCosts.map(o => {
              const m = Math.round((o.profit / o.revenue) * 100);
              return (
                <tr key={o.orderId} className="border-b border-slate-50 table-row-hover">
                  <td className="px-4 py-3 text-xs font-mono text-amber-600 font-semibold">{o.orderId}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{o.buyer}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">₹{(o.yarnCost/1000).toFixed(0)}K</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">₹{(o.labourCost/1000).toFixed(0)}K</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">₹{(o.machineCost/1000).toFixed(0)}K</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-700 font-semibold">₹{(o.totalCost/1000).toFixed(0)}K</td>
                  <td className="px-4 py-3 text-xs font-mono text-emerald-600 font-semibold">₹{(o.revenue/1000).toFixed(0)}K</td>
                  <td className="px-4 py-3 text-xs font-mono text-amber-600 font-semibold">₹{(o.profit/1000).toFixed(0)}K</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {m > 50 ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-amber-500" />}
                      <span className={`text-xs font-mono ${m > 50 ? 'text-emerald-600' : 'text-amber-600'}`}>{m}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
