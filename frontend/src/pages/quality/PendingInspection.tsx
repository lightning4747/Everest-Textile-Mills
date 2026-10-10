import { useState } from 'react';
import { Clock, CheckCircle2, RotateCcw, XCircle, ShieldAlert } from 'lucide-react';
import { fabricRolls as initialRolls, salesOrders, machines } from '../../data/mockData';
import type { QCResult } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';

export default function PendingInspection() {
  const [rolls, setRolls] = useState(initialRolls);
  const pending = rolls.filter(r => r.qcResult === 'pending');

  const { paginatedData, ...paginationProps } = usePagination(pending, 10);

  const handleAction = (rollId: string, result: QCResult) => {
    setRolls(prev => prev.map(r => r.id === rollId ? { ...r, qcResult: result, checkedAt: 'Just now', checkedBy: 'Supervisor' } : r));
  };

  return (
    <div className="space-y-6">
      {/* Alert Header */}
      <div className="card p-4 border-l-4 border-l-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_10%,var(--surface))] flex items-center gap-3">
        <Clock size={20} className="text-[var(--warn)] flex-shrink-0" />
        <div>
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">
            {pending.length} fabric roll{pending.length !== 1 ? 's' : ''} awaiting laboratory inspection
          </h2>
          <p className="text-xs text-[var(--text-soft)]">
            Examine rolls on grading table for yarn irregularities, warp/weft defects, and dye consistency.
          </p>
        </div>
      </div>

      {/* Rolls Queue */}
      <div className="space-y-5">
        {pending.length === 0 ? (
          /* Empty State */
          <div className="card p-16 flex flex-col items-center justify-center text-center gap-3">
            <ShieldAlert size={40} className="text-[var(--olive-grey)]" />
            <p className="text-sm font-semibold text-[var(--text)]">All produced fabric rolls have been inspected and cleared.</p>
          </div>
        ) : (
          <>
            {paginatedData.map(roll => {
              const order   = salesOrders.find(o => o.id === roll.orderId);
              const machine = machines.find(m => m.id === roll.machineId);

              return (
                <div key={roll.id} className="card p-5 border-l-4 border-l-[var(--warn)] space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-bold text-[var(--olive-dark)]">{roll.id}</span>
                        <span className="badge-status-warn">Pending Inspection</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
                        <div>
                          <span className="text-[var(--text-soft)] block uppercase text-[10px] font-semibold">Order Ref</span>
                          <span className="font-mono font-bold text-[var(--olive-dark)]">{roll.orderId}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-soft)] block uppercase text-[10px] font-semibold">Buyer</span>
                          <span className="font-medium text-[var(--text)]">{order?.buyer ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-soft)] block uppercase text-[10px] font-semibold">Machine / Unit</span>
                          <span className="font-mono text-[var(--text)]">{roll.machineId} ({machine?.type ?? '—'})</span>
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

                  {/* Quality Action Buttons */}
                  <div className="pt-3 border-t border-[var(--border)]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)] mb-2.5">
                      Inspection Verdict:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => handleAction(roll.id, 'passed')}
                        className="btn-quality-pass"
                      >
                        <CheckCircle2 size={20} />
                        <span>Pass Roll (Ready)</span>
                      </button>
                      <button
                        onClick={() => handleAction(roll.id, 'rework')}
                        className="btn-quality-rework"
                      >
                        <RotateCcw size={20} />
                        <span>Mark Rework (Scouring/Re-dye)</span>
                      </button>
                      <button
                        onClick={() => handleAction(roll.id, 'rejected')}
                        className="btn-quality-reject"
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
