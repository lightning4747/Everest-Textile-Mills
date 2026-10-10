import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { salesOrders, machines } from '../../data/mockData';

export default function ProductionOrders() {
  const activeOrders = salesOrders.filter(o =>
    ['spinning', 'weaving', 'dyeing'].includes(o.status)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{activeOrders.length} orders in production</p>
        <button className="btn-primary text-xs">+ New Production Order</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Order ID', 'Buyer', 'Fabric', 'Machine', 'Target (m)', 'Completed (m)', 'Progress', 'Status', 'Delivery'].map(h => (
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeOrders.map(order => {
              const pct = Math.round((order.completedMetres / order.quantityMetres) * 100);
              const machine = machines.find(m => m.id === order.machineId);
              return (
                <tr key={order.id} className="border-b border-slate-50 table-row-hover">
                  <td className="px-4 py-3 text-xs font-mono text-amber-600 font-semibold">{order.id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{order.buyer}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{order.fabricType} · {order.colour}</td>
                  <td className="px-4 py-3">
                    {machine ? (
                      <div>
                        <p className="text-xs font-mono text-sky-600 font-semibold">{machine.id}</p>
                        <p className="text-[10px] text-slate-400">{machine.name}</p>
                      </div>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-700">{order.quantityMetres.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-700">{order.completedMetres.toLocaleString()}</td>
                  <td className="px-4 py-3 w-32">
                    <ProgressBar value={pct} color={pct > 80 ? 'green' : 'amber'} showLabel />
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{order.deliveryDate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
