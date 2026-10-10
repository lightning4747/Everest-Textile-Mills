import { Package, ArrowRight } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { fabricRolls, salesOrders, machines } from '../../data/mockData';

export default function FabricRolls() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rolls',    value: fabricRolls.length,                                                                                                                                          color: '' },
          { label: 'Total Metres',   value: `${fabricRolls.reduce((s, r) => s + r.metres, 0)} m`,                                                                                                        color: '' },
          { label: 'Pass Rate',      value: `${Math.round((fabricRolls.filter(r => r.qcResult === 'passed').length / fabricRolls.filter(r => r.qcResult !== 'pending').length) * 100)}%`,                color: 'text-emerald-600' },
          { label: 'Rejection Rate', value: `${Math.round((fabricRolls.filter(r => r.qcResult === 'rejected').length / fabricRolls.filter(r => r.qcResult !== 'pending').length) * 100)}%`,              color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1">{s.label}</p>
            <p className={`text-2xl font-bold font-mono text-slate-800 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Package size={14} className="text-amber-500" />
          <p className="text-sm font-semibold text-slate-800">Roll Traceability</p>
          <span className="text-xs text-slate-400 ml-1">— order → machine → QC</span>
        </div>

        <div className="divide-y divide-slate-50">
          {fabricRolls.map(roll => {
            const order   = salesOrders.find(o => o.id === roll.orderId);
            const machine = machines.find(m => m.id === roll.machineId);
            return (
              <div key={roll.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Package size={12} className="text-amber-500" />
                      <span className="text-xs font-mono font-bold text-amber-600">{roll.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      {[
                        { label: 'Order',   value: roll.orderId,              color: 'text-sky-600' },
                        { label: 'Buyer',   value: order?.buyer ?? '—',       color: 'text-slate-700' },
                        { label: 'Machine', value: roll.machineId,            color: 'text-purple-600' },
                        { label: 'Type',    value: machine?.type ?? '—',      color: 'text-slate-600' },
                        { label: 'Metres',  value: `${roll.metres} m`,        color: 'text-emerald-600' },
                      ].map((item, i, arr) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                            <span className="text-[10px] text-slate-400 block">{item.label}</span>
                            <span className={`font-mono text-xs ${item.color}`}>{item.value}</span>
                          </div>
                          {i < arr.length - 1 && <ArrowRight size={11} className="text-slate-300" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">{roll.producedDate}</p>
                      {roll.checkedBy && <p className="text-[10px] text-slate-400">{roll.checkedBy}</p>}
                      {roll.defects?.length && <p className="text-[10px] text-red-500 mt-0.5">{roll.defects.join(', ')}</p>}
                    </div>
                    <StatusBadge status={roll.qcResult} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
