import { useState } from 'react';
import { Plus, Package, Calendar, User, FileText, AlertCircle, Search } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';
import type { YarnReceipt, YarnStock, YarnType } from '../../types';
import DetailModal from '../../components/ui/DetailModal';

export default function YarnReceipts() {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<YarnReceipt | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [yarnType, setYarnType] = useState<YarnType>('Cotton');
  const [colour, setColour] = useState('');
  const [quantityKg, setQuantityKg] = useState<number | ''>('');
  const [forOrderId, setForOrderId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  const { data, loading, error, refetch } = useApi<YarnReceipt[]>(
    () => api.get<YarnReceipt[]>('/yarn/receipts'),
    []
  );

  const { data: stockData } = useApi<YarnStock[]>(
    () => api.get<YarnStock[]>('/yarn/stock'),
    []
  );

  const stockLedgers = stockData || [];
  const receipts = data || [];

  const handleStockSelect = (stockId: string) => {
    setSelectedStockId(stockId);
    if (!stockId) return;
    const found = stockLedgers.find(s => s.id === stockId);
    if (found) {
      setYarnType(found.type as YarnType);
      setColour(found.colour);
    }
  };

  const filtered = receipts.filter(r => {
    const q = debouncedSearch.toLowerCase();
    const matchesSearch =
      !debouncedSearch.trim() ||
      r.id.toLowerCase().includes(q) ||
      r.supplier.toLowerCase().includes(q) ||
      r.yarnType.toLowerCase().includes(q) ||
      r.colour.toLowerCase().includes(q) ||
      (r.forOrderId && r.forOrderId.toLowerCase().includes(q)) ||
      (r.invoiceNo && r.invoiceNo.toLowerCase().includes(q));

    const matchesType = typeFilter === 'all' || r.yarnType === typeFilter;
    return matchesSearch && matchesType;
  });

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filtered, 20);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplier.trim()) {
      setFormError('Supplier name is required.');
      return;
    }
    if (!colour.trim()) {
      setFormError('Yarn colour is required.');
      return;
    }
    if (!quantityKg || Number(quantityKg) <= 0) {
      setFormError('Please enter a positive quantity in kg.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post<YarnReceipt>('/yarn/receipts', {
        date,
        supplier: supplier.trim(),
        supplierName: supplier.trim(),
        yarnType,
        colour: colour.trim(),
        quantityKg: Number(quantityKg),
        yarnStockId: selectedStockId || undefined,
        forOrderId: forOrderId.trim() ? forOrderId.trim() : null,
        invoiceNo: invoiceNo.trim() ? invoiceNo.trim() : `INV-${Date.now().toString().slice(-6)}`,
        receivedBy: receivedBy.trim() ? receivedBy.trim() : 'Store Clerk',
      });

      // Reset form and refetch
      setSelectedStockId('');
      setSupplier('');
      setColour('');
      setQuantityKg('');
      setForOrderId('');
      setInvoiceNo('');
      setReceivedBy('');
      setShowForm(false);
      await refetch();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to record yarn receipt consignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search receipts by ID, supplier, yarn type, invoice..."
              className="input-field h-10 pl-9 text-xs font-mono w-full"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="input-field h-10 text-xs font-mono w-40"
          >
            <option value="all">All Yarn Types</option>
            <option value="Cotton">Cotton</option>
            <option value="Polyester">Polyester</option>
            <option value="Wool">Wool</option>
            <option value="Silk">Silk</option>
            <option value="Blended">Blended</option>
          </select>
        </div>

        <button className="btn-primary text-xs h-10" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Record Yarn Inward Receipt
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 border-l-4 border-l-[var(--olive-dark)] bg-[var(--surface-2)]/20 space-y-4">
          <h3 className="text-sm font-display font-semibold text-[var(--text)]">Record New Inward Yarn Consignment</h3>

          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="section-title block mb-1.5">Link Warehouse Stock Ledger</label>
              <select
                value={selectedStockId}
                onChange={e => handleStockSelect(e.target.value)}
                className="input-field text-xs font-mono"
              >
                <option value="">-- Select Stock Ledger --</option>
                {stockLedgers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.type} {s.colour} ({s.quantityKg} kg on hand)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-title block mb-1.5">Receipt Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="input-field text-xs font-mono"
              />
            </div>
            <div>
              <label className="section-title block mb-1.5">Supplier / Mill</label>
              <input
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                required
                placeholder="e.g. Shree Yarns Pvt. Ltd."
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="section-title block mb-1.5">Yarn Variety</label>
              <select
                value={yarnType}
                onChange={e => setYarnType(e.target.value as YarnType)}
                className="input-field text-xs"
              >
                {(['Cotton','Polyester','Wool','Silk','Blended'] as YarnType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-title block mb-1.5">Colour / Shade</label>
              <input
                type="text"
                value={colour}
                onChange={e => setColour(e.target.value)}
                required
                placeholder="e.g. White"
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="section-title block mb-1.5">Inward Net (kg)</label>
              <input
                type="number"
                value={quantityKg}
                onChange={e => setQuantityKg(e.target.value === '' ? '' : Number(e.target.value))}
                required
                min="0.1"
                step="any"
                placeholder="0"
                className="input-field text-xs font-mono"
              />
            </div>
            <div>
              <label className="section-title block mb-1.5">Linked Order Ref</label>
              <input
                type="text"
                value={forOrderId}
                onChange={e => setForOrderId(e.target.value)}
                placeholder="ORD-XXXX (optional)"
                className="input-field text-xs font-mono"
              />
            </div>
            <div>
              <label className="section-title block mb-1.5">Supplier Invoice #</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                placeholder="INV-XXXX"
                className="input-field text-xs font-mono"
              />
            </div>
            <div>
              <label className="section-title block mb-1.5">Receiving Officer</label>
              <input
                type="text"
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                placeholder="Staff name"
                className="input-field text-xs"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary text-xs">
              {submitting ? 'Saving Consignment...' : 'Save Consignment Entry'}
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
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
              {loading && receipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-[var(--text-soft)] font-mono">
                    Loading receipts archive...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-[var(--text-soft)]">
                    No yarn receipts match your search filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map(r => (
                  <tr key={r.id} className="table-row-hover cursor-pointer" onClick={() => setSelectedReceipt(r)}>
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
                    <td className="px-4 py-3.5 text-xs font-mono font-semibold text-[var(--olive-dark)] text-left">{r.forOrderId || '—'}</td>
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
                ))
              )}
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

      {/* Receipt Detail Modal */}
      <DetailModal
        open={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title={selectedReceipt?.id ?? ''}
        subtitle="Yarn Inward Receipt"
        sections={selectedReceipt ? [
          {
            title: 'Receipt Details',
            fields: [
              { label: 'Receipt ID',        value: selectedReceipt.id,           mono: true, accent: 'text-[var(--olive-dark)]' },
              { label: 'Date',              value: selectedReceipt.date,          mono: true },
              { label: 'Supplier / Mill',   value: selectedReceipt.supplier,      accent: 'font-semibold text-[var(--text)]' },
              { label: 'Invoice Ref',       value: selectedReceipt.invoiceNo,     mono: true },
            ],
          },
          {
            title: 'Yarn Specification',
            fields: [
              { label: 'Yarn Type',         value: selectedReceipt.yarnType },
              { label: 'Colour / Shade',    value: selectedReceipt.colour },
              { label: 'Net Qty Inward',    value: `${selectedReceipt.quantityKg.toLocaleString()} kg`, mono: true, accent: 'text-[var(--ok)] font-bold' },
              { label: 'Linked Order',      value: selectedReceipt.forOrderId || '—', mono: true, accent: 'text-[var(--olive-dark)]' },
            ],
          },
          {
            title: 'Processing Info',
            fields: [
              { label: 'Received By',       value: selectedReceipt.receivedBy },
            ],
          },
        ] : []}
      />
    </div>
  );
}

