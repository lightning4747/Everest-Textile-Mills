import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Download, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { orderCosts, salesOrders } from '../../data/mockData';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import { exportCsv } from '../../utils/exportCsv';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="card p-3 text-xs shadow-md border border-[var(--border)]">
        <p className="text-[var(--text-soft)] mb-2 font-mono font-medium">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="mb-0.5 font-mono">
            {p.name}: ₹{(p.value / 1000).toFixed(1)}K
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function OrderCosting() {
  const { totalRevenue, totalCost, totalProfit, margin, chartData } = useMemo(() => {
    const totalRevenue = orderCosts.reduce((s, o) => s + o.revenue, 0);
    const totalCost    = orderCosts.reduce((s, o) => s + o.totalCost, 0);
    const totalProfit  = orderCosts.reduce((s, o) => s + o.profit, 0);
    const margin       = Math.round((totalProfit / totalRevenue) * 100);
    const chartData    = orderCosts.map(o => {
      const order = salesOrders.find(s => s.id === o.orderId);
      return { name: o.orderId, buyer: order?.buyer ?? '', Revenue: o.revenue, 'Manufacturing Cost': o.totalCost, 'Gross Profit': o.profit };
    });
    return { totalRevenue, totalCost, totalProfit, margin, chartData };
  }, []);

  const { paginatedData, ...paginationProps } = usePagination(orderCosts, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print-hide">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Order Costing &amp; Margins Report</h2>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary h-9 text-xs"
            onClick={() =>
              exportCsv(
                'order-costing.csv',
                ['Order ID', 'Buyer', 'Yarn Cost (₹)', 'Labour Cost (₹)', 'Machine Cost (₹)', 'Total Cost (₹)', 'Revenue (₹)', 'Profit (₹)', 'Margin (%)'],
                orderCosts.map(o => [
                  o.orderId,
                  o.buyer,
                  o.yarnCost,
                  o.labourCost,
                  o.machineCost,
                  o.totalCost,
                  o.revenue,
                  o.profit,
                  Math.round((o.profit / o.revenue) * 100),
                ]),
              )
            }
          >
            <Download size={14} />
            Export CSV
          </button>
          <button className="btn-primary h-9 text-xs" onClick={() => window.print()}>
            <Printer size={14} />
            Print Report
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${(totalRevenue/100000).toFixed(1)}L`, accent: 'text-[var(--olive-dark)]' },
          { label: 'Total Mill Cost', value: `₹${(totalCost/100000).toFixed(1)}L`,    accent: 'text-[var(--text-soft)]' },
          { label: 'Gross Profit',  value: `₹${(totalProfit/100000).toFixed(1)}L`,  accent: 'text-[var(--ok)]' },
          { label: 'Blended Margin',value: `${margin}%`,                             accent: margin > 50 ? 'text-[var(--ok)]' : 'text-[var(--warn)]' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="stat-label mb-1.5">{s.label}</p>
            <p className={`font-display text-3xl md:text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="text-base font-display font-semibold text-[var(--text)] mb-4">Revenue vs Cost Breakdown per Order</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--cyprus-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--cyprus-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-soft)' }} />
            <Bar dataKey="Revenue" fill="var(--cyprus)" radius={[3,3,0,0]} />
            <Bar dataKey="Manufacturing Cost" fill="var(--cyprus-light)" radius={[3,3,0,0]} />
            <Bar dataKey="Gross Profit" fill="var(--ok)" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">Cost Allocation & Margins Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left font-mono">Order ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono tabular-nums">Yarn Raw Cost</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono tabular-nums">Labour Cost</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono tabular-nums">Machine Power/Opex</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono tabular-nums">Total Cost</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono tabular-nums">Revenue</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono tabular-nums">Profit</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedData.map(o => {
                const m = Math.round((o.profit / o.revenue) * 100);
                return (
                  <tr key={o.orderId} className="table-row-hover">
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{o.orderId}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{o.buyer}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right tabular-nums">₹{(o.yarnCost/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right tabular-nums">₹{(o.labourCost/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right tabular-nums">₹{(o.machineCost/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--text)] text-right tabular-nums">₹{(o.totalCost/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-right tabular-nums">₹{(o.revenue/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--ok)] text-right tabular-nums">₹{(o.profit/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3.5 text-right font-mono">
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
        <Pagination {...paginationProps} />
      </div>
    </div>
  );
}
