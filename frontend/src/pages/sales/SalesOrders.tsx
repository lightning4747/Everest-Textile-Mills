import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { salesOrders } from '../../data/mockData';

export default function SalesOrders() {
  const [search, setSearch]     = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = salesOrders.filter(o =>
    o.buyer.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.fabricType.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = salesOrders.reduce((s, o) => s + o.quantityMetres * o.unitPrice, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Orders',   value: salesOrders.length },
          { label: 'Active',         value: salesOrders.filter(o => !['dispatched'].includes(o.status)).length },
          { label: 'Ready to Ship',  value: salesOrders.filter(o => o.status === 'ready_to_ship').length },
          { label: 'Est. Revenue',   value: `₹${(totalRevenue / 100000).toFixed(1)}L` },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1">{s.label}</p>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by buyer, order ID, fabric…" className="input-field pl-8" />
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={14} /> New Order</button>
      </div>

      {showForm && (
        <div className="card p-5 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-slate-800 mb-4">New Sales Order</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Buyer Name', type: 'text', placeholder: 'e.g. Arvind Ltd.' },
              { label: 'Fabric Type', type: 'text', placeholder: 'e.g. Cotton Twill' },
              { label: 'Colour', type: 'text', placeholder: 'e.g. Navy Blue' },
              { label: 'Quantity (m)', type: 'number', placeholder: '0' },
              { label: 'Unit Price (₹/m)', type: 'number', placeholder: '0' },
              { label: 'Delivery Date', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.label}>
                <label className="section-title block mb-1.5">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} className="input-field" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary">Create Order</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Order ID','Buyer','Fabric · Colour','Qty (m)','Unit ₹','Value','Delivery','Progress','Status'].map(h=>(
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => {
              const pct   = Math.round((order.completedMetres / order.quantityMetres) * 100);
              const value = order.quantityMetres * order.unitPrice;
              return (
                <tr key={order.id} className="border-b border-slate-50 table-row-hover">
                  <td className="px-4 py-3 text-xs font-mono text-amber-600 font-semibold">{order.id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{order.buyer}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{order.fabricType} · {order.colour}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-700">{order.quantityMetres.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">₹{order.unitPrice}</td>
                  <td className="px-4 py-3 text-xs font-mono text-emerald-600 font-semibold">₹{(value / 1000).toFixed(0)}K</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{order.deliveryDate}</td>
                  <td className="px-4 py-3 w-32"><ProgressBar value={pct} color={pct >= 100 ? 'green' : pct > 50 ? 'amber' : 'sky'} showLabel /></td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-10 text-center text-sm text-slate-400">No orders match your search.</div>}
      </div>
    </div>
  );
}
