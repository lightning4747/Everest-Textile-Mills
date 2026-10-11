import { useState } from 'react';
import { Search, CheckCircle, Clock, Circle, SearchX, RefreshCw, Zap, FastForward, Loader2, CheckCircle2, AlertTriangle, X, RotateCcw } from 'lucide-react';
import type { SalesOrder } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';

const stages = [
  { key: 'pending',        label: 'Accepted' },
  { key: 'awaiting_yarn',  label: 'Yarn Alloc' },
  { key: 'spinning',       label: 'Spinning' },
  { key: 'weaving',        label: 'Weaving' },
  { key: 'dyeing',         label: 'Dyeing' },
  { key: 'quality_check',  label: 'QC Insp' },
  { key: 'ready_to_ship',  label: 'Ready' },
  { key: 'dispatched',     label: 'Dispatched' }
];

function getStageIndex(status: string) {
  const i = stages.findIndex(s => s.key === status);
  if (i === -1 && status === 'yarn_check') return 1; 
  return i === -1 ? 0 : i;
}

export default function OrderStatus() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [advancingOrderId, setAdvancingOrderId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: rawOrders, loading, error, refetch } = useApi<SalesOrder[]>(
    () => api.get<SalesOrder[]>('/sales-orders?limit=200'),
    [],
    { autoPollMs: 10000 }
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

  const handleReset = async (orderId: string) => {
    setAdvancingOrderId(orderId);
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/sales-orders/${orderId}/reset`);
      setNotification({ type: 'success', message: res.data?.message || 'Order reset to Spinning phase!' });
      await refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to reset order' });
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
        return '⚡ Dispatch Order';
      default:
        return 'Next Stage';
    }
  };


  const salesOrders = rawOrders || [];

  const results = debouncedQuery.length >= 2
    ? salesOrders.filter(o => 
        o.id.toLowerCase().includes(debouncedQuery.toLowerCase()) || 
        o.buyer.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
    : salesOrders;

  const { paginatedData, ...paginationProps } = usePagination(results, 10);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-display font-semibold text-[var(--text)] mb-1">Live Order Status Pipeline</h2>
            <p className="text-xs text-[var(--text-soft)]">
              Trace production status from yarn allocation to dispatch dock without floor visits.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors"
            title="Refresh"
            aria-label="Refresh pipeline"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="relative max-w-lg">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search order ref (ORD-...) or buyer name..."
            className="input-field h-10 pl-9 text-xs font-mono"
            autoFocus
          />
        </div>
      </div>

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

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Order Cards with Kanban Status 4px Left Border */}
      {loading && salesOrders.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--text-soft)] font-mono animate-pulse">
          Loading pipeline orders…
        </div>
      ) : results.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
          <SearchX size={36} className="text-[var(--olive-grey)]" />
          <p className="text-sm font-semibold text-[var(--text)]">No orders match &ldquo;{query}&rdquo;</p>
          <button className="btn-secondary text-xs" onClick={() => setQuery('')}>Reset Filters</button>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {paginatedData.map(order => {
              const currentIdx = getStageIndex(order.status);
              const items = order.items || [];
              const itemsQty = items.reduce((sum, item) => sum + (Number(item.quantityMetres) || 0), 0);
              const headerQty = Number(order.quantityMetres) || 0;
              const total = itemsQty > 0 ? itemsQty : (headerQty > 0 ? headerQty : 1);

              const itemsCompleted = items.reduce((sum, item) => sum + (Number(item.completedMetres) || 0), 0);
              const headerCompleted = Number(order.completedMetres) || 0;
              const completed = itemsCompleted > 0 ? itemsCompleted : headerCompleted;

              // When in ready_to_ship or dispatched, 100% of production target is complete
              const pct = (order.status === 'ready_to_ship' || order.status === 'dispatched')
                ? 100
                : (total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0);

              const statusBorderColor = order.status === 'ready_to_ship' || order.status === 'dispatched'
                ? 'border-l-[var(--ok)]'
                : order.status === 'pending'
                ? 'border-l-[var(--idle)]'
                : 'border-l-[var(--warn)]';
                
              const firstItem = items[0];
              const fabricType = firstItem?.product?.fabricType || firstItem?.fabricType || 'Mixed';
              const colour = firstItem?.colour || 'Mixed';

              return (
                <div key={order.id} className={`kanban-card overflow-hidden ${statusBorderColor}`}>
                  <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-sm font-mono font-bold text-[var(--olive-dark)]">{order.id}</span>
                        <p className="text-xs font-semibold text-[var(--text)]">{order.buyer}</p>
                      </div>
                      <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-soft)] block">Fabric</span>
                        <p className="text-xs text-[var(--text)]">{items.length > 1 ? 'Multiple Items' : `${fabricType} · ${colour}`}</p>
                      </div>
                      <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-soft)] block">Target</span>
                        <p className="text-xs font-mono font-bold text-[var(--text)]">{total.toLocaleString()} m</p>
                      </div>
                      <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-soft)] block">Delivery Due</span>
                        <p className="text-xs font-mono text-[var(--text-soft)]">{order.deliveryDate}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-soft)] block">Completed</span>
                        <p className="font-display text-xl font-semibold text-[var(--ok)]">{pct}%</p>
                      </div>

                      <div className="flex items-center gap-2 pl-3 border-l border-[var(--border)]">
                        {order.status === 'dispatched' ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ok)] bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                              <CheckCircle2 size={13} /> Dispatched & Delivered
                            </span>
                            <button
                              disabled={advancingOrderId === order.id}
                              onClick={() => handleReset(order.id)}
                              className="btn-secondary text-xs h-7 px-2.5 py-0 inline-flex items-center gap-1 text-[var(--text-soft)] hover:text-[var(--text)] border border-[var(--border)]"
                              title="Reset order back to Spinning to replay demo"
                            >
                              {advancingOrderId === order.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <RotateCcw size={11} />
                              )}
                              <span>Replay Demo</span>
                            </button>
                          </>
                        ) : order.status === 'ready_to_ship' ? (
                          <>
                            <button
                              disabled={advancingOrderId === order.id}
                              onClick={() => handleAdvance(order.id)}
                              className="btn-primary text-xs h-8 px-3 py-0 inline-flex items-center gap-1.5 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                              title="Dispatch order and generate gate pass delivery challan"
                            >
                              {advancingOrderId === order.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Zap size={12} />
                              )}
                              <span>⚡ Dispatch Order</span>
                            </button>
                            <button
                              disabled={advancingOrderId === order.id}
                              onClick={() => handleFastForward(order.id)}
                              className="btn-secondary text-xs h-8 px-2.5 py-0 inline-flex items-center gap-1.5 whitespace-nowrap border border-amber-500/40 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 font-medium"
                              title="Skip straight through dispatch to completed delivery"
                            >
                              <FastForward size={12} className="text-amber-700" />
                              <span>Skip Dispatch</span>
                            </button>
                          </>
                        ) : order.status !== 'awaiting_yarn' ? (
                          <>
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
                              className="btn-ghost text-xs h-7 px-2.5 py-0 inline-flex items-center gap-1 whitespace-nowrap border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)]"
                              title="Fast-forward order directly to Dispatched"
                            >
                              <FastForward size={12} />
                              <span>Skip to End</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-amber-700 font-medium bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
                            Awaiting Yarn Allocation
                          </span>
                        )}
                      </div>
                    </div>
                  </div>


                  {/* Pipeline Progression Timeline */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                      {stages.map((stage, idx) => {
                        const isOrderDispatched = order.status === 'dispatched';
                        const isDone    = isOrderDispatched || idx < currentIdx;
                        const isCurrent = !isOrderDispatched && idx === currentIdx;

                        return (
                          <div key={stage.key} className="flex items-center flex-1 min-w-[70px]">
                            <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-full text-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                                isDone
                                  ? 'bg-[var(--ok)] border-[var(--ok)] text-[#FFFFFF]'
                                  : isCurrent
                                  ? 'bg-[var(--sand)] border-[var(--warn)] text-[var(--warn)] shadow-sm'
                                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--olive-grey)]'
                              }`}>
                                {isDone    ? <CheckCircle size={13} /> :
                                 isCurrent ? <Clock size={13} /> :
                                             <Circle size={13} />}
                              </div>
                              <span className={`text-[10px] font-medium leading-tight ${
                                isDone    ? 'text-[var(--ok)] font-semibold' :
                                 isCurrent ? 'text-[var(--warn)] font-bold' :
                                             'text-[var(--text-soft)]'
                              }`}>
                                {stage.label}
                              </span>
                            </div>
                            {idx < stages.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-1.5 rounded ${(isOrderDispatched || idx < currentIdx) ? 'bg-[var(--ok)]' : 'bg-[var(--sand)]'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination {...paginationProps} />
        </>
      )}
    </div>
  );
}
