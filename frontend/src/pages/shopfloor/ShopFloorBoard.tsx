import { useState } from 'react';
import { Gauge, User, Zap, AlertTriangle, Wrench, Clock, Filter } from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import StatusBadge from '../../components/ui/StatusBadge';
import { machines } from '../../data/mockData';
import type { MachineType, MachineStatus } from '../../types';

const typeColors: Record<MachineType, string> = {
  spinning: 'text-sky-700 bg-sky-50 border-sky-200',
  weaving:  'text-purple-700 bg-purple-50 border-purple-200',
  dyeing:   'text-pink-700 bg-pink-50 border-pink-200',
};

const statusBorder: Record<MachineStatus, string> = {
  running:     'border-emerald-300 shadow-emerald-100 shadow-md',
  idle:        'border-slate-200',
  maintenance: 'border-amber-300 shadow-amber-100 shadow-md',
  breakdown:   'border-red-300 shadow-red-100 shadow-md',
};

const statusIconBg: Record<MachineStatus, string> = {
  running:     'bg-emerald-100 text-emerald-600',
  idle:        'bg-slate-100 text-slate-400',
  maintenance: 'bg-amber-100 text-amber-600',
  breakdown:   'bg-red-100 text-red-600',
};

const StatusIcon = ({ status }: { status: MachineStatus }) => {
  if (status === 'running')     return <Zap size={14} />;
  if (status === 'breakdown')   return <AlertTriangle size={14} />;
  if (status === 'maintenance') return <Wrench size={14} />;
  return <Clock size={14} />;
};

export default function ShopFloorBoard() {
  const [filterType,   setFilterType]   = useState<MachineType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MachineStatus | 'all'>('all');

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

  return (
    <div className="space-y-5">
      {/* Status summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: 'Running',     count: counts.running,     border: 'border-emerald-200 bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700' },
          { label: 'Idle',        count: counts.idle,        border: 'border-slate-200 bg-white',         dot: 'bg-slate-400',   text: 'text-slate-600' },
          { label: 'Maintenance', count: counts.maintenance, border: 'border-amber-200 bg-amber-50',      dot: 'bg-amber-500',   text: 'text-amber-700' },
          { label: 'Breakdown',   count: counts.breakdown,   border: 'border-red-200 bg-red-50',          dot: 'bg-red-500',     text: 'text-red-700' },
        ] as const).map(item => (
          <button
            key={item.label}
            onClick={() => setFilterStatus(filterStatus === item.label.toLowerCase() as MachineStatus ? 'all' : item.label.toLowerCase() as MachineStatus)}
            className={`rounded-xl border p-3 flex items-center gap-3 transition-all hover:scale-[1.01] shadow-sm ${item.border} ${
              filterStatus === item.label.toLowerCase() ? 'ring-2 ring-amber-400' : ''
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.dot} ${item.label === 'Running' ? 'animate-pulse' : ''}`} />
            <div>
              <p className={`text-xl font-bold font-mono ${item.text}`}>{item.count}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{item.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={13} className="text-slate-400" />
        <span className="text-xs text-slate-400 mr-1">Type:</span>
        {(['all', 'spinning', 'weaving', 'dyeing'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filterType === t
                ? 'bg-amber-100 text-amber-700 border-amber-300'
                : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 bg-white'
            }`}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Machine grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(machine => (
          <div
            key={machine.id}
            className={`bg-white border rounded-xl p-4 transition-all duration-200 ${statusBorder[machine.status]}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${statusIconBg[machine.status]}`}>
                  <StatusIcon status={machine.status} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{machine.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">{machine.id}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={machine.status} />
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide ${typeColors[machine.type]}`}>
                  {machine.type}
                </span>
              </div>
            </div>

            {/* Current order */}
            <div className="bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-100">
              {machine.currentOrder ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Current Order</p>
                    <p className="text-sm font-mono font-semibold text-amber-600">{machine.currentOrder}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Shift</p>
                    <p className="text-xs font-semibold text-slate-700">{machine.shift}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No active order</p>
              )}
            </div>

            {/* Progress */}
            {machine.status === 'running' && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Order Progress</p>
                  <span className="text-[10px] font-mono text-slate-500">{machine.progress}%</span>
                </div>
                <ProgressBar value={machine.progress} color={machine.progress > 80 ? 'green' : 'amber'} />
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <User size={11} />
                <span>{machine.operator ?? '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Gauge size={11} className="text-slate-400" />
                <span className="text-xs font-mono text-slate-700">
                  {machine.outputToday > 0 ? `${machine.outputToday} m` : '0 m'}
                </span>
                <span className="text-[10px] text-slate-400">today</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 flex items-center justify-center">
          <p className="text-slate-400 text-sm">No machines match the selected filters.</p>
        </div>
      )}
    </div>
  );
}
