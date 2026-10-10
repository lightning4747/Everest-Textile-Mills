interface Props {
  value: number;
  color?: 'amber' | 'green' | 'red' | 'sky';
  showLabel?: boolean;
  thin?: boolean;
}

const colorMap = {
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
  red:   'bg-red-500',
  sky:   'bg-sky-400',
};

export default function ProgressBar({ value, color = 'amber', showLabel = false, thin = false }: Props) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-slate-200 rounded-full overflow-hidden ${thin ? 'h-1' : 'h-1.5'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorMap[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-slate-500 font-mono w-8 text-right">{pct}%</span>}
    </div>
  );
}
