import { useState } from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { fabricRolls, salesOrders, machines } from '../../data/mockData';
import type { QCResult } from '../../types';

const filters: { label: string; value: QCResult | 'all' }[] = [
  { label: 'All Inspections', value: 'all' },
  { label: 'Passed',          value: 'passed' },
  { label: 'Rework',          value: 'rework' },
  { label: 'Rejected',        value: 'rejected' },
  { label: 'Pending',         value: 'pending' },
];

export default function QualityChecks() {
  const [filter, setFilter] = useState<QCResult | 'all'>('all');
  const filtered = filter === 'all' ? fabricRolls : fabricRolls.filter(r => r.qcResult === filter);

  const counts = {
    all:      fabricRolls.length,
    passed:   fabricRolls.filter(r => r.qcResult === 'passed').length,
    rework:   fabricRolls.filter(r => r.qcResult === 'rework').length,
    rejected: fabricRolls.filter(r => r.qcResult === 'rejected').length,
    pending:  fabricRolls.filter(r => r.qcResult === 'pending').length,
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
        <button className="btn-primary text-xs">
          <Plus size={14} /> Log Quality Inspection
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                {['Roll ID','Order Ref','Buyer','Machine Unit','Batch (m)','Produced','Defect Log','Inspector','Timestamp','Verdict'].map(h=>(
                  <th key={h} className="px-4 py-3 section-title whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(roll => {
                const order   = salesOrders.find(o => o.id === roll.orderId);
                const machine = machines.find(m => m.id === roll.machineId);
                return (
                  <tr key={roll.id} className="table-row-hover">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[var(--olive-grey)]" />
                        <span className="text-xs font-mono font-bold text-[var(--olive-dark)]">{roll.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)]">{roll.orderId}</td>
                    <td className="px-4 py-3.5 text-xs font-medium text-[var(--text)]">{order?.buyer ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-mono text-[var(--text)]">{machine?.id ?? roll.machineId}</p>
                      <p className="text-[10px] text-[var(--text-soft)]">{machine?.name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--text)]">{roll.metres} m</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)]">{roll.producedDate}</td>
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5 text-xs text-[var(--text)]">{roll.checkedBy ?? '—'}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)]">{roll.checkedAt ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={roll.qcResult} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
