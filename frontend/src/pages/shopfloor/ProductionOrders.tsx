import { useMemo, useState } from 'react';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { salesOrders, machines } from '../../data/mockData';
import { Plus, Search, SearchX } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';

export default function ProductionOrders() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const activeOrders = salesOrders.filter(o =>
    ['spinning', 'weaving', 'dyeing'].includes(o.status),
  );

  const filteredOrders = useMemo(
    () =>
      activeOrders.filter(
        o =>
          o.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          o.buyer.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [activeOrders, debouncedSearch],
  );

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filteredOrders, 20);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--olive-grey)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID or buyer…"
            className="input-field h-10 pl-9 text-xs font-mono w-full"
            aria-label="Search production orders"
          />
        </div>
        <button className="btn-primary text-xs h-10 flex-shrink-0">
          <Plus size={14} /> New Production Order
        </button>
      </div>

      <div className="card overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <SearchX size={36} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No production orders match the current filters</p>
            <button className="btn-secondary text-xs" onClick={() => setSearch('')}>Reset Filters</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Order ID</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Fabric &amp; Colour</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Machine Unit</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Target (m)</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Completed (m)</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap">Progress</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-center">Status</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Delivery Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginatedData.map(order => {
                    const pct = Math.round((order.completedMetres / order.quantityMetres) * 100);
                    const machine = machines.find(m => m.id === order.machineId);
                    return (
                      <tr key={order.id} className="table-row-hover">
                        <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{order.id}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{order.buyer}</td>
                        <td className="px-4 py-3.5 text-xs text-[var(--text-soft)] text-left">{order.fabricType} · {order.colour}</td>
                        <td className="px-4 py-3.5 text-left">
                          {machine ? (
                            <div>
                              <p className="text-xs font-mono font-bold text-[var(--olive-dark)]">{machine.id}</p>
                              <p className="text-[10px] text-[var(--text-soft)]">{machine.name}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--olive-grey)] font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono tabular-nums text-[var(--text)] text-right">{order.quantityMetres.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-xs font-mono font-bold tabular-nums text-[var(--text)] text-right">{order.completedMetres.toLocaleString()}</td>
                        <td className="px-4 py-3.5 w-36">
                          <ProgressBar value={pct} color={pct >= 100 ? 'ok' : pct > 50 ? 'warn' : 'default'} showLabel />
                        </td>
                        <td className="px-4 py-3.5 text-center"><StatusBadge status={order.status} /></td>
                        <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{order.deliveryDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 pb-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                setPage={setPage}
                setPageSize={setPageSize}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
