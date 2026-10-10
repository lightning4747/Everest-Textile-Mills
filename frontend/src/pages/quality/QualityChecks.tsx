import { useState } from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { fabricRolls, salesOrders, machines } from '../../data/mockData';
import type { QCResult } from '../../types';

const filters: { label: string; value: QCResult | 'all' }[] = [
  { label: 'All',      value: 'all' },
  { label: 'Passed',   value: 'passed' },
  { label: 'Rework',   value: 'rework' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Pending',  value: 'pending' },
];

export default function QualityChecks() {
  const [filter, setFilter] = useState<QCResult | 'all'>('all');
  const filtered = filter === 'all' ? fabricRolls : fabricRolls.filter(r => r.qcResult === filter);

  const counts = {
    all:      fabricRolls.length,
    passed:   fabricRolls.filter(r => r.qcResult === 'passed').length,
    rework:   fabricRolls.filter(r => r.qcResult === 'rework').length,
    rejected: fabricRolls.filter(r => r.qcResult === 'rejected').length,
    pending:  fabricRolls.filter(r => r.qcResult === 'pending').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {filters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filter === f.value
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300 bg-white'
              }`}>
              {f.label} <span className="ml-1 opacity-60">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <button className="btn-primary text-xs"><Plus size={13} /> Log Check</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Roll ID','Order','Buyer','Machine','Metres','Produced','Defects','Checked By','Checked At','Result'].map(h=>(
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(roll => {
              const order   = salesOrders.find(o => o.id === roll.orderId);
              const machine = machines.find(m => m.id === roll.machineId);
              return (
                <tr key={roll.id} className="border-b border-slate-50 table-row-hover">
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-slate-400" /><span className="text-xs font-mono text-amber-600 font-semibold">{roll.id}</span></div></td>
                  <td className="px-4 py-3 text-xs font-mono text-sky-600">{roll.orderId}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{order?.buyer ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono text-slate-700">{machine?.id ?? roll.machineId}</p>
                    <p className="text-[10px] text-slate-400">{machine?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-700">{roll.metres} m</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{roll.producedDate}</td>
                  <td className="px-4 py-3">
                    {roll.defects?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {roll.defects.map(d => <span key={d} className="badge-red text-[10px]">{d}</span>)}
                      </div>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{roll.checkedBy ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{roll.checkedAt ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={roll.qcResult} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
