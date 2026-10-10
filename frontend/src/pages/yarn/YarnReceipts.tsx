import { useState } from 'react';
import { Plus, Package, Calendar, User, FileText } from 'lucide-react';
import { yarnReceipts } from '../../data/mockData';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';

export default function YarnReceipts() {
  const [showForm, setShowForm] = useState(false);

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(yarnReceipts, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-soft)] text-sm font-medium">{yarnReceipts.length} material intake receipts logged</p>
        <button className="btn-primary text-xs h-10" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Record Yarn Inward Receipt
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-l-4 border-l-[var(--olive-dark)] bg-[var(--surface-2)]/20">
          <h3 className="text-sm font-display font-semibold text-[var(--text)] mb-4">Record New Inward Yarn Consignment</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="section-title block mb-1.5">Receipt Date</label>
              <input type="date" className="input-field text-xs font-mono" defaultValue="2026-10-10" />
            </div>
            <div>
              <label className="section-title block mb-1.5">Supplier / Mill</label>
              <input type="text" placeholder="e.g. Shree Yarns Ltd." className="input-field text-xs" />
            </div>
            <div>
              <label className="section-title block mb-1.5">Yarn Variety</label>
              <select className="input-field text-xs">
                {['Cotton','Polyester','Wool','Silk','Blended'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="section-title block mb-1.5">Colour / Shade</label>
              <input type="text" placeholder="e.g. Navy Indigo" className="input-field text-xs" />
            </div>
            <div>
              <label className="section-title block mb-1.5">Inward Net (kg)</label>
              <input type="number" placeholder="0" className="input-field text-xs font-mono" />
            </div>
            <div>
              <label className="section-title block mb-1.5">Linked Order Ref</label>
              <input type="text" placeholder="ORD-XXXX" className="input-field text-xs font-mono" />
            </div>
            <div>
              <label className="section-title block mb-1.5">Supplier Invoice #</label>
              <input type="text" placeholder="INV-XXXX" className="input-field text-xs font-mono" />
            </div>
            <div>
              <label className="section-title block mb-1.5">Receiving Officer</label>
              <input type="text" placeholder="Staff name" className="input-field text-xs" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn-primary text-xs">Save Consignment Entry</button>
            <button className="btn-secondary text-xs" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Receipt ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Date</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Supplier</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Yarn Type</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Colour</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Net Qty (kg)</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Linked Order</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Invoice Ref</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Receiving Clerk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedData.map(r => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-4 py-3.5 text-left">
                    <div className="flex items-center gap-2">
                      <Package size={13} className="text-[var(--olive-grey)] flex-shrink-0" />
                      <span className="text-xs font-mono font-bold text-[var(--olive-dark)]">{r.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-soft)]">
                      <Calendar size={12} />
                      <span>{r.date}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{r.supplier}</td>
                  <td className="px-4 py-3.5 text-xs text-[var(--text)] text-left">{r.yarnType}</td>
                  <td className="px-4 py-3.5 text-xs text-[var(--text-soft)] text-left">{r.colour}</td>
                  <td className="px-4 py-3.5 text-xs font-mono font-bold tabular-nums text-[var(--ok)] text-right">{r.quantityKg.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-xs font-mono font-semibold text-[var(--olive-dark)] text-left">{r.forOrderId}</td>
                  <td className="px-4 py-3.5 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-soft)]">
                      <FileText size={12} />
                      <span>{r.invoiceNo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-left">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
                      <User size={12} className="text-[var(--olive-grey)]" />
                      <span>{r.receivedBy}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        </div>
      </div>
    </div>
  );
}
