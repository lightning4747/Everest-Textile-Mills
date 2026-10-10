import { useMemo, useState } from 'react';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { machines } from '../../data/mockData';
import { Plus, Search, SearchX } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';

export default function Machines() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(
    () =>
      machines.filter(
        m =>
          m.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          m.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          m.type.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [debouncedSearch],
  );

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filtered, 20);

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
            placeholder="Search by ID, name, type…"
            className="input-field h-10 pl-9 text-xs font-mono w-full"
            aria-label="Search machines"
          />
        </div>
        <button className="btn-primary text-xs h-10 flex-shrink-0">
          <Plus size={14} /> Add Machine Unit
        </button>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <SearchX size={36} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No machines match the current filters</p>
            <button className="btn-secondary text-xs" onClick={() => setSearch('')}>Reset Filters</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Machine ID</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Name</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Process Type</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-center">Status</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Current Order</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Operator</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-center">Shift</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap">Progress</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-right">Today Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginatedData.map(m => (
                    <tr key={m.id} className="table-row-hover">
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{m.id}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{m.name}</td>
                      <td className="px-4 py-3.5 text-xs text-[var(--text)] capitalize text-left">{m.type}</td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--olive-dark)] text-left">{m.currentOrder ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-[var(--text)] text-left">{m.operator ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs font-mono font-medium text-[var(--text)] text-center">Shift {m.shift}</td>
                      <td className="px-4 py-3.5 w-32">
                        <ProgressBar
                          value={m.progress}
                          color={m.status === 'running' ? 'ok' : m.status === 'breakdown' ? 'bad' : 'warn'}
                          showLabel
                          thin
                        />
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono font-bold tabular-nums text-[var(--text)] text-right">{m.outputToday} m</td>
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
