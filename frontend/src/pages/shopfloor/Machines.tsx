import { useMemo, useState } from 'react';
import ProgressBar from '../../components/ui/ProgressBar';
import { Search, SearchX, RefreshCw } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';
import type { Machine } from '../../types';
import { AnimatedStatusIcon } from '../../components/ui/AnimatedStatusIcon';
import DetailModal from '../../components/ui/DetailModal';

export default function Machines() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const { data, loading, error, refetch } = useApi<Machine[]>(
    () => api.get<Machine[]>('/machines'),
    [],
    { autoPollMs: 15000 }
  );

  const machineList = data || [];

  const filtered = useMemo(() => {
    return machineList.filter(m => {
      const textMatch =
        m.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        m.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        m.type.toLowerCase().includes(debouncedSearch.toLowerCase());
      const statusMatch = statusFilter === 'all' || m.status.toLowerCase() === statusFilter.toLowerCase();
      const typeMatch = typeFilter === 'all' || m.type.toLowerCase() === typeFilter.toLowerCase();
      return textMatch && statusMatch && typeMatch;
    });
  }, [machineList, debouncedSearch, statusFilter, typeFilter]);

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filtered, 20);

  const handleReset = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Search input */}
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--olive-grey)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ID, name, process…"
              className="input-field h-10 pl-9 text-xs font-mono w-full"
              aria-label="Search machines"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field h-10 text-xs font-mono w-36"
            aria-label="Filter by machine status"
          >
            <option value="all">All Statuses</option>
            <option value="running">Running</option>
            <option value="idle">Idle</option>
            <option value="maintenance">Maintenance</option>
            <option value="breakdown">Breakdown</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="input-field h-10 text-xs font-mono w-36"
            aria-label="Filter by process type"
          >
            <option value="all">All Processes</option>
            <option value="spinning">Spinning</option>
            <option value="weaving">Weaving</option>
            <option value="dyeing">Dyeing</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors"
          title="Refresh telemetry"
          aria-label="Refresh telemetry"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading && machineList.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-soft)] font-mono animate-pulse">
            Loading machine fleet telemetry...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <SearchX size={36} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No machines match the current filters</p>
            <button className="btn-secondary text-xs" onClick={handleReset}>Reset Filters</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Machine ID</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Name</th>
                    <th className="px-4 py-3 section-title whitespace-nowrap text-left">Process Unit</th>
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
                    <tr key={m.id} className="table-row-hover cursor-pointer" onClick={() => setSelectedMachine(m)}>
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{m.id}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{m.name}</td>
                      <td className="px-4 py-3.5 text-left">
                        <AnimatedStatusIcon type={m.type} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <AnimatedStatusIcon status={m.status} />
                      </td>
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

      {/* Machine Detail Modal */}
      <DetailModal
        open={!!selectedMachine}
        onClose={() => setSelectedMachine(null)}
        title={selectedMachine ? selectedMachine.name : ''}
        subtitle={selectedMachine?.id}
        sections={selectedMachine ? [
          {
            title: 'Machine Identity',
            fields: [
              { label: 'Machine ID',    value: selectedMachine.id,                  mono: true, accent: 'text-[var(--olive-dark)]' },
              { label: 'Name',          value: selectedMachine.name,                accent: 'font-semibold' },
              { label: 'Process Type',  value: selectedMachine.type,                accent: 'capitalize' },
              { label: 'Status',        value: selectedMachine.status,              accent: selectedMachine.status === 'running' ? 'text-[var(--ok)] font-bold capitalize' : selectedMachine.status === 'breakdown' ? 'text-[var(--bad)] font-bold capitalize' : 'text-[var(--warn)] font-bold capitalize' },
            ],
          },
          {
            title: 'Current Operation',
            fields: [
              { label: 'Current Order', value: selectedMachine.currentOrder ?? '—', mono: true, accent: 'text-[var(--olive-dark)]' },
              { label: 'Operator',      value: selectedMachine.operator ?? '—' },
              { label: 'Shift',         value: `Shift ${selectedMachine.shift}`,    mono: true },
              { label: 'Today Output',  value: `${selectedMachine.outputToday} m`,  mono: true, accent: 'text-[var(--ok)] font-bold' },
              { label: 'Progress',      value: `${selectedMachine.progress}%`,      mono: true },
            ],
          },
        ] : []}
      />
    </div>
  );
}
