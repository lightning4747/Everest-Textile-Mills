import type { MachineStatus, OrderStatus, QCResult } from '../../types';

type StatusValue = MachineStatus | OrderStatus | QCResult | string;

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  running:       { label: 'Running',       cls: 'badge-green', dot: 'dot-green' },
  idle:          { label: 'Idle',          cls: 'badge-gray',  dot: 'dot-gray' },
  maintenance:   { label: 'Maintenance',   cls: 'badge-amber', dot: 'dot-amber' },
  breakdown:     { label: 'Breakdown',     cls: 'badge-red',   dot: 'dot-red' },
  pending:       { label: 'Pending',       cls: 'badge-gray',  dot: 'dot-gray' },
  yarn_check:    { label: 'Yarn Check',    cls: 'badge-sky',   dot: 'dot-gray' },
  spinning:      { label: 'Spinning',      cls: 'badge-sky',   dot: 'dot-gray' },
  weaving:       { label: 'Weaving',       cls: 'badge-sky',   dot: 'dot-gray' },
  dyeing:        { label: 'Dyeing',        cls: 'badge-sky',   dot: 'dot-gray' },
  quality_check: { label: 'QC Check',      cls: 'badge-amber', dot: 'dot-amber' },
  ready_to_ship: { label: 'Ready to Ship', cls: 'badge-green', dot: 'dot-green' },
  dispatched:    { label: 'Dispatched',    cls: 'badge-gray',  dot: 'dot-gray' },
  passed:        { label: 'Passed',        cls: 'badge-green', dot: 'dot-green' },
  rework:        { label: 'Rework',        cls: 'badge-amber', dot: 'dot-amber' },
  rejected:      { label: 'Rejected',      cls: 'badge-red',   dot: 'dot-red' },
  prepared:      { label: 'Prepared',      cls: 'badge-sky',   dot: 'dot-gray' },
  loaded:        { label: 'Loaded',        cls: 'badge-amber', dot: 'dot-amber' },
  delivered:     { label: 'Delivered',     cls: 'badge-green', dot: 'dot-green' },
  queued:        { label: 'Queued',        cls: 'badge-gray',  dot: 'dot-gray' },
  in_progress:   { label: 'In Progress',   cls: 'badge-sky',   dot: 'dot-gray' },
  paused:        { label: 'Paused',        cls: 'badge-amber', dot: 'dot-amber' },
  completed:     { label: 'Completed',     cls: 'badge-green', dot: 'dot-green' },
};

interface Props {
  status: StatusValue;
  showDot?: boolean;
}

export default function StatusBadge({ status, showDot = true }: Props) {
  const cfg = statusConfig[status] ?? { label: status, cls: 'badge-gray', dot: 'dot-gray' };
  return (
    <span className={cfg.cls}>
      {showDot && <span className={cfg.dot}></span>}
      {cfg.label}
    </span>
  );
}
