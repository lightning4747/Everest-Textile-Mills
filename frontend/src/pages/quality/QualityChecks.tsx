import { useState, useMemo } from 'react';
import { ShieldCheck, Search, SearchX } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { fabricRolls, salesOrders, machines } from '../../data/mockData';
import type { QCResult } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';

const filters: { label: string; value: QCResult | 'all' }[] = [
  { label: 'All Inspections', value: 'all' },
  { label: 'Passed',          value: 'passed' },
  { label: 'Rework',          value: 'rework' },
  { label: 'Rejected',        value: 'rejected' },
  { label: 'Pending',         value: 'pending' },
];

export default function QualityChecks() {
  const [filter, setFilter]       = useState<QCResult | 'all'>('all');
  const [rollSearch, setRollSearch] = useState('');
  const [machineType, setMachineType] = useState('all');
  const debouncedRollSearch       = useDebounce(rollSearch, 300);

  const counts = {
    all:      fabricRolls.length,
    passed:   fabricRolls.filter(r => r.qcResult === 'passed').length,
    rework:   fabricRolls.filter(r => r.qcResult === 'rework').length,
    rejected: fabricRolls.filter(r => r.qcResult === 'rejected').length,
    pending:  fabricRolls.filter(r => r.qcResult === 'pending').length,
  };

  const filtered = useMemo(() => {
    const base = filter === 'all' ? fabricRolls : fabricRolls.filter(r => r.qcResult === filter);
    return base.filter(r => {
      const textMatch =
        r.id.toLowerCase().includes(debouncedRollSearch.toLowerCase()) ||
        r.orderId.toLowerCase().includes(debouncedRollSearch.toLowerCase());
      const typeMatch =
        machineType === 'all' ||
        machines.find(m => m.id === r.machineId)?.type === machineType;
      return textMatch && typeMatch;
    });
  }, [filter, debouncedRollSearch, machineType]);

  const { paginatedData, ...paginationProps } = usePagination(filtered, 20);

  const handleReset = () => {
    setFilter('all');
    setRollSearch('');
    setMachineType('all');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  active
                    ? 'bg-[var(--olive-dark)] text-[var(--cream)] border-[var(--olive-dark)]'
                    : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--sand)]/50'
                }`}
              >
                {f.label} <span className="ml-1 font-mono opacity-75">({counts[f.value]})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
            <input
              value={rollSearch}
              onChange={e => setRollSearch(e.target.value)}
              placeholder="Search roll ID or order ref…"
              className="input-field h-10 pl-9 text-xs font-mono max-w-xs"
            />
          </div>
          <select
            value={machineType}
            onChange={e => setMachineType(e.target.value)}
            className="input-field h-10 text-xs font-mono w-36"
            aria-label="Filter by machine type"
          >
            <option value="all">All Machines</option>
            <option value="spinning">Spinning</option>
            <option value="weaving">Weaving</option>
            <option value="dyeing">Dyeing</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Roll ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Order Ref</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Machine Unit</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Batch (m)</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Produced</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Defect Log</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Inspector</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Timestamp</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-center">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedData.map(roll => {
                const order   = salesOrders.find(o => o.id === roll.orderId);
                const machine = machines.find(m => m.id === roll.machineId);
                return (
                  <tr key={roll.id} className="table-row-hover">
                    <td className="px-4 py-3.5 text-left">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[var(--olive-grey)]" />
                        <span className="text-xs font-mono font-bold text-[var(--olive-dark)]">{roll.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{roll.orderId}</td>
                    <td className="px-4 py-3.5 text-xs font-medium text-[var(--text)] text-left">{order?.buyer ?? '—'}</td>
                    <td className="px-4 py-3.5 text-left">
                      <p className="text-xs font-mono text-[var(--text)]">{machine?.id ?? roll.machineId}</p>
                      <p className="text-[10px] text-[var(--text-soft)]">{machine?.name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--text)] text-right tabular-nums">{roll.metres} m</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{roll.producedDate}</td>
                    <td className="px-4 py-3.5 text-left">
                      {roll.defects?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {roll.defects.map(d => (
                            <span key={d} className="badge-status-bad text-[10px] py-0.5">
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-[var(--olive-grey)]">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text)] text-left">{roll.checkedBy ?? '—'}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{roll.checkedAt ?? '—'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={roll.qcResult} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <SearchX size={36} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No inspection records match the current filters</p>
            <button className="btn-secondary text-xs" onClick={handleReset}>Reset Filters</button>
          </div>
        ) : (
          <Pagination {...paginationProps} />
        )}
      </div>
    </div>
  );
}
