import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { monthlyData, orderCosts } from '../../data/mockData';
import { exportCsv } from '../../utils/exportCsv';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; stroke?: string; fill?: string }>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="card p-3 text-xs shadow-md border border-[var(--border)] space-y-1">
        <p className="text-[var(--text)] font-semibold font-mono">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.stroke || p.fill }} className="font-mono">
            {p.name}: {p.name === 'Output (m)' ? `${p.value.toLocaleString()} m` : `₹${(p.value / 1000).toFixed(0)}K`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ALL_MONTHS = monthlyData.map(d => d.month);

export default function MonthlySummary() {
  // Month range filter — from/to index into monthlyData
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx,   setToIdx]   = useState(monthlyData.length - 1);

  const filtered = useMemo(() =>
    monthlyData.slice(fromIdx, toIdx + 1),
  [fromIdx, toIdx]);

  const { latest, prev, revGrowth, totalMatCost, chartData } = useMemo(() => {
    const latest       = filtered[filtered.length - 1] ?? monthlyData[monthlyData.length - 1];
    const prev         = filtered.length > 1 ? filtered[filtered.length - 2] : monthlyData[monthlyData.length - 2];
    const revGrowth    = Math.round(((latest.revenue - prev.revenue) / prev.revenue) * 100);
    const totalMatCost = orderCosts.reduce((s, o) => s + o.yarnCost, 0);
    const chartData    = filtered.map(d => ({
      month: d.month, Revenue: d.revenue, 'Manufacturing Cost': d.cost, 'Output (m)': d.output,
    }));
    return { latest, prev, revGrowth, totalMatCost, chartData };
  }, [filtered]);

  const totalWages = 385000;

  function handleExport() {
    exportCsv(
      `monthly-summary-${ALL_MONTHS[fromIdx]}-to-${ALL_MONTHS[toIdx]}.csv`,
      ['Month', 'Revenue (₹)', 'Mill Cost (₹)', 'Output (m)', 'Gross Profit (₹)', 'Margin (%)'],
      filtered.map(d => [
        d.month,
        d.revenue,
        d.cost,
        d.output,
        d.revenue - d.cost,
        Math.round(((d.revenue - d.cost) / d.revenue) * 100),
      ]),
    );
  }

  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 print-hide">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Monthly Production &amp; P&amp;L Summary</h2>
        <div className="flex items-center gap-2">
          <button className="btn-secondary h-9 text-xs" onClick={handleExport}>
            <Download size={14} /> Export CSV ({filtered.length} months)
          </button>
          <button className="btn-primary h-9 text-xs" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Month range filter */}
      <div className="flex items-center gap-3 flex-wrap print-hide">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-soft)] font-medium">From</label>
          <select
            value={fromIdx}
            onChange={e => {
              const v = Number(e.target.value);
              setFromIdx(v);
              if (v > toIdx) setToIdx(v);
            }}
            className="input-field h-9 text-xs font-mono w-32"
          >
            {ALL_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-soft)] font-medium">To</label>
          <select
            value={toIdx}
            onChange={e => {
              const v = Number(e.target.value);
              setToIdx(v);
              if (v < fromIdx) setFromIdx(v);
            }}
            className="input-field h-9 text-xs font-mono w-32"
          >
            {ALL_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </div>
        {(fromIdx !== 0 || toIdx !== monthlyData.length - 1) && (
          <button className="btn-ghost h-9 text-xs" onClick={() => { setFromIdx(0); setToIdx(monthlyData.length - 1); }}>
            Reset
          </button>
        )}
        <span className="text-xs font-mono text-[var(--text-soft)]">{filtered.length} month{filtered.length !== 1 ? 's' : ''} selected</span>
      </div>

      {/* Period header */}
      <div className="card p-5 border-l-4 border-l-[var(--olive-dark)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="stat-label mb-1">Fiscal Operations Review</p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-[var(--text)]">
              {filtered.length === 1 ? latest.month : `${ALL_MONTHS[fromIdx]} – ${ALL_MONTHS[toIdx]}`}
            </h2>
          </div>
          <div className={`text-sm font-semibold font-mono px-3 py-1.5 rounded-lg border ${
            revGrowth >= 0
              ? 'text-[var(--ok)] border-[var(--ok)] bg-[var(--panel-bg)]'
              : 'text-[var(--bad)] border-[var(--bad)] bg-[var(--panel-bg)]'
          }`}>
            {revGrowth >= 0 ? '↑ +' : '↓ '}{Math.abs(revGrowth)}% vs {prev.month}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Revenue (${latest.month})`,   value: `₹${(latest.revenue / 100000).toFixed(2)}L`, accent: 'text-[var(--olive-dark)]' },
          { label: 'Total Mill Cost',              value: `₹${(latest.cost / 100000).toFixed(2)}L`,   accent: 'text-[var(--text-soft)]' },
          { label: 'Output Volume',                value: `${latest.output.toLocaleString()} m`,      accent: 'text-[var(--text)]' },
          { label: 'Shopfloor Wages',              value: `₹${(totalWages / 100000).toFixed(2)}L`,    accent: 'text-[var(--text-soft)]' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1.5">{s.label}</p>
            <p className={`font-display text-3xl md:text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h2 className="text-base font-display font-semibold text-[var(--text)] mb-4">
          Trend — Revenue, Costs & Fabric Yield
          <span className="text-xs font-sans font-normal text-[var(--text-soft)] ml-2">({ALL_MONTHS[fromIdx]} – {ALL_MONTHS[toIdx]})</span>
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--cyprus-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left"  tick={{ fill: 'var(--cyprus-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--cyprus-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-soft)' }} />
            <Bar yAxisId="left" dataKey="Revenue" fill="var(--cyprus)" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="Manufacturing Cost" fill="var(--cyprus-light)" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="Output (m)" stroke="var(--ok)" strokeWidth={2.5} dot={{ fill: 'var(--ok)', r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Cost breakdown + P&L */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-sm font-display font-semibold text-[var(--text)] mb-4">Cost Structure Distribution ({latest.month})</h3>
          <div className="space-y-3.5">
            {[
              { label: 'Raw Fiber / Yarn',     amount: totalMatCost,                              color: 'bg-[var(--olive-dark)]', pct: 52 },
              { label: 'Worker & Staff Wages', amount: totalWages,                                color: 'bg-[var(--warn)]',       pct: 28 },
              { label: 'Power, Steam & Opex',  amount: Math.abs(latest.cost - totalMatCost - totalWages),   color: 'bg-[var(--panel-border)]', pct: 20 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-[var(--text)]">{item.label}</span>
                  <span className="font-mono text-[var(--text)] font-bold">₹{(item.amount / 1000).toFixed(0)}K ({item.pct}%)</span>
                </div>
                <div className="h-2 bg-[var(--panel-bg)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-display font-semibold text-[var(--text)] mb-4">P&L Operating Ledger ({latest.month})</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Gross Invoiced Revenue',   value: latest.revenue,                              accent: 'text-[var(--olive-dark)]', border: '' },
              { label: 'Less: Material Consumed',  value: -totalMatCost,                               accent: 'text-[var(--bad)]',        border: '' },
              { label: 'Less: Plant Wages',        value: -totalWages,                                 accent: 'text-[var(--bad)]',        border: '' },
              { label: 'Less: Machine Opex',       value: -(Math.abs(latest.cost - totalMatCost - totalWages)),  accent: 'text-[var(--bad)]',        border: '' },
              { label: 'Net Mill Operating Profit',value: latest.revenue - latest.cost,               accent: 'text-[var(--ok)] font-bold text-sm', border: 'border-t border-[var(--border)] pt-2.5 mt-2.5' },
            ].map(row => (
              <div key={row.label} className={`flex justify-between text-xs ${row.border}`}>
                <span className="text-[var(--text-soft)]">{row.label}</span>
                <span className={`font-mono ${row.accent}`}>
                  {row.value >= 0 ? '' : '−'}₹{(Math.abs(row.value) / 1000).toFixed(0)}K
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
