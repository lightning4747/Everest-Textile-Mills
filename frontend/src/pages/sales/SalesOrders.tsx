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
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders',       value: salesOrders.length,                                                   accent: 'text-[var(--text)]' },
          { label: 'Active in Mill',     value: salesOrders.filter(o => !['dispatched'].includes(o.status)).length,  accent: 'text-[var(--warn)]' },
          { label: 'Ready for Dispatch', value: salesOrders.filter(o => o.status === 'ready_to_ship').length,       accent: 'text-[var(--ok)]' },
          { label: 'Estimated Bookings', value: `₹${(totalRevenue / 100000).toFixed(1)}L`,                           accent: 'text-[var(--olive-dark)]' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="stat-label mb-1">{s.label}</p>
            <p className={`font-display text-3xl md:text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by buyer, order ID, fabric…"
            className="input-field pl-9 text-xs font-mono"
          />
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> New Sales Order
        </button>
      </div>

      {showForm && (
        <div className="card p-6 border-l-4 border-l-[var(--olive-dark)] bg-[var(--surface-2)]/20">
          <h3 className="text-sm font-display font-semibold text-[var(--text)] mb-4">Book New Customer Sales Order</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Buyer Entity', type: 'text', placeholder: 'e.g. Arvind Mills Ltd.' },
              { label: 'Fabric Quality', type: 'text', placeholder: 'e.g. Cotton 60s Twill' },
              { label: 'Colourway', type: 'text', placeholder: 'e.g. Vintage Indigo' },
              { label: 'Quantity (metres)', type: 'number', placeholder: '0' },
              { label: 'Rate (₹/metre)', type: 'number', placeholder: '0' },
              { label: 'Target Delivery', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.label}>
                <label className="section-title block mb-1.5">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} className="input-field text-xs" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn-primary text-xs">Create & Commit Order</button>
            <button className="btn-secondary text-xs" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                {['Order ID','Buyer','Fabric · Colour','Qty (m)','Rate ₹','Contract Value','Delivery','Progress','Status'].map(h=>(
                  <th key={h} className="px-4 py-3 section-title whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(order => {
                const pct   = Math.round((order.completedMetres / order.quantityMetres) * 100);
                const value = order.quantityMetres * order.unitPrice;
                return (
                  <tr key={order.id} className="table-row-hover">
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)]">{order.id}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)]">{order.buyer}</td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text-soft)]">{order.fabricType} · {order.colour}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text)]">{order.quantityMetres.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)]">₹{order.unitPrice}</td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--ok)]">₹{(value / 1000).toFixed(0)}K</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)]">{order.deliveryDate}</td>
                    <td className="px-4 py-3.5 w-32">
                      <ProgressBar value={pct} color={pct >= 100 ? 'ok' : pct > 50 ? 'warn' : 'default'} showLabel />
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={order.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-xs font-mono text-[var(--text-soft)]">
            No active order found matching the query.
          </div>
        )}
      </div>
    </div>
  );
}
