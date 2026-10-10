import { useEffect, useRef } from 'react';
import { animateKpiCount } from '../../utils/motion';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'ok' | 'warn' | 'bad' | 'idle' | 'default' | 'amber' | 'green' | 'red' | 'sky';
  icon?: React.ReactNode;
  trend?: { value: string; up: boolean };
}

export default function StatCard({ label, value, sub, accent = 'default', icon, trend }: StatCardProps) {
  const valueRef = useRef<HTMLParagraphElement>(null);

  // Normalize accent tokens
  const normAccent = (() => {
    if (accent === 'green' || accent === 'ok') return 'ok';
    if (accent === 'red' || accent === 'bad') return 'bad';
    if (accent === 'amber' || accent === 'warn') return 'warn';
    if (accent === 'sky' || accent === 'idle') return 'idle';
    return 'default';
  })();

  const accentColorClass = {
    ok: 'text-[var(--ok)]',
    warn: 'text-[var(--warn)]',
    bad: 'text-[var(--bad)]',
    idle: 'text-[var(--olive-dark)]',
    default: 'text-[var(--text)]',
  }[normAccent];

  const iconBgClass = {
    ok: 'bg-[color-mix(in_srgb,var(--ok)_15%,var(--surface))] text-[var(--ok)] border border-[color-mix(in_srgb,var(--ok)_30%,transparent)]',
    warn: 'bg-[color-mix(in_srgb,var(--warn)_15%,var(--surface))] text-[var(--warn)] border border-[color-mix(in_srgb,var(--warn)_30%,transparent)]',
    bad: 'bg-[color-mix(in_srgb,var(--bad)_15%,var(--surface))] text-[var(--bad)] border border-[color-mix(in_srgb,var(--bad)_30%,transparent)]',
    idle: 'bg-[color-mix(in_srgb,var(--idle)_15%,var(--surface))] text-[var(--olive-dark)] border border-[var(--border)]',
    default: 'bg-[var(--sand)] text-[var(--olive-dark)] border border-[var(--border)]',
  }[normAccent];

  useEffect(() => {
    // If numeric value, do a smooth anime.js count up
    if (typeof value === 'number' && valueRef.current) {
      animateKpiCount(valueRef.current, 0, value);
    }
  }, [value]);

  return (
    <div className="card p-5 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between">
        <p className="stat-label">{label}</p>
        {icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
            {icon}
          </div>
        )}
      </div>

      <div>
        <p
          ref={valueRef}
          className={`font-display text-[38px] md:text-[42px] leading-tight font-semibold tracking-tight ${accentColorClass}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-[var(--text-soft)] mt-1">{sub}</p>}
      </div>

      {trend && (
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${trend.up ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}`}>
          <span className="font-mono">{trend.up ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
