import { useState } from 'react';
import { Search, CheckCircle, Circle, Clock } from 'lucide-react';
import { salesOrders, machines } from '../../data/mockData';
import type { OrderStatus as OS } from '../../types';

const stages: { key: OS; label: string }[] = [
  { key: 'pending',        label: 'Order Received' },
  { key: 'yarn_check',    label: 'Yarn Check' },
  { key: 'spinning',      label: 'Spinning' },
  { key: 'weaving',       label: 'Weaving' },
  { key: 'dyeing',        label: 'Dyeing' },
  { key: 'quality_check', label: 'Quality Check' },
  { key: 'ready_to_ship', label: 'Ready to Ship' },
  { key: 'dispatched',    label: 'Dispatched' },
];

function getStageIndex(status: OS) {
  return stages.findIndex(s => s.key === status);
}

export default function OrderStatus() {
  const [query, setQuery] = useState('');

  const results = query.trim()
    ? salesOrders.filter(o =>
        o.id.toLowerCase().includes(query.toLowerCase()) ||
        o.buyer.toLowerCase().includes(query.toLowerCase())
      )
    : salesOrders;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-800 mb-1">Track Order Status</p>
        <p className="text-xs text-slate-400 mb-4">Search by order ID or buyer name — instant status without walking the floor</p>
        <div className="relative max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter order ID or buyer name…" className="input-field pl-9 text-sm" autoFocus />
        </div>
      </div>

      <div className="space-y-4">
        {results.map(order => {
          const currentIdx = getStageIndex(order.status);
          const machine    = machines.find(m => m.id === order.machineId);
          const pct        = Math.round((order.completedMetres / order.quantityMetres) * 100);

          return (
            <div key={order.id} className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-mono font-bold text-amber-600">{order.id}</p>
                    <p className="text-xs text-slate-400">{order.buyer}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div><p className="text-xs text-slate-400">Fabric</p><p className="text-xs text-slate-700">{order.fabricType} · {order.colour}</p></div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div><p className="text-xs text-slate-400">Quantity</p><p className="text-xs font-mono text-slate-700">{order.quantityMetres.toLocaleString()} m</p></div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div><p className="text-xs text-slate-400">Delivery</p><p className="text-xs text-slate-700">{order.deliveryDate}</p></div>
                  {machine && (
                    <>
                      <div className="h-8 w-px bg-slate-200" />
                      <div><p className="text-xs text-slate-400">Machine</p><p className="text-xs font-mono text-sky-600">{machine.id} — {machine.name}</p></div>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Completed</p>
                  <p className="text-sm font-mono font-bold text-emerald-600">{pct}%</p>
                </div>
              </div>

              <div className="px-5 py-5">
                <div className="flex items-center gap-0">
                  {stages.map((stage, idx) => {
                    const isDone    = idx < currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={stage.key} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                            isDone    ? 'bg-emerald-100 border-emerald-400 text-emerald-600' :
                            isCurrent ? 'bg-amber-100 border-amber-400 text-amber-600 shadow-md shadow-amber-100' :
                                        'bg-white border-slate-200 text-slate-300'
                          }`}>
                            {isDone    ? <CheckCircle size={13} /> :
                             isCurrent ? <Clock size={13} /> :
                                         <Circle size={13} />}
                          </div>
                          <p className={`text-[9px] text-center leading-tight max-w-[56px] ${
                            isDone    ? 'text-emerald-600' :
                            isCurrent ? 'text-amber-600 font-semibold' :
                                        'text-slate-400'
                          }`}>{stage.label}</p>
                        </div>
                        {idx < stages.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 rounded ${idx < currentIdx ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
