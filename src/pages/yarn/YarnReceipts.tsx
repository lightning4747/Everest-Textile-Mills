import { useState } from 'react';
import { Plus, Package, Calendar, User, FileText } from 'lucide-react';
import { yarnReceipts } from '../../data/mockData';

export default function YarnReceipts() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{yarnReceipts.length} receipts recorded</p>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Record Receipt
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-slate-800 mb-4">New Yarn Receipt</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="section-title block mb-1.5">Date</label><input type="date" className="input-field" defaultValue="2026-10-10" /></div>
            <div><label className="section-title block mb-1.5">Supplier</label><input type="text" placeholder="Supplier name" className="input-field" /></div>
            <div><label className="section-title block mb-1.5">Yarn Type</label>
              <select className="input-field">{['Cotton','Polyester','Wool','Silk','Blended'].map(t=><option key={t}>{t}</option>)}</select>
            </div>
            <div><label className="section-title block mb-1.5">Colour</label><input type="text" placeholder="e.g. Navy Blue" className="input-field" /></div>
            <div><label className="section-title block mb-1.5">Quantity (kg)</label><input type="number" placeholder="0" className="input-field" /></div>
            <div><label className="section-title block mb-1.5">For Order ID</label><input type="text" placeholder="ORD-XXXX" className="input-field" /></div>
            <div><label className="section-title block mb-1.5">Invoice No.</label><input type="text" placeholder="INV-XXXX" className="input-field" /></div>
            <div><label className="section-title block mb-1.5">Received By</label><input type="text" placeholder="Staff name" className="input-field" /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary">Save Receipt</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Receipt ID','Date','Supplier','Yarn Type','Colour','Qty (kg)','For Order','Invoice','Received By'].map(h=>(
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yarnReceipts.map(r => (
              <tr key={r.id} className="border-b border-slate-50 table-row-hover">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><Package size={12} className="text-amber-500 flex-shrink-0" /><span className="text-xs font-mono text-amber-600 font-semibold">{r.id}</span></div></td>
                <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar size={11} />{r.date}</div></td>
                <td className="px-4 py-3 text-xs font-medium text-slate-800">{r.supplier}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{r.yarnType}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.colour}</td>
                <td className="px-4 py-3 text-xs font-mono font-bold text-emerald-600">{r.quantityKg.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-mono text-sky-600">{r.forOrderId}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-slate-500"><FileText size={11} />{r.invoiceNo}</div></td>
                <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-slate-500"><User size={11} />{r.receivedBy}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
