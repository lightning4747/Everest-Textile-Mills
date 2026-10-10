import { useState, useMemo } from 'react';
import { Package, ArrowRight, Search, PackageSearch } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { fabricRolls, salesOrders, machines } from '../../data/mockData';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';

export default function FabricRolls() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const totalMetres = fabricRolls.reduce((s, r) => s + r.metres, 0);
  const inspectedRolls = fabricRolls.filter(r => r.qcResult !== 'pending');
  const passRate = inspectedRolls.length > 0
    ? Math.round((fabricRolls.filter(r => r.qcResult === 'passed').length / inspectedRolls.length) * 100)
    : 0;
  const rejectRate = inspectedRolls.length > 0
    ? Math.round((fabricRolls.filter(r => r.qcResult === 'rejected').length / inspectedRolls.length) * 100)
    : 0;

  const filtered = useMemo(() =>
    fabricRolls.filter(r =>
      r.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.orderId.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [debouncedSearch]
  );

  const { paginatedData, ...paginationProps } = usePagination(filtered, 20);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rolls',    value: fabricRolls.length,            accent: 'text-[var(--text)]' },
          { label: 'Total Metres',   value: `${totalMetres} m`,            accent: 'text-[var(--text)]' },
          { label: 'QC Pass Rate',   value: `${passRate}%`,                accent: 'text-[var(--ok)]' },
          { label: 'Rejection Rate', value: `${rejectRate}%`,              accent: 'text-[var(--bad)]' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1.5">{s.label}</p>
            <p className={`font-display text-3xl md:text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search roll ID or order ref…"
            className="input-field h-10 pl-9 text-xs font-mono max-w-xs w-full"
          />
        </div>
      </div>

      {/* Traceability List */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[var(--olive-dark)]" />
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">Roll Lineage & Traceability Chain</h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-soft)]">Order Ref → Machine → Grading Lab</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <PackageSearch size={36} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No fabric rolls match the current filters</p>
            <button className="btn-secondary text-xs" onClick={() => setSearch('')}>Reset Filters</button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--border)]">
              {paginatedData.map(roll => {
                const order   = salesOrders.find(o => o.id === roll.orderId);
                const machine = machines.find(m => m.id === roll.machineId);
                return (
                  <div key={roll.id} className="p-4 table-row-hover">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 bg-[var(--sand)]/50 px-2.5 py-1 rounded-lg border border-[var(--border)]">
                          <Package size={14} className="text-[var(--olive-dark)]" />
                          <span className="text-xs font-mono font-bold text-[var(--olive-dark)]">{roll.id}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          {[
                            { label: 'Order',   value: roll.orderId,              isMono: true },
                            { label: 'Buyer',   value: order?.buyer ?? '—',       isMono: false },
                            { label: 'Machine', value: roll.machineId,            isMono: true },
                            { label: 'Process', value: machine?.type ?? '—',      isMono: false },
                            { label: 'Length',  value: `${roll.metres} m`,        isMono: true },
                          ].map((item, i, arr) => (
                            <div key={item.label} className="flex items-center gap-2">
                              <div className="bg-[var(--surface)] border border-[var(--border)] rounded px-2.5 py-1">
                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-soft)] block font-semibold">{item.label}</span>
                                <span className={`text-xs text-[var(--text)] font-medium ${item.isMono ? 'font-mono' : ''}`}>{item.value}</span>
                              </div>
                              {i < arr.length - 1 && <ArrowRight size={12} className="text-[var(--olive-grey)]" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-[11px] font-mono text-[var(--text-soft)]">{roll.producedDate}</p>
                          {roll.checkedBy && <p className="text-[10px] text-[var(--text)]">Inspector: {roll.checkedBy}</p>}
                          {roll.defects?.length ? (
                            <p className="text-[10px] text-[var(--bad)] font-semibold mt-0.5">{roll.defects.join(', ')}</p>
                          ) : null}
                        </div>
                        <StatusBadge status={roll.qcResult} />
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
    </div>
  );
}
