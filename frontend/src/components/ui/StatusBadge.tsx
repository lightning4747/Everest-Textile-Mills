import React from 'react';
import type { MachineStatus, OrderStatus, QCResult } from '../../types';

type StatusValue = MachineStatus | OrderStatus | QCResult | string;

type ThemeStatusType = 'ok' | 'idle' | 'bad' | 'warn';

const statusTypeMap: Record<string, { label: string; type: ThemeStatusType }> = {
  // Ok statuses
  running:       { label: 'Running',       type: 'ok' },
  passed:        { label: 'Passed',        type: 'ok' },
  pass:          { label: 'Pass',          type: 'ok' },
  ready:         { label: 'Ready',         type: 'ok' },
  ready_to_ship: { label: 'Ready to Ship', type: 'ok' },
  delivered:     { label: 'Delivered',     type: 'ok' },
  completed:     { label: 'Completed',     type: 'ok' },

  // Idle statuses
  idle:          { label: 'Idle',          type: 'idle' },
  draft:         { label: 'Draft',         type: 'idle' },
  pending:       { label: 'Pending',       type: 'idle' },
  queued:        { label: 'Queued',        type: 'idle' },
  dispatched:    { label: 'Dispatched',    type: 'idle' },

  // Bad statuses
  breakdown:     { label: 'Breakdown',     type: 'bad' },
  reject:        { label: 'Reject',        type: 'bad' },
  rejected:      { label: 'Rejected',      type: 'bad' },
  critical:      { label: 'Critical',      type: 'bad' },

  // Warn statuses
  maintenance:   { label: 'Maintenance',   type: 'warn' },
  loaded:        { label: 'Loaded',        type: 'warn' },
  paused:        { label: 'Paused',        type: 'warn' },
  in_progress:   { label: 'In Progress',   type: 'warn' },
  yarn_check:    { label: 'Yarn Check',    type: 'warn' },
  spinning:      { label: 'Spinning',      type: 'warn' },
  weaving:       { label: 'Weaving',       type: 'warn' },
  dyeing:        { label: 'Dyeing',        type: 'warn' },
  quality_check: { label: 'QC Check',      type: 'warn' },
  warning:       { label: 'Warning',       type: 'warn' },
  prepared:      { label: 'Prepared',      type: 'warn' },
};

interface Props {
  status: StatusValue;
  showDot?: boolean;
}

const StatusBadge = React.memo(function StatusBadge({ status, showDot = true }: Props) {
  const normKey = (status || '').toString().toLowerCase();
  const cfg = statusTypeMap[normKey] ?? {
    label: (status || '').toString().replace(/_/g, ' '),
    type: 'idle' as ThemeStatusType
  };

  const badgeClass = {
    ok: 'badge-status-ok',
    idle: 'badge-status-idle',
    bad: 'badge-status-bad',
    warn: 'badge-status-warn',
  }[cfg.type];

  const dotClass = {
    ok: 'dot-ok',
    idle: 'dot-idle',
    bad: 'dot-bad',
    warn: 'dot-warn',
  }[cfg.type];

  return (
    <span className={badgeClass}>
      {showDot && <span className={`${dotClass} ${cfg.type === 'ok' ? 'animate-pulse' : ''}`} />}
      <span>{cfg.label}</span>
    </span>
  );
});

export default StatusBadge;
