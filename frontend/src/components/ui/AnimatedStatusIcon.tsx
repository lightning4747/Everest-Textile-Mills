import { RotateCw, PauseCircle, Wrench, AlertOctagon, Disc, Droplet, Activity } from 'lucide-react';

interface AnimatedStatusIconProps {
  status?: string;
  type?: string;
  showText?: boolean;
}

export function AnimatedStatusIcon({ status, type, showText = true }: AnimatedStatusIconProps) {
  const normStatus = (status || '').toLowerCase();
  const normType = (type || '').toLowerCase();

  // If machine type is specified (spinning, dyeing, weaving)
  if (normType) {
    if (normType === 'spinning') {
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-600">
          <Disc size={14} className="animate-spin text-emerald-500" />
          {showText && <span>Spinning Unit</span>}
        </span>
      );
    }
    if (normType === 'dyeing') {
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-sky-600">
          <Droplet size={14} className="animate-pulse text-sky-500" />
          {showText && <span>Dyeing Vat</span>}
        </span>
      );
    }
    if (normType === 'weaving') {
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-600">
          <Activity size={14} className="animate-pulse text-amber-500" />
          {showText && <span>Weaving Loom</span>}
        </span>
      );
    }
  }

  // Status-based icons (running, idle, maintenance, breakdown)
  if (normStatus === 'running') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ok)]">
        <RotateCw size={14} className="animate-spin text-[var(--ok)]" />
        {showText && <span>Running</span>}
      </span>
    );
  }

  if (normStatus === 'idle') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--text-soft)]">
        <PauseCircle size={14} className="text-[var(--olive-grey)]" />
        {showText && <span>Idle</span>}
      </span>
    );
  }

  if (normStatus === 'maintenance') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--warn)]">
        <Wrench size={14} className="animate-pulse text-[var(--warn)]" />
        {showText && <span>Maintenance</span>}
      </span>
    );
  }

  if (normStatus === 'breakdown') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--bad)]">
        <AlertOctagon size={14} className="animate-bounce text-[var(--bad)]" />
        {showText && <span>Breakdown</span>}
      </span>
    );
  }

  return <span className="font-mono text-xs">{status || type}</span>;
}
