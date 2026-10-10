interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'amber' | 'green' | 'red' | 'sky' | 'default';
  icon?: React.ReactNode;
  trend?: { value: string; up: boolean };
}

const accentMap = {
  amber:   'border-amber-200 bg-amber-50',
  green:   'border-emerald-200 bg-emerald-50',
  red:     'border-red-200 bg-red-50',
  sky:     'border-sky-200 bg-sky-50',
  default: 'border-slate-200 bg-white',
};

const iconBgMap = {
  amber:   'bg-amber-100 text-amber-600',
  green:   'bg-emerald-100 text-emerald-600',
  red:     'bg-red-100 text-red-600',
  sky:     'bg-sky-100 text-sky-600',
  default: 'bg-slate-100 text-slate-500',
};

const valueMap = {
  amber:   'text-amber-700',
  green:   'text-emerald-700',
  red:     'text-red-700',
  sky:     'text-sky-700',
  default: 'text-slate-900',
};

export default function StatCard({ label, value, sub, accent = 'default', icon, trend }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 shadow-sm ${accentMap[accent]}`}>
      <div className="flex items-start justify-between">
        <p className="stat-label">{label}</p>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgMap[accent]}`}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className={`text-2xl font-bold font-mono ${valueMap[accent]}`}>{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend.up ? 'text-emerald-600' : 'text-red-600'}`}>
          <span>{trend.up ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
