interface Props {
  value: number;
  color?: 'default' | 'ok' | 'warn' | 'bad' | 'amber' | 'green' | 'red' | 'sky';
  showLabel?: boolean;
  thin?: boolean;
}

export default function ProgressBar({ value, color = 'default', showLabel = false, thin = false }: Props) {
  const pct = Math.min(100, Math.max(0, value));

  const fillColorClass = (() => {
    if (color === 'ok' || color === 'green') return 'bg-[var(--ok)]';
    if (color === 'warn' || color === 'amber') return 'bg-[var(--warn)]';
    if (color === 'bad' || color === 'red') return 'bg-[var(--bad)]';
    return 'bg-[var(--cyprus)]';
  })();

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-[var(--cyprus-light)] rounded-full overflow-hidden ${thin ? 'h-1.5' : 'h-2'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${fillColorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-[var(--text-soft)] font-mono w-9 text-right font-medium">{pct}%</span>}
    </div>
  );
}
