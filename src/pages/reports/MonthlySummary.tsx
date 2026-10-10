import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { monthlyData, orderCosts } from '../../data/mockData';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-lg space-y-1">
        <p className="text-slate-700 font-medium">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.name === 'Output (m)' ? `${p.value.toLocaleString()} m` : `₹${(p.value/1000).toFixed(0)}K`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonthlySummary() {
  const latest    = monthlyData[monthlyData.length - 1];
  const prev      = monthlyData[monthlyData.length - 2];
  const revGrowth = Math.round(((latest.revenue - prev.revenue) / prev.revenue) * 100);
  const totalWages    = 385000;
  const totalMatCost  = orderCosts.reduce((s, o) => s + o.yarnCost, 0);

  const chartData = monthlyData.map(d => ({
    month: d.month, Revenue: d.revenue, Cost: d.cost, 'Output (m)': d.output,
  }));

  return (
    <div className="space-y-5">
      <div className="card p-5 border-amber-200 bg-amber-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Current Month Summary</p>
            <p className="text-2xl font-bold text-slate-800">October 2026</p>
          </div>
          <div className={`text-sm font-semibold ${revGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {revGrowth >= 0 ? '↑' : '↓'} {Math.abs(revGrowth)}% vs Sep
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (Oct)',    value: `₹${(latest.revenue/100000).toFixed(2)}L`, color: 'text-emerald-600' },
          { label: 'Total Cost (Oct)', value: `₹${(latest.cost/100000).toFixed(2)}L`,    color: 'text-slate-700' },
          { label: 'Output (Oct)',     value: `${latest.output.toLocaleString()} m`,      color: 'text-amber-600' },
          { label: 'Worker Wages',     value: `₹${(totalWages/100000).toFixed(2)}L`,     color: 'text-slate-700' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1">{s.label}</p>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-800 mb-4">6-Month Trend — Revenue, Cost & Output</p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left"  tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
            <Bar yAxisId="left" dataKey="Revenue" fill="#10B981" opacity={0.8} radius={[3,3,0,0]} />
            <Bar yAxisId="left" dataKey="Cost"    fill="#CBD5E1" opacity={0.8} radius={[3,3,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="Output (m)" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">Cost Breakdown (Oct)</p>
          <div className="space-y-3">
            {[
              { label: 'Raw Material (Yarn)', amount: totalMatCost,                                 color: 'bg-amber-400', pct: 52 },
              { label: 'Worker Wages',        amount: totalWages,                                   color: 'bg-sky-400',   pct: 28 },
              { label: 'Machine & Overhead',  amount: latest.cost - totalMatCost - totalWages,      color: 'bg-purple-400', pct: 20 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-mono text-slate-700 font-semibold">₹{(item.amount/1000).toFixed(0)}K</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">P&L Summary (Oct)</p>
          <div className="space-y-2">
            {[
              { label: 'Gross Revenue',  value: latest.revenue,                             color: 'text-emerald-600', border: '' },
              { label: 'Less: Material', value: -totalMatCost,                              color: 'text-red-500',     border: '' },
              { label: 'Less: Wages',    value: -totalWages,                                color: 'text-red-500',     border: '' },
              { label: 'Less: Overhead', value: -(latest.cost - totalMatCost - totalWages), color: 'text-red-500',     border: '' },
              { label: 'Net Profit',     value: latest.revenue - latest.cost,               color: 'text-amber-600',   border: 'border-t border-slate-200 pt-2 mt-2' },
            ].map(row => (
              <div key={row.label} className={`flex justify-between text-xs ${row.border}`}>
                <span className="text-slate-500">{row.label}</span>
                <span className={`font-mono font-semibold ${row.color}`}>
                  {row.value >= 0 ? '' : '−'}₹{(Math.abs(row.value)/1000).toFixed(0)}K
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
