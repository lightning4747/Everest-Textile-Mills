import { useState, useMemo } from 'react';
import { Search, Truck, Package, CheckCircle } from 'lucide-react';
import { salesOrders, fabricRolls, dispatches } from '../../data/mockData';
import StatusBadge from '../../components/ui/StatusBadge';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';

export default function DeliveryStatus() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  // Orders that are in the delivery pipeline
  const deliveryOrders = useMemo(() =>
    salesOrders.filter(o =>
      ['quality_check', 'ready_to_ship', 'dispatched'].includes(o.status)
    ),
  []);

  // KPI values
  const readyToShipCount = salesOrders.filter(o => o.status === 'ready_to_ship').length;
  const dispatchedCount  = dispatches.length;
  const totalMetresDispatched = dispatches.reduce((sum, d) => sum + d.totalMetres, 0);
  const qcClearedCount = fabricRolls.filter(r => r.qcResult === 'passed').length;

  const filtered = useMemo(() => {
    return deliveryOrders.filter(o => {
      const textMatch =
        o.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        o.buyer.toLowerCase().includes(debouncedSearch.toLowerCase());
      const dispatch = dispatches.find(d => d.orderId === o.id);
      let effectiveStatus: string = o.status;
      if (dispatch?.status === 'delivered') effectiveStatus = 'delivered';
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'qc_cleared' && o.status === 'quality_check') ||
        (statusFilter === 'ready_to_ship' && o.status === 'ready_to_ship') ||
        (statusFilter === 'dispatched' && o.status === 'dispatched' && effectiveStatus !== 'delivered') ||
        (statusFilter === 'delivered' && effectiveStatus === 'delivered');
      return textMatch && statusMatch;
    });
  }, [deliveryOrders, debouncedSearch, statusFilter]);

  const { paginatedData, ...paginationProps } = usePagination(filtered, 20);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-[var(--warn)]" />
            <p className="stat-label">Ready to Ship</p>
          </div>
          <p className="font-display text-3xl font-semibold text-[var(--warn)]">{readyToShipCount}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={14} className="text-[var(--ok)]" />
            <p className="stat-label">Dispatched</p>
          </div>
          <p className="font-display text-3xl font-semibold text-[var(--ok)]">{dispatchedCount}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={14} className="text-[var(--olive-dark)]" />
            <p className="stat-label">Total Metres Dispatched</p>
          </div>
          <p className="font-display text-3xl font-semibold text-[var(--text)]">{totalMetresDispatched.toLocaleString()} m</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-[var(--ok)]" />
            <p className="stat-label">QC Cleared Rolls</p>
          </div>
          <p className="font-display text-3xl font-semibold text-[var(--ok)]">{qcClearedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID or buyer…"
            className="input-field h-10 pl-9 text-xs font-mono"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field h-10 text-xs font-mono w-44"
          aria-label="Filter by delivery status"
        >
          <option value="all">All</option>
          <option value="qc_cleared">QC Cleared</option>
          <option value="ready_to_ship">Ready to Ship</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Order ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Fabric · Colour</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Metres</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Challan ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Vehicle #</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Dispatch Date</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedData.map(order => {
                const dispatch = dispatches.find(d => d.orderId === order.id);
                return (
                  <tr key={order.id} className="table-row-hover">
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{order.id}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{order.buyer}</td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text-soft)] text-left">{order.fabricType} · {order.colour}</td>
                    <td className="px-4 py-3.5 text-xs font-mono tabular-nums text-[var(--text)] text-right">{order.quantityMetres.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text)] text-left">{dispatch ? dispatch.invoiceNo : '—'}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text)] text-left">{dispatch ? dispatch.truckNo : '—'}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{dispatch ? dispatch.dispatchDate : '—'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={dispatch?.status === 'delivered' ? 'delivered' : order.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <Truck size={36} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No delivery records match the current filters</p>
            <button className="btn-secondary text-xs" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Reset Filters</button>
          </div>
        ) : (
          <Pagination {...paginationProps} />
        )}
      </div>
    </div>
  );
}
