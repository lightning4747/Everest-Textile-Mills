import { useState } from 'react';
import { Search, CheckCircle, Circle, Clock, SearchX } from 'lucide-react';
import { salesOrders, machines } from '../../data/mockData';
import type { OrderStatus as OS } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';

const stages: { key: OS; label: string }[] = [
  { key: 'pending',        label: 'Order Placed' },
  { key: 'yarn_check',    label: 'Yarn Check' },
  { key: 'spinning',      label: 'Spinning' },
  { key: 'weaving',       label: 'Weaving' },
  { key: 'dyeing',        label: 'Dyeing' },
  { key: 'quality_check', label: 'QC Lab' },
  { key: 'ready_to_ship', label: 'Ready' },
  { key: 'dispatched',    label: 'Dispatched' },
];

function getStageIndex(status: OS) {
  return stages.findIndex(s => s.key === status);
}

export default function OrderStatus() {
  const [query, setQuery] = useState('');
  const debouncedQuery    = useDebounce(query, 300);

  const results = debouncedQuery.trim()
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
        <h2 className="text-base font-display font-semibold text-[var(--text)] mb-1">Live Order Status Pipeline</h2>
        <p className="text-xs text-[var(--text-soft)] mb-4">
          Trace production status from yarn allocation to dispatch dock without floor visits.
        </p>
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

      {/* Order Cards with Kanban Status 4px Left Border */}
      {results.length === 0 ? (
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
              const machine    = machines.find(m => m.id === order.machineId);
              const pct        = Math.round((order.completedMetres / order.quantityMetres) * 100);

              const statusBorderColor = order.status === 'ready_to_ship' || order.status === 'dispatched'
                ? 'border-l-[var(--ok)]'
                : order.status === 'pending'
                ? 'border-l-[var(--idle)]'
                : 'border-l-[var(--warn)]';

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
                        <p className="text-xs text-[var(--text)]">{order.fabricType} · {order.colour}</p>
                      </div>
                      <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-soft)] block">Target</span>
                        <p className="text-xs font-mono font-bold text-[var(--text)]">{order.quantityMetres.toLocaleString()} m</p>
                      </div>
                      <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-soft)] block">Delivery Due</span>
                        <p className="text-xs font-mono text-[var(--text-soft)]">{order.deliveryDate}</p>
                      </div>
                      {machine && (
                        <>
                          <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-[var(--text-soft)] block">Machine Assigned</span>
                            <p className="text-xs font-mono text-[var(--olive-dark)] font-semibold">{machine.id} ({machine.name})</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-[var(--text-soft)] block">Completed</span>
                      <p className="font-display text-xl font-semibold text-[var(--ok)]">{pct}%</p>
                    </div>
                  </div>

                  {/* Pipeline Progression Timeline */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                      {stages.map((stage, idx) => {
                        const isDone    = idx < currentIdx;
                        const isCurrent = idx === currentIdx;

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
                              <div className={`flex-1 h-0.5 mx-1.5 rounded ${idx < currentIdx ? 'bg-[var(--ok)]' : 'bg-[var(--sand)]'}`} />
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
