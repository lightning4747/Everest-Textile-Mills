import { AlertTriangle, ShoppingCart, Phone } from 'lucide-react';
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

  if (lowItems.length === 0) {
    return (
      <div className="card p-16 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <AlertTriangle size={20} className="text-emerald-600" />
        </div>
        <p className="text-sm font-medium text-emerald-700">All stock levels are healthy</p>
        <p className="text-xs text-slate-400">No reorder alerts at this time</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 border-red-200 bg-red-50">
          <p className="stat-label text-red-500 mb-1">Critical</p>
          <p className="text-2xl font-bold font-mono text-red-600">{critical.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">below 40% of reorder level</p>
        </div>
        <div className="card p-4 border-amber-200 bg-amber-50">
          <p className="stat-label text-amber-500 mb-1">Warning</p>
          <p className="text-2xl font-bold font-mono text-amber-600">{warning.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">at or below reorder level</p>
        </div>
      </div>

      <div className="space-y-3">
        {critical.length > 0 && (
          <>
            <p className="section-title text-red-500">Critical — Order Immediately</p>
            {critical.map(yarn => (
              <AlertCard key={yarn.id} yarn={yarn} severity="critical" supplier={suppliers[yarn.type]} />
            ))}
          </>
        )}
        {warning.length > 0 && (
          <>
            <p className="section-title text-amber-500 mt-2">Warning — Plan Reorder</p>
            {warning.map(yarn => (
              <AlertCard key={yarn.id} yarn={yarn} severity="warning" supplier={suppliers[yarn.type]} />
            ))}
          </>
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
  const deficit     = yarn.reorderLevel - yarn.quantityKg;
  const isCritical  = severity === 'critical';

  return (
    <div className={`card p-4 ${isCritical ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
            <AlertTriangle size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{yarn.colour} {yarn.type}</p>
            <p className="text-xs text-slate-400 mt-0.5">{yarn.id} · {yarn.location}</p>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-slate-500">Current: <span className={`font-mono font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>{yarn.quantityKg.toLocaleString()} kg</span></span>
              <span className="text-slate-500">Reorder at: <span className="font-mono text-slate-700">{yarn.reorderLevel.toLocaleString()} kg</span></span>
              <span className="text-slate-500">Deficit: <span className="font-mono text-slate-700">{Math.max(0, deficit).toLocaleString()} kg</span></span>
            </div>
          </div>
        </div>
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${isCritical ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'}`}>
          <ShoppingCart size={12} /> Raise PO
        </button>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-400">
        <Phone size={11} />
        <span>Supplier: {supplier}</span>
      </div>
    </div>
  );
}
