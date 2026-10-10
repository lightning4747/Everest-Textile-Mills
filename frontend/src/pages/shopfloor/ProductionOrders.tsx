import { useMemo, useState } from 'react';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { Search, SearchX, RefreshCw } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';

interface BackendProductionOrder {
  id: string;
  salesOrderId: string;
  machineId: string;
  machineName: string | null;
  machineType: string | null;
  startDate: string;
  expectedEndDate: string;
  status: string;
  outputMetres: number;
  targetMetres: number;
  progress: number;
  buyer: string | null;
  fabricType: string | null;
  colour: string | null;
  deliveryDate: string | null;
  orderStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProductionOrders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  const { data: rawOrders, loading, error, refetch } = useApi<BackendProductionOrder[]>(
    () => api.get<BackendProductionOrder[]>('/production-orders'),
    [],
    { autoPollMs: 15000 }
  );

  const orders = rawOrders || [];

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        o =>
          ((o.salesOrderId && o.salesOrderId.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
            (o.id && o.id.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
            (o.buyer && o.buyer.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
            (o.machineId && o.machineId.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
            (o.fabricType && o.fabricType.toLowerCase().includes(debouncedSearch.toLowerCase()))) &&
          (statusFilter === 'all' || o.status === statusFilter),
      ),
    [orders, debouncedSearch, statusFilter],
  );

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filteredOrders, 20);

  const handleReset = () => {
    setSearch('');
    setStatusFilter('all');
  };

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
            placeholder="Search by order ID, buyer, machine…"
            className="input-field h-10 pl-9 text-xs font-mono w-full"
            aria-label="Search production orders"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field h-10 text-xs font-mono w-36"
            aria-label="Filter by stage"
          >
            <option value="all">All Stages</option>
            <option value="queued">Queued</option>
            <option value="in_progress">In Progress</option>
            <option value="spinning">Spinning</option>
            <option value="weaving">Weaving</option>
            <option value="dyeing">Dyeing</option>
            <option value="completed">Completed</option>
          </select>
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
          <div className="p-8 text-center text-xs text-[var(--text-soft)] font-mono animate-pulse">
            Loading production orders…
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <SearchX size={36} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No production orders match the current filters</p>
            <button className="btn-secondary text-xs" onClick={handleReset}>
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Prod Order</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Sales Order</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Machine</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-center">Stage</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Target (m)</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Completed</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap">Progress</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Start Date</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Target End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginatedData.map(o => (
                    <tr key={o.id} className="table-row-hover">
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{o.id}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--olive-dark)] text-left">{o.salesOrderId}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{o.buyer ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text)] text-left">{o.machineId}</td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono tabular-nums text-[var(--text)] text-right">
                        {o.targetMetres.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono font-bold tabular-nums text-[var(--ok)] text-right">
                        {o.outputMetres.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 w-32">
                        <ProgressBar value={o.progress} color={o.progress >= 100 ? 'ok' : 'default'} showLabel thin />
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{o.startDate}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{o.expectedEndDate}</td>
                    </tr>
                  ))}
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
