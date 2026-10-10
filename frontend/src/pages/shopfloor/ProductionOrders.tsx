import { useMemo, useState } from 'react';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { Plus, Search, SearchX, X, RefreshCw } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    salesOrderId: '',
    machineId: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    targetMetres: 2000,
    status: 'queued',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await api.post('/production-orders', {
        salesOrderId: formData.salesOrderId,
        machineId: formData.machineId,
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        targetMetres: Number(formData.targetMetres),
        status: formData.status,
      });
      setIsModalOpen(false);
      setFormData({
        salesOrderId: '',
        machineId: '',
        startDate: new Date().toISOString().split('T')[0],
        expectedEndDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        targetMetres: 2000,
        status: 'queued',
      });
      refetch();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create production order');
    } finally {
      setIsSubmitting(false);
    }
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary text-xs h-10 flex-shrink-0"
          >
            <Plus size={14} /> New Production Order
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
            <button className="btn-secondary text-xs" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Reset Filters</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Sales Order</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Fabric &amp; Colour</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Machine Unit</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Target (m)</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Completed (m)</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap">Progress</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-center">Status</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Expected End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginatedData.map(order => {
                    const pct = order.progress ?? (order.targetMetres > 0 ? Math.round((order.outputMetres / order.targetMetres) * 100) : 0);
                    return (
                      <tr key={order.id} className="table-row-hover">
                        <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">
                          {order.salesOrderId || order.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">
                          {order.buyer || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[var(--text-soft)] text-left">
                          {order.fabricType ? `${order.fabricType}${order.colour ? ` · ${order.colour}` : ''}` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-left">
                          {order.machineId ? (
                            <div>
                              <p className="text-xs font-mono font-bold text-[var(--olive-dark)]">{order.machineId}</p>
                              {order.machineName && <p className="text-[10px] text-[var(--text-soft)]">{order.machineName}</p>}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--olive-grey)] font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono tabular-nums text-[var(--text)] text-right">
                          {order.targetMetres?.toLocaleString() ?? 0}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono font-bold tabular-nums text-[var(--text)] text-right">
                          {order.outputMetres?.toLocaleString() ?? 0}
                        </td>
                        <td className="px-4 py-3.5 w-36">
                          <ProgressBar value={pct} color={pct >= 100 ? 'ok' : pct > 50 ? 'warn' : 'default'} showLabel />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">
                          {order.expectedEndDate || order.deliveryDate || '—'}
                        </td>
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

      {/* New Production Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-syne font-bold text-base text-[var(--text)]">Schedule Production Order</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-[var(--surface-2)] rounded text-[var(--text-soft)]"
              >
                <X size={16} />
              </button>
            </div>

            {submitError && (
              <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                  Sales Order ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ORD-1042"
                  value={formData.salesOrderId}
                  onChange={e => setFormData(f => ({ ...f, salesOrderId: e.target.value }))}
                  className="input-field text-xs font-mono w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                  Machine Unit ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SP-01, WV-01, DY-01"
                  value={formData.machineId}
                  onChange={e => setFormData(f => ({ ...f, machineId: e.target.value }))}
                  className="input-field text-xs font-mono w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData(f => ({ ...f, startDate: e.target.value }))}
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Expected End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expectedEndDate}
                    onChange={e => setFormData(f => ({ ...f, expectedEndDate: e.target.value }))}
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Target (Metres) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.targetMetres}
                    onChange={e => setFormData(f => ({ ...f, targetMetres: Number(e.target.value) }))}
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}
                    className="input-field text-xs font-mono w-full"
                  >
                    <option value="queued">Queued</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs"
                >
                  {isSubmitting ? 'Creating…' : 'Schedule Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

