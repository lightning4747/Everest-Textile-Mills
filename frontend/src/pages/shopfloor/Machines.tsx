import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { machines } from '../../data/mockData';
import { Plus } from 'lucide-react';

export default function Machines() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-soft)] text-sm font-medium">{machines.length} registered mill machines</p>
        <button className="btn-primary text-xs">
          <Plus size={14} /> Add Machine Unit
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                {['Machine ID', 'Name', 'Process Type', 'Status', 'Current Order', 'Operator', 'Shift', 'Progress', 'Today Output'].map(h => (
                  <th key={h} className="px-4 py-3 section-title whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {machines.map(m => (
                <tr key={m.id} className="table-row-hover">
                  <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)]">{m.id}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)]">{m.name}</td>
                  <td className="px-4 py-3.5 text-xs text-[var(--text)] capitalize">{m.type}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3.5 text-xs font-mono text-[var(--olive-dark)]">{m.currentOrder ?? '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-[var(--text)]">{m.operator ?? '—'}</td>
                  <td className="px-4 py-3.5 text-xs font-mono font-medium text-[var(--text)]">Shift {m.shift}</td>
                  <td className="px-4 py-3.5 w-32">
                    <ProgressBar
                      value={m.progress}
                      color={m.status === 'running' ? 'ok' : m.status === 'breakdown' ? 'bad' : 'warn'}
                      showLabel
                      thin
                    />
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--text)]">{m.outputToday} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
