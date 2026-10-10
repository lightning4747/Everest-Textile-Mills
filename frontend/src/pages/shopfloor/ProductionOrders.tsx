import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { salesOrders, machines } from '../../data/mockData';
import { Plus } from 'lucide-react';

export default function ProductionOrders() {
  const activeOrders = salesOrders.filter(o =>
    ['spinning', 'weaving', 'dyeing'].includes(o.status)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-soft)] text-sm font-medium">{activeOrders.length} active orders on production line</p>
        <button className="btn-primary text-xs">
          <Plus size={14} /> New Production Order
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                {['Order ID', 'Buyer', 'Fabric & Colour', 'Machine Unit', 'Target (m)', 'Completed (m)', 'Progress', 'Status', 'Delivery Date'].map(h => (
                  <th key={h} className="px-4 py-3 section-title whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {activeOrders.map(order => {
                const pct = Math.round((order.completedMetres / order.quantityMetres) * 100);
                const machine = machines.find(m => m.id === order.machineId);
                return (
                  <tr key={order.id} className="table-row-hover">
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)]">{order.id}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)]">{order.buyer}</td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text-soft)]">{order.fabricType} · {order.colour}</td>
                    <td className="px-4 py-3.5">
                      {machine ? (
                        <div>
                          <p className="text-xs font-mono font-bold text-[var(--olive-dark)]">{machine.id}</p>
                          <p className="text-[10px] text-[var(--text-soft)]">{machine.name}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--olive-grey)] font-mono">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text)]">{order.quantityMetres.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--text)]">{order.completedMetres.toLocaleString()}</td>
                    <td className="px-4 py-3.5 w-36">
                      <ProgressBar value={pct} color={pct >= 100 ? 'ok' : pct > 50 ? 'warn' : 'default'} showLabel />
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)]">{order.deliveryDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
