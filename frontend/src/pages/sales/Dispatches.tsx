import { useState } from 'react';
import { Truck, Plus, FileText, Package } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { dispatches, salesOrders } from '../../data/mockData';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';

export default function Dispatches() {
  const [showForm, setShowForm] = useState(false);
  const readyOrders = salesOrders.filter(o => o.status === 'ready_to_ship');

  const { paginatedData, ...paginationProps } = usePagination(dispatches, 20);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="stat-label mb-1">Total Dispatches</p>
          <p className="font-display text-4xl font-semibold text-[var(--text)]">{dispatches.length}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1">Delivered to Buyer</p>
          <p className="font-display text-4xl font-semibold text-[var(--ok)]">
            {dispatches.filter(d => d.status === 'delivered').length}
          </p>
        </div>
        <div className="card p-4 border-l-4 border-l-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))]">
          <p className="stat-label text-[var(--warn)] mb-1">Ready for Gate Pass</p>
          <p className="font-display text-4xl font-semibold text-[var(--warn)]">{readyOrders.length}</p>
          <p className="text-xs text-[var(--text-soft)] mt-1">orders staged</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[var(--text-soft)] text-sm font-medium">{dispatches.length} logistics challans recorded</p>
        <button className="btn-primary text-xs h-10" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> New Dispatch Manifest
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-l-4 border-l-[var(--olive-dark)] bg-[var(--surface-2)]/20">
          <h3 className="text-sm font-display font-semibold text-[var(--text)] mb-4">Generate Freight Dispatch & E-Way Gate Pass</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="section-title block mb-1.5">Select Ready Order</label>
              <select className="input-field text-xs font-mono">
                {readyOrders.map(o=><option key={o.id} value={o.id}>{o.id} — {o.buyer}</option>)}
              </select>
            </div>
            <div>
              <label className="section-title block mb-1.5">Dispatch Date</label>
              <input type="date" className="input-field text-xs font-mono" defaultValue="2026-10-10" />
            </div>
            <div>
              <label className="section-title block mb-1.5">Lorry / Vehicle Reg #</label>
              <input type="text" placeholder="KA-01-AB-1234" className="input-field text-xs font-mono" />
            </div>
            <div>
              <label className="section-title block mb-1.5">Tax Invoice #</label>
              <input type="text" placeholder="ETM-INV-2026-08" className="input-field text-xs font-mono" />
            </div>
            <div>
              <label className="section-title block mb-1.5">Total Length (m)</label>
              <input type="number" placeholder="0" className="input-field text-xs font-mono" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn-primary text-xs">Confirm Dispatch & Issue Challan</button>
            <button className="btn-secondary text-xs" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left font-mono">Challan ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left font-mono">Order Ref</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono tabular-nums">Roll Count</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono tabular-nums">Total Metres</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right font-mono">Dispatch Date</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left font-mono">Invoice #</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left font-mono">Vehicle #</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedData.map(d => (
                <tr key={d.id} className="table-row-hover">
                  <td className="px-4 py-3.5 text-left">
                    <div className="flex items-center gap-1.5">
                      <Truck size={14} className="text-[var(--olive-grey)]" />
                      <span className="text-xs font-mono font-bold text-[var(--olive-dark)]">{d.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{d.orderId}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{d.buyer}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-mono text-[var(--text)]">
                      <Package size={12} className="text-[var(--olive-grey)]" />
                      <span>{d.rollIds.length}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--ok)] text-right tabular-nums">{d.totalMetres.toLocaleString()} m</td>
                  <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{d.dispatchDate}</td>
                  <td className="px-4 py-3.5 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-soft)]">
                      <FileText size={12} />
                      <span>{d.invoiceNo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-[var(--text)] text-left">{d.truckNo}</td>
                  <td className="px-4 py-3.5 text-center"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination {...paginationProps} />
      </div>
    </div>
  );
}
