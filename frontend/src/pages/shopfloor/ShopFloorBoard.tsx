import { useState, useEffect } from 'react';
import { Clock, Filter, User, Zap, AlertTriangle, Wrench } from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Machine, MachineType, MachineStatus } from '../../types';
import { animateLivePulse } from '../../utils/motion';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';

const statusBorderColor: Record<MachineStatus, string> = {
  running:     'border-l-[var(--ok)]',
  idle:        'border-l-[var(--idle)]',
  maintenance: 'border-l-[var(--warn)]',
  breakdown:   'border-l-[var(--bad)]',
};

const statusIconClass: Record<MachineStatus, string> = {
  running:     'bg-[var(--panel-bg)] text-[var(--ok)]',
  idle:        'bg-[var(--sand)] text-[var(--olive-dark)]',
  maintenance: 'bg-[var(--panel-bg)] text-[var(--warn)]',
  breakdown:   'bg-[var(--panel-bg)] text-[var(--bad)]',
};

const StatusIcon = ({ status }: { status: MachineStatus }) => {
  if (status === 'running')     return <Zap size={15} />;
  if (status === 'breakdown')   return <AlertTriangle size={15} />;
  if (status === 'maintenance') return <Wrench size={15} />;
  return <Clock size={15} />;
};

export default function ShopFloorBoard() {
  const [filterType,   setFilterType]   = useState<MachineType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MachineStatus | 'all'>('all');

  const { data, loading, error } = useApi<Machine[]>(
    () => api.get<Machine[]>('/machines'),
    [],
    { autoPollMs: 10000 }
  );

  const machines = data || [];

  const filtered = machines.filter(m => {
    if (filterType   !== 'all' && m.type   !== filterType)   return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    running:     machines.filter(m => m.status === 'running').length,
    idle:        machines.filter(m => m.status === 'idle').length,
    maintenance: machines.filter(m => m.status === 'maintenance').length,
    breakdown:   machines.filter(m => m.status === 'breakdown').length,
  };

  useEffect(() => {
    animateLivePulse('.live-running-dot');
  }, [filtered]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Status summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: 'Running',     key: 'running',     count: counts.running,     dot: 'bg-[var(--ok)]',   text: 'text-[var(--ok)]',   border: 'border-l-4 border-l-[var(--ok)]' },
          { label: 'Idle',        key: 'idle',        count: counts.idle,        dot: 'bg-[var(--idle)]', text: 'text-[var(--text)]', border: 'border-l-4 border-l-[var(--idle)]' },
          { label: 'Maintenance', key: 'maintenance', count: counts.maintenance, dot: 'bg-[var(--warn)]', text: 'text-[var(--warn)]', border: 'border-l-4 border-l-[var(--warn)]' },
          { label: 'Breakdown',   key: 'breakdown',   count: counts.breakdown,   dot: 'bg-[var(--bad)]',  text: 'text-[var(--bad)]',  border: 'border-l-4 border-l-[var(--bad)]' },
        ] as const).map(item => {
          const isSelected = filterStatus === item.key;
          return (
            <button
              key={item.label}
              onClick={() => setFilterStatus(isSelected ? 'all' : item.key)}
              className={`card p-4 flex items-center justify-between transition-all text-left cursor-pointer ${item.border} ${
                isSelected ? 'ring-2 ring-[var(--olive-dark)] bg-[var(--sand)]/40' : 'hover:border-[var(--olive-dark)]'
              }`}
            >
              <div>
                <p className="stat-label">{item.label}</p>
                <p className={`font-display text-3xl font-semibold mt-1 ${item.text}`}>{item.count}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${item.dot} ${item.key === 'running' ? 'live-running-dot' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-[var(--olive-grey)]" />
        <span className="text-xs font-semibold text-[var(--text-soft)] uppercase tracking-wider mr-1">Machine Class:</span>
        {(['all', 'spinning', 'weaving', 'dyeing'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filterType === t
                ? 'bg-[var(--olive-dark)] text-[var(--cream)] border-[var(--olive-dark)]'
                : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--sand)]/50'
            }`}
          >
            {t === 'all' ? 'All Units' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Machine Kanban Grid */}
      {loading && machines.length === 0 ? (
        <div className="card p-16 text-center text-xs text-[var(--text-soft)] font-mono">
          Syncing shop floor telemetry...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-sm text-[var(--text-soft)]">
          No machines found matching the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(machine => (
            <div
              key={machine.id}
              className={`kanban-card p-4 flex flex-col justify-between gap-4 transition-all duration-200 ${statusBorderColor[machine.status]}`}
            >
              {/* Top header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${statusIconClass[machine.status]}`}>
                      <StatusIcon status={machine.status} />
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-semibold text-[var(--text)] leading-tight">{machine.name}</h3>
                      <p className="text-xs font-mono text-[var(--text-soft)]">{machine.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={machine.status} />
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium uppercase tracking-wider bg-[var(--sand)] text-[var(--olive-dark)]">
                      {machine.type}
                    </span>
                  </div>
                </div>

                {/* Progress & Output */}
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-soft)]">Shift Output:</span>
                    <span className="font-mono font-bold text-[var(--text)]">{machine.outputToday} m</span>
                  </div>
                  <ProgressBar
                    value={machine.progress}
                    color={machine.status === 'running' ? 'ok' : machine.status === 'breakdown' ? 'bad' : 'warn'}
                    showLabel
                  />
                </div>
              </div>

              {/* Bottom details */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-soft)]">
                <div className="flex items-center gap-1.5">
                  <User size={12} className="text-[var(--olive-grey)]" />
                  <span>{machine.operator ?? 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[var(--text)] font-medium">Shift {machine.shift}</span>
                  {machine.currentOrder && (
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--sand)]/70 text-[var(--olive-dark)] font-semibold">
                      {machine.currentOrder}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
