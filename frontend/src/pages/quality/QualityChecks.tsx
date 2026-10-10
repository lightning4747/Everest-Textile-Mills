import { useState, useMemo } from 'react';
import { ShieldCheck, Plus, Search, SearchX, X, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import type { QCResult } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';

interface BackendFabricRoll {
  id: string;
  orderId: string;
  buyer?: string | null;
  machineId: string;
  machineName?: string | null;
  machineType?: string | null;
  metres: number;
  producedDate: string;
  qcResult: string;
  defects?: string[];
  checkedBy?: string | null;
  checkedAt?: string | null;
}

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [newRoll, setNewRoll] = useState({
    rollId: `FR-${Math.floor(5500 + Math.random() * 500)}`,
    salesOrderId: 'ORD-1040',
    lengthMetres: 150,
    widthInches: 58,
    weightKg: 45,
    grade: 'A',
    defectsCount: 0,
    qcResult: 'passed',
    remarks: 'Laboratory inspection completed',
  });

  const { data: rawRolls, loading, error, refetch } = useApi<BackendFabricRoll[]>(
    () => api.get<BackendFabricRoll[]>('/fabric-rolls?limit=200'),
    [],
    { autoPollMs: 15000 }
  );

  const rolls = rawRolls || [];

  const counts = {
    all:      rolls.length,
    passed:   rolls.filter(r => r.qcResult === 'passed').length,
    rework:   rolls.filter(r => r.qcResult === 'rework').length,
    rejected: rolls.filter(r => r.qcResult === 'rejected').length,
    pending:  rolls.filter(r => r.qcResult === 'pending').length,
  };

  const filtered = useMemo(() => {
    const base = filter === 'all' ? rolls : rolls.filter(r => r.qcResult === filter);
    return base.filter(r => {
      const textMatch =
        r.id.toLowerCase().includes(debouncedRollSearch.toLowerCase()) ||
        r.orderId.toLowerCase().includes(debouncedRollSearch.toLowerCase()) ||
        (r.buyer && r.buyer.toLowerCase().includes(debouncedRollSearch.toLowerCase()));
      const typeMatch =
        machineType === 'all' ||
        (r.machineType && r.machineType.toLowerCase() === machineType.toLowerCase());
      return textMatch && typeMatch;
    });
  }, [rolls, filter, debouncedRollSearch, machineType]);

  const { paginatedData, ...paginationProps } = usePagination(filtered, 20);

  const handleReset = () => {
    setFilter('all');
    setRollSearch('');
    setMachineType('all');
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await api.post('/fabric-rolls', {
        rollId: newRoll.rollId,
        salesOrderId: newRoll.salesOrderId,
        lengthMetres: Number(newRoll.lengthMetres),
        widthInches: Number(newRoll.widthInches),
        weightKg: Number(newRoll.weightKg),
        grade: newRoll.grade,
        defectsCount: Number(newRoll.defectsCount),
        qcResult: newRoll.qcResult,
        remarks: newRoll.remarks,
      });
      setIsModalOpen(false);
      setNewRoll({
        rollId: `FR-${Math.floor(5500 + Math.random() * 500)}`,
        salesOrderId: 'ORD-1040',
        lengthMetres: 150,
        widthInches: 58,
        weightKg: 45,
        grade: 'A',
        defectsCount: 0,
        qcResult: 'passed',
        remarks: 'Laboratory inspection completed',
      });
      refetch();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save quality inspection');
    } finally {
      setIsSubmitting(false);
    }
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
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors"
            title="Refresh"
            aria-label="Refresh checks"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary text-xs h-10"
          >
            <Plus size={14} /> Log Quality Inspection
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-xs">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading && rolls.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-soft)] font-mono animate-pulse">
            Loading quality checks…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <SearchX size={36} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No inspection records match the current filters</p>
            <button className="btn-secondary text-xs" onClick={handleReset}>Reset Filters</button>
          </div>
        ) : (
          <>
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
                    return (
                      <tr key={roll.id} className="table-row-hover">
                        <td className="px-4 py-3.5 text-left">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-[var(--olive-grey)]" />
                            <span className="text-xs font-mono font-bold text-[var(--olive-dark)]">{roll.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{roll.orderId}</td>
                        <td className="px-4 py-3.5 text-xs font-medium text-[var(--text)] text-left">{roll.buyer ?? '—'}</td>
                        <td className="px-4 py-3.5 text-left">
                          <p className="text-xs font-mono text-[var(--text)]">{roll.machineId}</p>
                          {roll.machineName && <p className="text-[10px] text-[var(--text-soft)]">{roll.machineName}</p>}
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
                        <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">
                          {roll.checkedAt ? roll.checkedAt.slice(0, 16).replace('T', ' ') : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={roll.qcResult} />
                        </td>
                      </tr>
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

      {/* Log Inspection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-syne font-bold text-base text-[var(--text)]">Log Quality Inspection</h3>
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

            <form onSubmit={handleCreateInspection} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Roll ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoll.rollId}
                    onChange={e => setNewRoll(r => ({ ...r, rollId: e.target.value }))}
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Sales Order ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoll.salesOrderId}
                    onChange={e => setNewRoll(r => ({ ...r, salesOrderId: e.target.value }))}
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Length (m) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRoll.lengthMetres}
                    onChange={e => setNewRoll(r => ({ ...r, lengthMetres: Number(e.target.value) }))}
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Width (in) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRoll.widthInches}
                    onChange={e => setNewRoll(r => ({ ...r, widthInches: Number(e.target.value) }))}
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Weight (kg) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRoll.weightKg}
                    onChange={e => setNewRoll(r => ({ ...r, weightKg: Number(e.target.value) }))}
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Grade
                  </label>
                  <select
                    value={newRoll.grade}
                    onChange={e => setNewRoll(r => ({ ...r, grade: e.target.value }))}
                    className="input-field text-xs font-mono w-full"
                  >
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    Defects Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newRoll.defectsCount}
                    onChange={e => setNewRoll(r => ({ ...r, defectsCount: Number(e.target.value) }))}
                    className="input-field text-xs font-mono w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                    QC Verdict
                  </label>
                  <select
                    value={newRoll.qcResult}
                    onChange={e => setNewRoll(r => ({ ...r, qcResult: e.target.value }))}
                    className="input-field text-xs font-mono w-full"
                  >
                    <option value="passed">Passed</option>
                    <option value="rework">Rework</option>
                    <option value="rejected">Rejected</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
                  Inspection Remarks
                </label>
                <input
                  type="text"
                  value={newRoll.remarks}
                  onChange={e => setNewRoll(r => ({ ...r, remarks: e.target.value }))}
                  className="input-field text-xs font-mono w-full"
                />
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
                  {isSubmitting ? 'Logging…' : 'Record Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
