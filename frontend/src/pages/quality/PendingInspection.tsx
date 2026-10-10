import { useState } from 'react';
import { Clock, CheckCircle2, RotateCcw, XCircle, ShieldAlert, RefreshCw, FlaskConical, Search } from 'lucide-react';
import type { QCResult } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';

interface BackendPendingRoll {
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

export default function PendingInspection() {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: rawRolls, loading, error, refetch } = useApi<BackendPendingRoll[]>(
    () => api.get<BackendPendingRoll[]>('/fabric-rolls/pending'),
    [],
    { autoPollMs: 15000 }
  );

  const pending = rawRolls || [];

  const filtered = pending.filter(roll => {
    if (!debouncedSearch.trim()) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      roll.id.toLowerCase().includes(q) ||
      roll.orderId.toLowerCase().includes(q) ||
      (roll.buyer && roll.buyer.toLowerCase().includes(q)) ||
      (roll.machineId && roll.machineId.toLowerCase().includes(q)) ||
      (roll.machineType && roll.machineType.toLowerCase().includes(q))
    );
  });

  const { paginatedData, ...paginationProps } = usePagination(filtered, 10);

  const handleAction = async (rollId: string, result: QCResult) => {
    setUpdatingId(rollId);
    setActionError(null);
    try {
      await api.patch(`/fabric-rolls/${rollId}/qc`, {
        qcResult: result,
        grade: result === 'passed' ? 'A' : result === 'rework' ? 'B' : 'C',
        remarks: `Verdict marked as ${result} via Quality Inspection`,
      });
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update roll status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Header */}
      <div className="card p-4 border-l-4 border-l-[var(--warn)] bg-[var(--surface-2)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-[var(--warn)] flex-shrink-0" />
          <div>
            <h2 className="text-sm font-display font-semibold text-[var(--cyprus)]">
              {pending.length} fabric roll{pending.length !== 1 ? 's' : ''} awaiting laboratory inspection
            </h2>
            <p className="text-xs text-[var(--text-soft)]">
              Examine rolls on grading table for yarn irregularities, warp/weft defects, and dye consistency.
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors"
          title="Refresh"
          aria-label="Refresh list"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by roll ID, order ID, buyer, machine..."
            className="input-field h-10 pl-9 text-xs font-mono w-full"
          />
        </div>
      </div>

      {/* Threshold Info Banner */}
      <div className="card p-3.5 flex items-center gap-3 border-l-4 border-l-[var(--warn)] bg-[var(--surface)]">
        <FlaskConical size={16} className="text-[var(--warn)] flex-shrink-0" />
        <p className="text-xs text-[var(--text-soft)]">
          Inspection criteria: Yarn irregularity &lt; 5%, Warp/weft defect density &lt; 2 per metre,
          Dye consistency ΔE &lt; 1.5. Rolls failing any criterion are flagged for rejection.
          <strong className="text-[var(--text)] ml-1"> Threshold: pass ≥ 60%, reject &lt; 60% quality score.</strong>
        </p>
      </div>

      {(error || actionError) && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-xs">
          {error || actionError}
        </div>
      )}

      {/* Rolls Queue */}
      <div className="space-y-5">
        {loading && pending.length === 0 ? (
          <div className="card p-12 text-center text-xs text-[var(--text-soft)] font-mono animate-pulse">
            Checking inspection queue…
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="card p-16 flex flex-col items-center justify-center text-center gap-3">
            <ShieldAlert size={40} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">
              {search ? 'No rolls match your search filter.' : 'All produced fabric rolls have been inspected and cleared.'}
            </p>
            {search && (
              <button className="btn-secondary text-xs" onClick={() => setSearch('')}>
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            {paginatedData.map(roll => {
              const isUpdating = updatingId === roll.id;

              return (
                <div key={roll.id} className="card p-5 border-l-4 border-l-[var(--warn)] space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-bold text-[var(--cyprus)]">{roll.id}</span>
                        <span className="badge-status-warn">Pending Inspection</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
                        <div>
                          <span className="text-[var(--text-soft)] block uppercase text-[10px] font-semibold">Order Ref</span>
                          <span className="font-mono font-bold text-[var(--cyprus)]">{roll.orderId}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-soft)] block uppercase text-[10px] font-semibold">Buyer</span>
                          <span className="font-medium text-[var(--text)]">{roll.buyer ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-soft)] block uppercase text-[10px] font-semibold">Machine / Unit</span>
                          <span className="font-mono text-[var(--text)]">
                            {roll.machineId} {roll.machineType ? `(${roll.machineType})` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-soft)] block uppercase text-[10px] font-semibold">Batch Length</span>
                          <span className="font-mono font-bold text-[var(--ok)]">{roll.metres} metres</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[var(--text-soft)] font-mono">
                      <span>Produced: {roll.producedDate}</span>
                    </div>
                  </div>

                  {/* Pending Reason */}
                  <div className="mt-2 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-soft)]">
                    <p className="font-semibold text-[var(--text)] mb-1">Pending reason:</p>
                    <p>Roll produced on {roll.producedDate}. Awaiting lab grading table inspection for weave density,
                    colour fastness (ISO 105-C06), and tensile elongation test. No inspector assigned yet.</p>
                  </div>

                  {/* Quality Action Buttons */}
                  <div className="pt-3 border-t border-[var(--border)]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)] mb-2.5">
                      Inspection Verdict:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => handleAction(roll.id, 'passed')}
                        disabled={isUpdating}
                        className="btn-quality-pass disabled:opacity-50"
                      >
                        <CheckCircle2 size={20} />
                        <span>Pass Roll (Ready)</span>
                      </button>
                      <button
                        onClick={() => handleAction(roll.id, 'rejected')}
                        disabled={isUpdating}
                        className="btn-quality-reject disabled:opacity-50"
                      >
                        <XCircle size={20} />
                        <span>Reject / Scrap</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <Pagination {...paginationProps} />
          </>
        )}
      </div>
    </div>
  );
}

