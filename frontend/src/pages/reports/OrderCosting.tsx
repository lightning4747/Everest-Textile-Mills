import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Download, Printer, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { orderCosts, salesOrders } from '../../data/mockData';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import { exportCsv } from '../../utils/exportCsv';
import { useDebounce } from '../../hooks/useDebounce';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="card p-3 text-xs shadow-md border border-[var(--border)]">
        <p className="text-[var(--text-soft)] mb-2 font-mono font-medium">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }} className="mb-0.5 font-mono">
            {p.name}: ₹{(p.value / 1000).toFixed(1)}K
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ALL = 'all';

// Enrich with buyer name for filtering
const enriched = orderCosts.map(o => ({
  ...o,
  buyer: salesOrders.find(s => s.id === o.orderId)?.buyer ?? o.buyer,
}));

const buyers = [...new Set(enriched.map(o => o.buyer))];

export default function OrderCosting() {
  const [search, setSearch]     = useState('');
  const [buyerFilter, setBuyer] = useState(ALL);
  const debouncedSearch         = useDebounce(search, 300);

  const filtered = useMemo(() =>
    enriched.filter(o => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch = !q || o.orderId.toLowerCase().includes(q) || o.buyer.toLowerCase().includes(q);
      const matchBuyer  = buyerFilter === ALL || o.buyer === buyerFilter;
      return matchSearch && matchBuyer;
    }),
  [debouncedSearch, buyerFilter]);

  const { totalRevenue, totalCost, totalProfit, margin, chartData } = useMemo(() => {
    const totalRevenue = filtered.reduce((s, o) => s + o.revenue, 0);
    const totalCost    = filtered.reduce((s, o) => s + o.totalCost, 0);
    const totalProfit  = filtered.reduce((s, o) => s + o.profit, 0);
    const margin       = totalRevenue ? Math.round((totalProfit / totalRevenue) * 100) : 0;
    const chartData    = filtered.map(o => ({
      name: o.orderId,
      Revenue: o.revenue,
      'Manufacturing Cost': o.totalCost,
      'Gross Profit': o.profit,
    }));
    return { totalRevenue, totalCost, totalProfit, margin, chartData };
  }, [filtered]);

  const { paginatedData, ...paginationProps } = usePagination(filtered, 20);

  function handleExport() {
    exportCsv(
      `order-costing${buyerFilter !== ALL ? `-${buyerFilter.replace(/\s+/g, '-')}` : ''}.csv`,
      ['Order ID', 'Buyer', 'Yarn Cost (₹)', 'Labour Cost (₹)', 'Machine Cost (₹)', 'Total Cost (₹)', 'Revenue (₹)', 'Profit (₹)', 'Margin (%)'],
      filtered.map(o => [
        o.orderId, o.buyer,
        o.yarnCost, o.labourCost, o.machineCost,
        o.totalCost, o.revenue, o.profit,
        Math.round((o.profit / o.revenue) * 100),
      ]),
    );
  }

  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 print-hide">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Order Costing &amp; Margins Report</h2>
        <div className="flex items-center gap-2">
          <button className="btn-secondary h-9 text-xs" onClick={handleExport}>
            <Download size={14} /> Export CSV ({filtered.length})
          </button>
          <button className="btn-primary h-9 text-xs" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap print-hide">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-3 text-[var(--text-soft)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search order ID, buyer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field h-9 pl-8 pr-3 text-xs font-mono w-52"
          />
        </div>
        <select value={buyerFilter} onChange={e => setBuyer(e.target.value)} className="input-field h-9 text-xs font-mono w-48">
          <option value={ALL}>All Buyers</option>
          {buyers.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {(buyerFilter !== ALL || search) && (
          <button className="btn-ghost h-9 text-xs" onClick={() => { setSearch(''); setBuyer(ALL); }}>
            Reset
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue',   value: `₹${(totalRevenue / 100000).toFixed(1)}L`, accent: 'text-[var(--olive-dark)]' },
          { label: 'Total Mill Cost', value: `₹${(totalCost / 100000).toFixed(1)}L`,   accent: 'text-[var(--text-soft)]' },
          { label: 'Gross Profit',    value: `₹${(totalProfit / 100000).toFixed(1)}L`, accent: 'text-[var(--ok)]' },
          { label: 'Blended Margin',  value: `${margin}%`,                             accent: margin > 50 ? 'text-[var(--ok)]' : 'text-[var(--warn)]' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1.5">{s.label}</p>
            <p className={`font-display text-3xl md:text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h2 className="text-base font-display font-semibold text-[var(--text)] mb-4">Revenue vs Cost Breakdown — Filtered Orders</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--cyprus-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--cyprus-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-soft)' }} />
            <Bar dataKey="Revenue" fill="var(--cyprus)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Manufacturing Cost" fill="var(--cyprus-light)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Gross Profit" fill="var(--ok)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">Cost Allocation & Margins Ledger</h2>
          <span className="text-xs font-mono text-[var(--text-soft)]">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-[var(--text-soft)]">No orders match the current filters.</p>
            <button className="btn-ghost mt-3 text-xs" onClick={() => { setSearch(''); setBuyer(ALL); }}>Reset Filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--panel-bg)]">
                  <th className="px-4 py-3 section-title whitespace-nowrap text-left">Order ID</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-right">Yarn Cost</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-right">Labour</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-right">Machine Opex</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-right">Total Cost</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-right">Revenue</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-right">Profit</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {paginatedData.map(o => {
                  const m = Math.round((o.profit / o.revenue) * 100);
                  return (
                    <tr key={o.orderId} className="table-row-hover">
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{o.orderId}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{o.buyer}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right tabular-nums">₹{(o.yarnCost / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right tabular-nums">₹{(o.labourCost / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right tabular-nums">₹{(o.machineCost / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--text)] text-right tabular-nums">₹{(o.totalCost / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-right tabular-nums">₹{(o.revenue / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--ok)] text-right tabular-nums">₹{(o.profit / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {m > 50 ? <TrendingUp size={13} className="text-[var(--ok)]" /> : <TrendingDown size={13} className="text-[var(--warn)]" />}
                          <span className={`text-xs font-mono font-bold ${m > 50 ? 'text-[var(--ok)]' : 'text-[var(--warn)]'}`}>{m}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...paginationProps} />
      </div>
    </div>
  );
}
