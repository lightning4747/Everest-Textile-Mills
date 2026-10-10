import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Search, PackageSearch, RefreshCw, ChevronDown, ChevronUp, Zap, FastForward, CheckCircle2, Clock, Loader2, X, AlertTriangle } from 'lucide-react';
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
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [advancingOrderId, setAdvancingOrderId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: rawOrders, loading, error, refetch } = useApi<SalesOrder[]>(
    () => api.get<SalesOrder[]>('/sales-orders?limit=200'),
    [],
    { autoPollMs: 15000 }
  );

  const handleAdvance = async (orderId: string) => {
    setAdvancingOrderId(orderId);
    try {
      const res = await api.post<{ success: boolean; message: string; newStatus: string }>(`/sales-orders/${orderId}/advance`);
      setNotification({ type: 'success', message: res.data?.message || `Order advanced to ${res.data?.newStatus}` });
      await refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to advance order' });
    } finally {
      setAdvancingOrderId(null);
    }
  };

  const handleFastForward = async (orderId: string) => {
    setAdvancingOrderId(orderId);
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/sales-orders/${orderId}/fast-forward`);
      setNotification({ type: 'success', message: res.data?.message || 'Order fast-forwarded to Dispatched!' });
      await refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to fast-forward order' });
    } finally {
      setAdvancingOrderId(null);
    }
  };

  const getNextStageLabel = (status: string) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return 'Start Spinning';
      case 'spinning':
        return 'To Weaving';
      case 'weaving':
        return 'To Dyeing';
      case 'dyeing':
        return 'To QC';
      case 'quality_check':
        return 'Approve QC';
      case 'ready_to_ship':
        return 'Dispatch';
      default:
        return 'Next Stage';
    }
  };

  const orders = rawOrders || [];

  const filtered = orders.filter(o => {
    const firstItem = o.items?.[0];
    const fabricType = firstItem?.product?.fabricType || firstItem?.fabricType || '';
    const textMatch =
      (o.buyer && o.buyer.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (o.id && o.id.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (fabricType.toLowerCase().includes(debouncedSearch.toLowerCase()));
    const statusMatch = statusFilter === 'all' || o.status === statusFilter;
    return textMatch && statusMatch;
  });

  const { paginatedData, ...paginationProps } = usePagination(filtered, 20);

  const getOrderValue = (o: any): number => {
    const directAmount = Number(o.totalAmount);
    if (!isNaN(directAmount) && directAmount > 0) {
      return directAmount;
    }
    const items = o.items || [];
    if (items.length > 0) {
      const itemsTotal = items.reduce(
        (sum: number, it: any) => sum + (Number(it.quantityMetres || 0) * Number(it.unitPrice || 0)),
        0
      );
      if (itemsTotal > 0) return itemsTotal;
    }
    const q = Number(o.quantityMetres || 0);
    const u = Number(o.unitPrice || 0);
    return q * u;
  };

  const totalRevenue = orders.reduce((s, o) => s + getOrderValue(o), 0);
  const totalRevenueLakhs = isNaN(totalRevenue) ? 0 : totalRevenue / 100000;
  const activeOrdersCount = orders.filter(o => !['dispatched'].includes(o.status)).length;
  const readyOrdersCount = orders.filter(o => o.status === 'ready_to_ship').length;

  const toggleOrder = (id: string) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders',       value: orders.length,                               accent: 'text-[var(--text)]' },
          { label: 'Active in Mill',     value: activeOrdersCount,                           accent: 'text-[var(--warn)]' },
          { label: 'Ready for Dispatch', value: readyOrdersCount,                            accent: 'text-[var(--ok)]' },
          { label: 'Estimated Bookings', value: `₹${totalRevenueLakhs.toFixed(1)}L`,          accent: 'text-[var(--olive-dark)]' },
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

      {/* Action Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
            : 'bg-red-500/10 border-red-500/20 text-red-700'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 rounded text-[var(--text-soft)] transition-colors"
          >
            <X size={15} />
          </button>
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
                    <th className="w-8 px-2 py-3"></th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Order ID</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Fabric · Colour</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Qty (m)</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Contract Value</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Delivery</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap">Progress</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-center">Status</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Demo / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginatedData.map(order => {
                    const isExpanded = expandedOrderIds.has(order.id);
                    const items = order.items || [];
                    const itemsQty = items.reduce((s, i) => s + (Number(i.quantityMetres) || 0), 0);
                    const headerQty = Number(order.quantityMetres) || 0;
                    const totalQty = itemsQty > 0 ? itemsQty : headerQty;
                    const itemsCompleted = items.reduce((s, i) => s + (Number(i.completedMetres) || 0), 0);
                    const headerCompleted = Number(order.completedMetres) || 0;
                    const totalCompleted = items.length > 0 ? itemsCompleted : headerCompleted;
                    const pct = totalQty > 0 ? Math.round((totalCompleted / totalQty) * 100) : 0;
                    const value = getOrderValue(order);
                    
                    const firstItem = items[0];
                    const fabricType = firstItem?.product?.fabricType || firstItem?.fabricType || 'Mixed';
                    const colour = firstItem?.colour || 'Mixed';
                    const fabricDisplay = items.length > 1 ? 'Multiple Items' : `${fabricType} · ${colour}`;

                    return (
                      <Fragment key={order.id}>
                        <tr className="table-row-hover cursor-pointer" onClick={() => toggleOrder(order.id)}>
                          <td className="px-2 py-3.5 text-center text-[var(--olive-grey)]">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{order.id}</td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{order.buyer}</td>
                          <td className="px-4 py-3.5 text-xs text-[var(--text-soft)] text-left">{fabricDisplay}</td>
                          <td className="px-4 py-3.5 text-xs font-mono text-[var(--text)] text-right tabular-nums">{(totalQty === 1 && items.length === 0) ? 0 : totalQty.toLocaleString()}</td>
                          <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--ok)] text-right tabular-nums">₹{(value / 1000).toFixed(0)}K</td>
                          <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{order.deliveryDate}</td>
                          <td className="px-4 py-3.5 w-32">
                            <ProgressBar value={pct} color={pct >= 100 ? 'ok' : pct > 50 ? 'warn' : 'default'} showLabel />
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            {order.status === 'dispatched' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--ok)] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 size={12} /> Delivered
                              </span>
                            ) : order.status === 'awaiting_yarn' ? (
                              <Link
                                to="/yarn/receipts"
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 hover:text-amber-800 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
                                title="Awaiting yarn arrival. Receive PO in receipts"
                              >
                                <Clock size={12} /> Receive PO
                              </Link>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  disabled={advancingOrderId === order.id}
                                  onClick={() => handleAdvance(order.id)}
                                  className="btn-primary text-xs h-7 px-2.5 py-0 inline-flex items-center gap-1 whitespace-nowrap"
                                  title="Advance to next manufacturing phase"
                                >
                                  {advancingOrderId === order.id ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <Zap size={11} />
                                  )}
                                  <span>{getNextStageLabel(order.status)}</span>
                                </button>
                                <button
                                  disabled={advancingOrderId === order.id}
                                  onClick={() => handleFastForward(order.id)}
                                  className="btn-ghost text-xs h-7 px-2 py-0 inline-flex items-center gap-1 whitespace-nowrap border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)]"
                                  title="Fast-forward entire order directly to Dispatched"
                                >
                                  <FastForward size={11} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {isExpanded && items.length > 0 && (
                          <tr className="bg-[var(--surface-2)]/10">
                            <td colSpan={10} className="p-0 border-b border-[var(--border)]">
                              <div className="px-10 py-3">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="border-b border-[var(--border)]/50 text-[var(--text-soft)]">
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider">Item ID</th>
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider">Product/Fabric</th>
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-right">Qty (m)</th>
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-right">Rate ₹</th>
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-right">Completed</th>
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--border)]/50">
                                    {items.map(item => {
                                      const itemFabric = item.product?.fabricType || item.fabricType || 'N/A';
                                      const itemColor = item.colour || '';
                                      return (
                                        <tr key={item.id} className="hover:bg-[var(--surface-2)]/30">
                                          <td className="px-3 py-2 text-xs font-mono text-[var(--olive-dark)]">{item.id}</td>
                                          <td className="px-3 py-2 text-xs text-[var(--text)]">{itemFabric} {itemColor && `· ${itemColor}`}</td>
                                          <td className="px-3 py-2 text-xs font-mono text-right">{item.quantityMetres?.toLocaleString()}</td>
                                          <td className="px-3 py-2 text-xs font-mono text-[var(--text-soft)] text-right">₹{item.unitPrice}</td>
                                          <td className="px-3 py-2 text-xs font-mono text-right">{item.completedMetres?.toLocaleString()}m</td>
                                          <td className="px-3 py-2 text-center">
                                            <StatusBadge status={item.status} />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
