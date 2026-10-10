import {
  RotateCw,
  PauseCircle,
  Wrench,
  AlertOctagon,
  Disc,
  Droplet,
  Activity,
  Truck,
  PackageCheck,
  FlaskConical,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
} from 'lucide-react';

interface AnimatedStatusIconProps {
  status?: string;
  type?: string;
  showText?: boolean;
}

export function AnimatedStatusIcon({ status, type, showText = true }: AnimatedStatusIconProps) {
  const s = (status || type || '').toLowerCase();

  // Spinning
  if (s === 'spinning') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-600">
        <Disc size={14} className="animate-spin text-emerald-500 flex-shrink-0" />
        {showText && <span>Spinning</span>}
      </span>
    );
  }

  // Dyeing
  if (s === 'dyeing') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-sky-600">
        <Droplet size={14} className="animate-pulse text-sky-500 flex-shrink-0" />
        {showText && <span>Dyeing</span>}
      </span>
    );
  }

  // Weaving
  if (s === 'weaving') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-600">
        <Activity size={14} className="animate-pulse text-amber-500 flex-shrink-0" />
        {showText && <span>Weaving</span>}
      </span>
    );
  }

  // Ready to Ship / Prepared
  if (s === 'ready_to_ship' || s === 'ready' || s === 'prepared') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-teal-600">
        <PackageCheck size={14} className="animate-pulse text-teal-500 flex-shrink-0" />
        {showText && <span>Ready to Ship</span>}
      </span>
    );
  }

  // Dispatched / Shipping / In Transit
  if (s === 'dispatched' || s === 'shipping' || s === 'in_transit' || s === 'dispatch') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-600">
        <Truck size={14} className="animate-pulse text-indigo-500 flex-shrink-0" />
        {showText && <span>Dispatched</span>}
      </span>
    );
  }

  // Quality Check / QC
  if (s === 'quality_check' || s === 'qc_check' || s === 'yarn_check' || s === 'pending_inspection') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-purple-600">
        <FlaskConical size={14} className="animate-pulse text-purple-500 flex-shrink-0" />
        {showText && <span>Quality Check</span>}
      </span>
    );
  }

  // Delivered / Completed / Passed
  if (s === 'delivered' || s === 'completed' || s === 'passed' || s === 'pass') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ok)]">
        <CheckCircle2 size={14} className="text-[var(--ok)] flex-shrink-0" />
        {showText && <span>{s === 'delivered' ? 'Delivered' : s === 'passed' || s === 'pass' ? 'Passed' : 'Completed'}</span>}
      </span>
    );
  }

  // Running
  if (s === 'running') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ok)]">
        <RotateCw size={14} className="animate-spin text-[var(--ok)] flex-shrink-0" />
        {showText && <span>Running</span>}
      </span>
    );
  }

  // Idle / Draft
  if (s === 'idle' || s === 'draft') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--text-soft)]">
        <PauseCircle size={14} className="text-[var(--olive-grey)] flex-shrink-0" />
        {showText && <span>{s === 'draft' ? 'Draft' : 'Idle'}</span>}
      </span>
    );
  }

  // Pending / Queued
  if (s === 'pending' || s === 'queued') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-amber-700">
        <Clock size={14} className="animate-pulse text-amber-600 flex-shrink-0" />
        {showText && <span>{s === 'queued' ? 'Queued' : 'Pending'}</span>}
      </span>
    );
  }

  // Maintenance / Paused
  if (s === 'maintenance' || s === 'paused') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--warn)]">
        <Wrench size={14} className="animate-pulse text-[var(--warn)] flex-shrink-0" />
        {showText && <span>Maintenance</span>}
      </span>
    );
  }

  // Rework
  if (s === 'rework') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-orange-600">
        <RotateCcw size={14} className="animate-spin text-orange-500 flex-shrink-0" />
        {showText && <span>Rework</span>}
      </span>
    );
  }

  // Breakdown / Critical / Rejected
  if (s === 'breakdown' || s === 'critical' || s === 'rejected' || s === 'reject') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--bad)]">
        {s === 'rejected' || s === 'reject' ? (
          <XCircle size={14} className="animate-bounce text-[var(--bad)] flex-shrink-0" />
        ) : (
          <AlertOctagon size={14} className="animate-bounce text-[var(--bad)] flex-shrink-0" />
        )}
        {showText && <span>{s === 'rejected' || s === 'reject' ? 'Rejected' : 'Breakdown'}</span>}
      </span>
    );
  }

  return <span className="font-mono text-xs">{status || type}</span>;
}
