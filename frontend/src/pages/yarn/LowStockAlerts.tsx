import { AlertTriangle, ShoppingCart, Phone, CheckCircle2, TrendingDown, Package } from 'lucide-react';
import { yarnStock } from '../../data/mockData';
import ProgressBar from '../../components/ui/ProgressBar';

const suppliers: Record<string, string> = {
  Cotton:    'Shree Yarns Pvt. Ltd. · +91 98765 43210',
  Polyester: 'National Fibres · +91 97654 32109',
  Wool:      'Bombay Textiles · +91 96543 21098',
  Silk:      'Silk Route Traders · +91 95432 10987',
  Blended:   'Shree Yarns Pvt. Ltd. · +91 98765 43210',
};

export default function LowStockAlerts() {
  const lowItems = yarnStock.filter(y => y.quantityKg <= y.reorderLevel);
  const critical = lowItems.filter(y => y.quantityKg <= y.reorderLevel * 0.4);
  const warning  = lowItems.filter(y => y.quantityKg >  y.reorderLevel * 0.4);

  if (lowItems.length === 0) {
    return (
      <div className="card p-16 flex flex-col items-center justify-center text-center gap-3">
        <CheckCircle2 size={36} className="text-[var(--ok)]" />
        <p className="font-display text-base font-semibold text-[var(--text)]">All yarn stock levels are healthy</p>
        <p className="text-xs text-[var(--text-soft)]">No items are below their safety reorder threshold.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Critical</p>
            <div className="w-8 h-8 rounded-lg bg-[var(--panel-bg)] flex items-center justify-center">
              <TrendingDown size={15} className="text-[var(--bad)]" />
            </div>
          </div>
          <p className="font-display text-4xl font-semibold text-[var(--bad)]">{critical.length}</p>
          <p className="text-xs text-[var(--text-soft)] mt-1">Below 40% of safety buffer</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Warning</p>
            <div className="w-8 h-8 rounded-lg bg-[var(--panel-bg)] flex items-center justify-center">
              <AlertTriangle size={15} className="text-[var(--warn)]" />
            </div>
          </div>
          <p className="font-display text-4xl font-semibold text-[var(--warn)]">{warning.length}</p>
          <p className="text-xs text-[var(--text-soft)] mt-1">Near reorder trigger — plan next PO</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Total Affected</p>
            <div className="w-8 h-8 rounded-lg bg-[var(--panel-bg)] flex items-center justify-center">
              <Package size={15} className="text-[var(--text-soft)]" />
            </div>
          </div>
          <p className="font-display text-4xl font-semibold text-[var(--text)]">{lowItems.length}</p>
          <p className="text-xs text-[var(--text-soft)] mt-1">of {yarnStock.length} yarn varieties</p>
        </div>
      </div>

      {/* Alerts table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--panel-bg)]">
              <th className="px-5 py-3 text-left section-title">Yarn</th>
              <th className="px-5 py-3 text-left section-title">ID · Location</th>
              <th className="px-5 py-3 text-right section-title">On Hand</th>
              <th className="px-5 py-3 text-right section-title">Safety Level</th>
              <th className="px-5 py-3 text-right section-title">Shortfall</th>
              <th className="px-5 py-3 text-left section-title w-40">Stock Level</th>
              <th className="px-5 py-3 text-left section-title">Supplier</th>
              <th className="px-5 py-3 text-right section-title"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {critical.length > 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-2 bg-[var(--panel-bg)]">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bad)]">
                    <AlertTriangle size={10} /> Critical — Immediate Action Required
                  </span>
                </td>
              </tr>
            )}
            {critical.map(yarn => (
              <AlertRow key={yarn.id} yarn={yarn} severity="critical" supplier={suppliers[yarn.type] ?? '—'} />
            ))}

            {warning.length > 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-2 bg-[var(--panel-bg)]">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--warn)]">
                    <AlertTriangle size={10} /> Warning — Plan Procurement
                  </span>
                </td>
              </tr>
            )}
            {warning.map(yarn => (
              <AlertRow key={yarn.id} yarn={yarn} severity="warning" supplier={suppliers[yarn.type] ?? '—'} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertRow({ yarn, severity, supplier }: {
  yarn: typeof yarnStock[0];
  severity: 'critical' | 'warning';
  supplier: string;
}) {
  const isCritical  = severity === 'critical';
  const deficit     = Math.max(0, yarn.reorderLevel - yarn.quantityKg);
  const stockPct    = Math.min(100, Math.round((yarn.quantityKg / yarn.reorderLevel) * 100));
  const accentColor = isCritical ? 'var(--bad)' : 'var(--warn)';

  return (
    <tr className="table-row-hover" style={{ borderLeft: `3px solid ${accentColor}` }}>
      {/* Yarn name */}
      <td className="px-5 py-4">
        <span className="text-sm font-display font-semibold text-[var(--text)]">
          {yarn.colour} {yarn.type}
        </span>
      </td>

      {/* ID + location */}
      <td className="px-5 py-4">
        <span className="text-xs font-mono text-[var(--text-soft)]">{yarn.id} · {yarn.location}</span>
      </td>

      {/* On hand */}
      <td className="px-5 py-4 text-right">
        <span className="text-sm font-mono font-bold tabular-nums" style={{ color: accentColor }}>
          {yarn.quantityKg.toLocaleString()}
        </span>
        <span className="text-xs text-[var(--text-soft)] ml-1">kg</span>
      </td>

      {/* Safety level */}
      <td className="px-5 py-4 text-right">
        <span className="text-sm font-mono font-bold tabular-nums text-[var(--text)]">
          {yarn.reorderLevel.toLocaleString()}
        </span>
        <span className="text-xs text-[var(--text-soft)] ml-1">kg</span>
      </td>

      {/* Shortfall */}
      <td className="px-5 py-4 text-right">
        <span className="text-sm font-mono font-bold tabular-nums text-[var(--bad)]">
          {deficit.toLocaleString()}
        </span>
        <span className="text-xs text-[var(--text-soft)] ml-1">kg</span>
      </td>

      {/* Progress bar */}
      <td className="px-5 py-4 w-40">
        <div className="space-y-1">
          <ProgressBar value={stockPct} color={isCritical ? 'bad' : 'warn'} />
          <p className="text-[10px] font-mono tabular-nums text-right" style={{ color: accentColor }}>
            {yarn.quantityKg.toLocaleString()} kg
          </p>
        </div>
      </td>

      {/* Supplier */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5">
          <Phone size={11} className="text-[var(--text-soft)] flex-shrink-0" />
          <span className="text-xs font-mono text-[var(--text-soft)] whitespace-nowrap">{supplier}</span>
        </div>
      </td>

      {/* CTA */}
      <td className="px-5 py-4 text-right">
        <button className="btn-primary text-xs h-9 whitespace-nowrap">
          <ShoppingCart size={12} /> Raise PO
        </button>
      </td>
    </tr>
  );
}
