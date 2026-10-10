import { useState } from 'react';
import { Search, PackageSearch, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import type { SalesOrder } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';

export default function SalesOrders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  const { data: rawOrders, loading, error, refetch } = useApi<SalesOrder[]>(
    () => api.get<SalesOrder[]>('/sales-orders?limit=200'),
    [],
    { autoPollMs: 15000 }
  );

  const orders = rawOrders || [];

  const filtered = orders.filter(o => {
    const textMatch =
      (o.buyer && o.buyer.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (o.id && o.id.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (o.fabricType && o.fabricType.toLowerCase().includes(debouncedSearch.toLowerCase()));
    const statusMatch = statusFilter === 'all' || o.status === statusFilter;
    return textMatch && statusMatch;
  });

  const { paginatedData, ...paginationProps } = usePagination(filtered, 20);

  const totalRevenue = orders.reduce((s, o) => s + (o.quantityMetres || 0) * (o.unitPrice || 0), 0);
  const activeOrdersCount = orders.filter(o => !['dispatched'].includes(o.status)).length;
  const readyOrdersCount = orders.filter(o => o.status === 'ready_to_ship').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders',       value: orders.length,                               accent: 'text-[var(--text)]' },
          { label: 'Active in Mill',     value: activeOrdersCount,                           accent: 'text-[var(--warn)]' },
          { label: 'Ready for Dispatch', value: readyOrdersCount,                            accent: 'text-[var(--ok)]' },
          { label: 'Estimated Bookings', value: `₹${(totalRevenue / 100000).toFixed(1)}L`,  accent: 'text-[var(--olive-dark)]' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1">{s.label}</p>
            <p className={`font-display text-3xl md:text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by buyer, order ID, fabric…"
              className="input-field h-10 pl-9 text-xs font-mono w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field h-10 text-xs font-mono w-44"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="spinning">Spinning</option>
            <option value="weaving">Weaving</option>
            <option value="dyeing">Dyeing</option>
            <option value="quality_check">Quality Check</option>
            <option value="ready_to_ship">Ready to Ship</option>
            <option value="dispatched">Dispatched</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors"
            title="Refresh"
            aria-label="Refresh orders"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-xs">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-soft)] font-mono animate-pulse">
            Loading sales orders…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <PackageSearch size={36} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No orders match the current filters</p>
            <button className="btn-secondary text-xs" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Reset Filters</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Order ID</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Fabric · Colour</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Qty (m)</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Rate ₹</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Contract Value</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Delivery</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap">Progress</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginatedData.map(order => {
                    const completed = Number(order.completedMetres) || 0;
                    const total = Number(order.quantityMetres) || 1;
                    const pct   = Math.round((completed / total) * 100);
                    const value = total * (Number(order.unitPrice) || 0);
                    return (
                      <tr key={order.id} className="table-row-hover">
                        <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{order.id}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{order.buyer}</td>
                        <td className="px-4 py-3.5 text-xs text-[var(--text-soft)] text-left">{order.fabricType} · {order.colour}</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-[var(--text)] text-right tabular-nums">{order.quantityMetres.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right tabular-nums">₹{order.unitPrice}</td>
                        <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--ok)] text-right tabular-nums">₹{(value / 1000).toFixed(0)}K</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{order.deliveryDate}</td>
                        <td className="px-4 py-3.5 w-32">
                          <ProgressBar value={pct} color={pct >= 100 ? 'ok' : pct > 50 ? 'warn' : 'default'} showLabel />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 pb-4">
              <Pagination {...paginationProps} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
