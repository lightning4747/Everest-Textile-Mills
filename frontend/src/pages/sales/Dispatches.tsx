import { useState } from 'react';
import { Truck, Plus, FileText, Package, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import type { SalesOrder } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';

interface BackendDispatch {
  id: string;
  orderId: string;
  buyer: string;
  rollIds: string[];
  totalMetres: number;
  dispatchDate: string;
  invoiceNo: string;
  truckNo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Dispatches() {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    orderId: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    truckNo: '',
    invoiceNo: '',
  });

  const { data: rawDispatches, loading: dispatchesLoading, error: dispatchesError, refetch: refetchDispatches } = useApi<BackendDispatch[]>(
    () => api.get<BackendDispatch[]>('/dispatches'),
    [],
    { autoPollMs: 15000 }
  );

  const { data: rawOrders, refetch: refetchOrders } = useApi<SalesOrder[]>(
    () => api.get<SalesOrder[]>('/sales-orders?limit=200'),
    []
  );

  const dispatches = rawDispatches || [];
  const salesOrders = rawOrders || [];
  const readyOrders = salesOrders.filter(o => o.status === 'ready_to_ship');

  const { paginatedData, ...paginationProps } = usePagination(dispatches, 20);

  const handleRefresh = () => {
    refetchDispatches();
    refetchOrders();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId) {
      setFormError('Please select a ready sales order');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.post('/dispatches', {
        orderId: formData.orderId,
        dispatchDate: formData.dispatchDate,
        truckNo: formData.truckNo,
        invoiceNo: formData.invoiceNo,
      });
      setShowForm(false);
      setFormData({
        orderId: '',
        dispatchDate: new Date().toISOString().split('T')[0],
        truckNo: '',
        invoiceNo: '',
      });
      handleRefresh();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to issue dispatch manifest');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors"
            title="Refresh"
            aria-label="Refresh dispatches"
          >
            <RefreshCw size={14} className={dispatchesLoading ? 'animate-spin' : ''} />
          </button>
          <button className="btn-primary text-xs h-10" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> New Dispatch Manifest
          </button>
        </div>
      </div>

      {dispatchesError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-xs">
          {dispatchesError}
        </div>
      )}

      {showForm && (
        <div className="card p-5 border-l-4 border-l-[var(--olive-dark)] bg-[var(--surface-2)]/20">
          <h3 className="text-sm font-display font-semibold text-[var(--text)] mb-4">Generate Freight Dispatch &amp; E-Way Gate Pass</h3>
          {formError && (
            <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="section-title block mb-1.5">Select Ready Order *</label>
                <select
                  required
                  value={formData.orderId}
                  onChange={e => setFormData(f => ({ ...f, orderId: e.target.value }))}
                  className="input-field text-xs font-mono w-full"
                >
                  <option value="">-- Choose Order --</option>
                  {readyOrders.length === 0 ? (
                    <option disabled value="">No orders in ready_to_ship status</option>
                  ) : (
                    readyOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.id} — {o.buyer} ({o.completedMetres}m)
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="section-title block mb-1.5">Dispatch Date *</label>
                <input
                  type="date"
                  required
                  value={formData.dispatchDate}
                  onChange={e => setFormData(f => ({ ...f, dispatchDate: e.target.value }))}
                  className="input-field text-xs font-mono w-full"
                />
              </div>
              <div>
                <label className="section-title block mb-1.5">Lorry / Vehicle Reg # *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KA-01-AB-1234"
                  value={formData.truckNo}
                  onChange={e => setFormData(f => ({ ...f, truckNo: e.target.value }))}
                  className="input-field text-xs font-mono w-full"
                />
              </div>
              <div>
                <label className="section-title block mb-1.5">Tax Invoice # *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ETM-INV-2026-08"
                  value={formData.invoiceNo}
                  onChange={e => setFormData(f => ({ ...f, invoiceNo: e.target.value }))}
                  className="input-field text-xs font-mono w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                {isSubmitting ? 'Generating…' : 'Confirm Dispatch & Issue Challan'}
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {dispatchesLoading && dispatches.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-soft)] font-mono animate-pulse">
            Loading dispatch manifests…
          </div>
        ) : (
          <>
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
                          <span>{d.rollIds ? d.rollIds.length : 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--ok)] text-right tabular-nums">
                        {(Number(d.totalMetres) || 0).toLocaleString()} m
                      </td>
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
          </>
        )}
      </div>
    </div>
  );
}

