import { Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { fabricRolls, salesOrders, machines } from '../../data/mockData';

export default function PendingInspection() {
  const pending = fabricRolls.filter(r => r.qcResult === 'pending');

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
        <Clock size={16} className="text-amber-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">{pending.length} roll{pending.length !== 1 ? 's' : ''} awaiting inspection</p>
          <p className="text-xs text-amber-600/70">These rolls have been produced but not yet checked for defects</p>
        </div>
      </div>

      <div className="space-y-3">
        {pending.map(roll => {
          const order   = salesOrders.find(o => o.id === roll.orderId);
          const machine = machines.find(m => m.id === roll.machineId);
          return (
            <div key={roll.id} className="card p-4 border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-amber-600">{roll.id}</span>
                      <span className="badge-amber">Pending</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                      <span>Order: <span className="text-sky-600 font-mono">{roll.orderId}</span></span>
                      <span>Buyer: <span className="text-slate-700">{order?.buyer ?? '—'}</span></span>
                      <span>Machine: <span className="text-purple-600 font-mono">{roll.machineId}</span></span>
                      <span>Type: <span className="text-slate-600 capitalize">{machine?.type}</span></span>
                      <span>Metres: <span className="text-emerald-600 font-mono">{roll.metres} m</span></span>
                      <span>Produced: <span className="text-slate-600">{roll.producedDate}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 transition-colors">
                    <CheckCircle size={12} /> Pass
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition-colors">
                    <RotateCcw size={12} /> Rework
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-colors">
                    <XCircle size={12} /> Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {pending.length === 0 && (
          <div className="card p-12 flex flex-col items-center justify-center gap-3">
            <CheckCircle size={32} className="text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">No pending inspections</p>
            <p className="text-xs text-slate-400">All rolls have been inspected</p>
          </div>
        )}
      </div>
    </div>
  );
}
