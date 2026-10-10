import { Package, CheckCircle } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { salesOrders, fabricRolls } from '../../data/mockData';

export default function FinishedGoods() {
  const readyOrders     = salesOrders.filter(o => ['quality_check','ready_to_ship','dispatched'].includes(o.status));
  const totalFinished   = readyOrders.filter(o => o.status === 'ready_to_ship').reduce((s, o) => s + o.completedMetres, 0);
  const passedRolls     = fabricRolls.filter(r => r.qcResult === 'passed');
  const totalPassedMetres = passedRolls.reduce((s, r) => s + r.metres, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="stat-label mb-1">Finished Stock</p>
          <p className="stat-value">{totalFinished.toLocaleString()} <span className="text-sm text-slate-400">m</span></p>
          <p className="text-xs text-slate-400 mt-0.5">ready to ship</p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1">Passed QC Rolls</p>
          <p className="stat-value">{passedRolls.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalPassedMetres} m cleared</p>
        </div>
        <div className="card p-4 border-amber-200 bg-amber-50">
          <p className="stat-label mb-1">Awaiting Dispatch</p>
          <p className="stat-value text-amber-600">{salesOrders.filter(o => o.status === 'ready_to_ship').length}</p>
          <p className="text-xs text-slate-400 mt-0.5">orders</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Package size={14} className="text-amber-500" />
          <p className="text-sm font-semibold text-slate-800">Finished Goods Inventory</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Order ID','Buyer','Fabric','Colour','Completed (m)','QC Rolls','Status','Delivery'].map(h=>(
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {readyOrders.map(order => {
              const orderRolls = fabricRolls.filter(r => r.orderId === order.id && r.qcResult === 'passed');
              return (
                <tr key={order.id} className="border-b border-slate-50 table-row-hover">
                  <td className="px-4 py-3 text-xs font-mono text-amber-600 font-semibold">{order.id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{order.buyer}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{order.fabricType}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{order.colour}</td>
                  <td className="px-4 py-3 text-xs font-mono text-emerald-600 font-semibold">{order.completedMetres.toLocaleString()}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" /><span className="text-xs font-mono text-slate-700">{orderRolls.length} rolls</span></div></td>
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
