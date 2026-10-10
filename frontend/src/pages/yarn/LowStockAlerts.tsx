import { AlertTriangle, ShoppingCart, Phone, CheckCircle2 } from 'lucide-react';
import { yarnStock } from '../../data/mockData';

const suppliers: Record<string, string> = {
  Cotton:    'Shree Yarns Pvt. Ltd. · +91 98765 43210',
  Polyester: 'National Fibres · +91 97654 32109',
  Wool:      'Bombay Textiles · +91 96543 21098',
  Silk:      'Silk Route Traders · +91 95432 10987',
  Blended:   'Shree Yarns Pvt. Ltd. · +91 98765 43210',
};

export default function LowStockAlerts() {
  const lowItems  = yarnStock.filter(y => y.quantityKg <= y.reorderLevel);
  const critical  = lowItems.filter(y => y.quantityKg <= y.reorderLevel * 0.4);
  const warning   = lowItems.filter(y => y.quantityKg > y.reorderLevel * 0.4);

  // Empty State - Requirement: olive-grey icon, one friendly line
  if (lowItems.length === 0) {
    return (
      <div className="card p-16 flex flex-col items-center justify-center text-center gap-3">
        <CheckCircle2 size={40} className="text-[var(--olive-grey)]" />
        <p className="text-sm font-semibold text-[var(--text)]">All yarn inventory and stock counts are healthy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 border-l-4 border-l-[var(--bad)] bg-[color-mix(in_srgb,var(--bad)_8%,var(--surface))]">
          <p className="stat-label text-[var(--bad)] mb-1">Critical Stock</p>
          <p className="font-display text-4xl font-semibold text-[var(--bad)]">{critical.length}</p>
          <p className="text-xs text-[var(--text-soft)] mt-1">Below 40% of standard safety buffer</p>
        </div>
        <div className="card p-5 border-l-4 border-l-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))]">
          <p className="stat-label text-[var(--warn)] mb-1">Warning Threshold</p>
          <p className="font-display text-4xl font-semibold text-[var(--warn)]">{warning.length}</p>
          <p className="text-xs text-[var(--text-soft)] mt-1">At or near reorder trigger point</p>
        </div>
      </div>

      <div className="space-y-4">
        {critical.length > 0 && (
          <div className="space-y-3">
            <h3 className="section-title text-[var(--bad)]">Critical — Immediate Procurement Requisition</h3>
            {critical.map(yarn => (
              <AlertCard key={yarn.id} yarn={yarn} severity="critical" supplier={suppliers[yarn.type]} />
            ))}
          </div>
        )}

        {warning.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="section-title text-[var(--warn)]">Warning — Plan Next Batch PO</h3>
            {warning.map(yarn => (
              <AlertCard key={yarn.id} yarn={yarn} severity="warning" supplier={suppliers[yarn.type]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCard({ yarn, severity, supplier }: {
  yarn: typeof yarnStock[0];
  severity: 'critical' | 'warning';
  supplier: string;
}) {
  const deficit    = yarn.reorderLevel - yarn.quantityKg;
  const isCritical = severity === 'critical';

  return (
    <div className={`kanban-card p-5 ${isCritical ? 'border-l-[var(--bad)] bg-[color-mix(in_srgb,var(--bad)_5%,var(--surface))]' : 'border-l-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_5%,var(--surface))]'}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isCritical ? 'bg-[color-mix(in_srgb,var(--bad)_15%,var(--surface))] text-[var(--bad)]' : 'bg-[color-mix(in_srgb,var(--warn)_15%,var(--surface))] text-[var(--warn)]'}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h4 className="text-base font-display font-semibold text-[var(--text)]">{yarn.colour} {yarn.type}</h4>
            <p className="text-xs font-mono text-[var(--text-soft)] mt-0.5">{yarn.id} · Storage: {yarn.location}</p>
            <div className="flex items-center gap-4 mt-2.5 text-xs flex-wrap">
              <span className="text-[var(--text-soft)]">Current On Hand: <strong className={`font-mono font-bold ${isCritical ? 'text-[var(--bad)]' : 'text-[var(--warn)]'}`}>{yarn.quantityKg.toLocaleString()} kg</strong></span>
              <span className="text-[var(--text-soft)]">Safety Trigger: <strong className="font-mono text-[var(--text)]">{yarn.reorderLevel.toLocaleString()} kg</strong></span>
              <span className="text-[var(--text-soft)]">Shortfall: <strong className="font-mono text-[var(--bad)]">{Math.max(0, deficit).toLocaleString()} kg</strong></span>
            </div>
          </div>
        </div>

        <button className="btn-primary text-xs flex-shrink-0">
          <ShoppingCart size={13} /> Raise Purchase Order
        </button>
      </div>

      <div className="mt-3.5 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-xs text-[var(--text-soft)]">
        <Phone size={12} className="text-[var(--olive-grey)]" />
        <span className="font-mono">{supplier}</span>
      </div>
    </div>
  );
}
