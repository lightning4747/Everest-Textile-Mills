import React from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import type { MachineStatus, OrderStatus, QCResult } from '../../types';

type StatusValue = MachineStatus | OrderStatus | QCResult | string;

type ThemeStatusType = 'ok' | 'idle' | 'bad' | 'warn';

interface StatusConfig {
  label: string;
  type: ThemeStatusType;
  icon: LucideIcon;
  iconClass?: string;
}

const statusConfigMap: Record<string, StatusConfig> = {
  // Production / Manufacturing Statuses
  spinning:      { label: 'Spinning',      type: 'warn', icon: Disc,          iconClass: 'animate-spin' },
  weaving:       { label: 'Weaving',       type: 'warn', icon: Activity,      iconClass: 'animate-pulse' },
  dyeing:        { label: 'Dyeing',        type: 'warn', icon: Droplet,       iconClass: 'animate-pulse' },
  running:       { label: 'Running',       type: 'ok',   icon: RotateCw,      iconClass: 'animate-spin' },

  // Quality & QC Statuses
  quality_check: { label: 'QC Check',      type: 'warn', icon: FlaskConical,  iconClass: 'animate-pulse' },
  yarn_check:    { label: 'Yarn Check',    type: 'warn', icon: FlaskConical,  iconClass: 'animate-pulse' },
  passed:        { label: 'Passed',        type: 'ok',   icon: CheckCircle2,  iconClass: '' },
  pass:          { label: 'Pass',          type: 'ok',   icon: CheckCircle2,  iconClass: '' },
  ready:         { label: 'Ready',         type: 'ok',   icon: CheckCircle2,  iconClass: '' },
  rework:        { label: 'Rework',        type: 'warn', icon: RotateCcw,     iconClass: 'animate-spin' },
  reject:        { label: 'Reject',        type: 'bad',  icon: XCircle,       iconClass: 'animate-bounce' },
  rejected:      { label: 'Rejected',      type: 'bad',  icon: XCircle,       iconClass: 'animate-bounce' },

  // Logistics & Sales Statuses
  ready_to_ship: { label: 'Ready to Ship', type: 'ok',   icon: PackageCheck,  iconClass: 'animate-pulse' },
  prepared:      { label: 'Prepared',      type: 'warn', icon: PackageCheck,  iconClass: 'animate-pulse' },
  dispatched:    { label: 'Dispatched',    type: 'idle', icon: Truck,         iconClass: 'animate-pulse' },
  shipping:      { label: 'Shipping',      type: 'ok',   icon: Truck,         iconClass: 'animate-pulse' },
  in_transit:    { label: 'In Transit',    type: 'warn', icon: Truck,         iconClass: 'animate-pulse' },
  delivered:     { label: 'Delivered',     type: 'ok',   icon: CheckCircle2,  iconClass: '' },
  completed:     { label: 'Completed',     type: 'ok',   icon: CheckCircle2,  iconClass: '' },

  // Idle / Machine Health Statuses
  idle:          { label: 'Idle',          type: 'idle', icon: PauseCircle,   iconClass: '' },
  draft:         { label: 'Draft',         type: 'idle', icon: PauseCircle,   iconClass: '' },
  pending:       { label: 'Pending',       type: 'idle', icon: Clock,         iconClass: 'animate-pulse' },
  queued:        { label: 'Queued',        type: 'idle', icon: Clock,         iconClass: 'animate-pulse' },
  maintenance:   { label: 'Maintenance',   type: 'warn', icon: Wrench,        iconClass: 'animate-pulse' },
  breakdown:     { label: 'Breakdown',     type: 'bad',  icon: AlertOctagon,  iconClass: 'animate-bounce' },
  critical:      { label: 'Critical',      type: 'bad',  icon: AlertOctagon,  iconClass: 'animate-bounce' },
  loaded:        { label: 'Loaded',        type: 'warn', icon: Clock,         iconClass: 'animate-pulse' },
  paused:        { label: 'Paused',        type: 'warn', icon: PauseCircle,   iconClass: '' },
  in_progress:   { label: 'In Progress',   type: 'warn', icon: RotateCw,      iconClass: 'animate-spin' },
  warning:       { label: 'Warning',       type: 'warn', icon: AlertOctagon,  iconClass: 'animate-pulse' },
};

interface Props {
  status: StatusValue;
  showDot?: boolean;
}

const StatusBadge = React.memo(function StatusBadge({ status, showDot = true }: Props) {
  const normKey = (status || '').toString().toLowerCase();
  const cfg = statusConfigMap[normKey] ?? {
    label: (status || '').toString().replace(/_/g, ' '),
    type: 'idle' as ThemeStatusType,
    icon: Clock,
    iconClass: '',
  };

  const badgeClass = {
    ok: 'badge-status-ok',
    idle: 'badge-status-idle',
    bad: 'badge-status-bad',
    warn: 'badge-status-warn',
  }[cfg.type];

  const IconComponent = cfg.icon;

  return (
    <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
      {showDot && <IconComponent size={13} className={`flex-shrink-0 ${cfg.iconClass}`} />}
      <span>{cfg.label}</span>
    </span>
  );
});

export default StatusBadge;
