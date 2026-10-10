import { useState } from 'react';
import { Truck, Plus, FileText, Package } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { dispatches, salesOrders } from '../../data/mockData';

export default function Dispatches() {
  const [showForm, setShowForm] = useState(false);
  const readyOrders = salesOrders.filter(o => o.status === 'ready_to_ship');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="stat-label mb-1">Total Dispatches</p>
          <p className="stat-value">{dispatches.length}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1">Delivered</p>
          <p className="stat-value text-emerald-600">{dispatches.filter(d => d.status === 'delivered').length}</p>
        </div>
        <div className="card p-4 border-amber-200 bg-amber-50">
          <p className="stat-label mb-1">Ready to Dispatch</p>
          <p className="stat-value text-amber-600">{readyOrders.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">orders waiting</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{dispatches.length} dispatch records</p>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={14} /> New Dispatch</button>
      </div>

      {showForm && (
        <div className="card p-5 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-slate-800 mb-4">Create Dispatch</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="section-title block mb-1.5">Order ID</label>
              <select className="input-field">{readyOrders.map(o=><option key={o.id} value={o.id}>{o.id} — {o.buyer}</option>)}</select>
            </div>
            <div><label className="section-title block mb-1.5">Dispatch Date</label><input type="date" className="input-field" defaultValue="2026-10-10" /></div>
            <div><label className="section-title block mb-1.5">Truck / Vehicle No.</label><input type="text" placeholder="KA-01-AB-XXXX" className="input-field" /></div>
            <div><label className="section-title block mb-1.5">Invoice No.</label><input type="text" placeholder="ETM-INV-XXXX" className="input-field" /></div>
            <div><label className="section-title block mb-1.5">Total Metres</label><input type="number" placeholder="0" className="input-field" /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary">Confirm Dispatch</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Dispatch ID','Order','Buyer','Rolls','Metres','Date','Invoice','Truck No.','Status'].map(h=>(
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dispatches.map(d => (
              <tr key={d.id} className="border-b border-slate-50 table-row-hover">
                <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Truck size={12} className="text-amber-500" /><span className="text-xs font-mono text-amber-600 font-semibold">{d.id}</span></div></td>
                <td className="px-4 py-3 text-xs font-mono text-sky-600">{d.orderId}</td>
                <td className="px-4 py-3 text-xs font-medium text-slate-800">{d.buyer}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Package size={11} className="text-slate-400" /><span className="text-xs font-mono text-slate-700">{d.rollIds.length}</span></div></td>
                <td className="px-4 py-3 text-xs font-mono text-emerald-600 font-semibold">{d.totalMetres.toLocaleString()} m</td>
                <td className="px-4 py-3 text-xs text-slate-500">{d.dispatchDate}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1.5"><FileText size={11} className="text-slate-400" /><span className="text-xs text-slate-500">{d.invoiceNo}</span></div></td>
                <td className="px-4 py-3 text-xs font-mono text-slate-500">{d.truckNo}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
