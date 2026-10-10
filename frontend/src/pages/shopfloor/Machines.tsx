import { useMemo, useState } from 'react';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { Plus, Search, SearchX, X, AlertCircle } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';
import type { Machine, MachineType } from '../../types';

export default function Machines() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // New Machine form state
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<MachineType>('spinning');
  const [dailyTarget, setDailyTarget] = useState<number>(500);

  const debouncedSearch = useDebounce(search, 300);

  const { data, loading, error, refetch } = useApi<Machine[]>(
    () => api.get<Machine[]>('/machines'),
    [],
    { autoPollMs: 15000 }
  );

  const machineList = data || [];

  const filtered = useMemo(
    () =>
      machineList.filter(
        m =>
          m.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          m.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          m.type.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [machineList, debouncedSearch],
  );

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filtered, 20);

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newId.trim()) {
      setAddError('Machine ID is required (e.g. SP-04)');
      return;
    }
    if (!newName.trim()) {
      setAddError('Machine name is required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post<Machine>('/machines', {
        id: newId.trim().toUpperCase(),
        name: newName.trim(),
        type: newType,
        dailyTarget: Number(dailyTarget),
      });

      setNewId('');
      setNewName('');
      setDailyTarget(500);
      setShowAddModal(false);
      await refetch();
    } catch (err: any) {
      setAddError(err?.message || 'Failed to add machine unit');
    } finally {
      setSubmitting(false);
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
            placeholder="Search by ID, name, type…"
            className="input-field h-10 pl-9 text-xs font-mono w-full"
            aria-label="Search machines"
          />
        </div>
        <button className="btn-primary text-xs h-10 flex-shrink-0" onClick={() => setShowAddModal(true)}>
          <Plus size={14} /> Add Machine Unit
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Add Machine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 bg-[var(--surface)] border border-[var(--border)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-display font-semibold text-[var(--text)]">Register Machine Unit</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-soft)] hover:text-[var(--text)]">
                <X size={16} />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddMachine} className="space-y-3.5">
              <div>
                <label className="section-title block mb-1">Unit ID (Code)</label>
                <input
                  type="text"
                  value={newId}
                  onChange={e => setNewId(e.target.value)}
                  placeholder="e.g. SP-04, WV-05"
                  required
                  className="input-field text-xs font-mono w-full"
                />
              </div>
              <div>
                <label className="section-title block mb-1">Unit Display Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Spinner Delta"
                  required
                  className="input-field text-xs w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-title block mb-1">Process Type</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as MachineType)}
                    className="input-field text-xs w-full"
                  >
                    <option value="spinning">Spinning</option>
                    <option value="weaving">Weaving</option>
                    <option value="dyeing">Dyeing</option>
                  </select>
                </div>
                <div>
                  <label className="section-title block mb-1">Daily Target (m)</label>
                  <input
                    type="number"
                    value={dailyTarget}
                    onChange={e => setDailyTarget(Number(e.target.value))}
                    required
                    min="1"
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? 'Registering...' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading && machineList.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-soft)] font-mono">
            Loading machine fleet telemetry...
          </div>
        ) : filtered.length === 0 ? (
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
