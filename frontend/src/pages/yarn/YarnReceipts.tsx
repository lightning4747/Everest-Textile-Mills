import { useState, useMemo } from 'react';
import { Plus, Package, Calendar, User, FileText, AlertCircle, Search, ShoppingCart, CheckCircle2, Truck, Sparkles } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';
import type { YarnReceipt, YarnStock, YarnType, PurchaseOrder, PurchaseOrderItem } from '../../types';
import DetailModal from '../../components/ui/DetailModal';

const MILL_SHADES = [
  'White',
  'Natural White',
  'Bleached White',
  'Navy Blue',
  'Indigo',
  'Jet Black',
  'Crimson Red',
  'Heather Grey',
  'Olive Green',
  'Khaki',
  'Royal Blue',
  'Ivory',
  'Charcoal',
];

export default function YarnReceipts() {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<YarnReceipt | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  // Form intake mode: 'po' (Recommended) vs 'manual' (Direct Inward)
  const [intakeMode, setIntakeMode] = useState<'po' | 'manual'>('po');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPoItem, setSelectedPoItem] = useState<PurchaseOrderItem | null>(null);

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [yarnType, setYarnType] = useState<YarnType>('Cotton');
  const [colour, setColour] = useState('White');
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

  const { data: poData, refetch: refetchPOs } = useApi<PurchaseOrder[]>(
    () => api.get<PurchaseOrder[]>('/purchase-orders'),
    []
  );

  const stockLedgers = stockData || [];
  const receipts = data || [];
  const allPOs = poData || [];

  const pendingPOs = useMemo(() => {
    return allPOs.filter(p => p.status === 'issued' || p.status === 'partially_received');
  }, [allPOs]);

  const handlePoSelect = (poId: string) => {
    setSelectedPoId(poId);
    if (!poId) {
      setSelectedPoItem(null);
      return;
    }

    const foundPo = pendingPOs.find(p => p.id === poId);
    if (!foundPo) return;

    setSupplier(foundPo.supplierName);

    // Pick first item with pending balance
    const pendingItem = (foundPo.items || []).find(
      it => Number(it.orderedKg) > Number(it.receivedKg)
    ) || foundPo.items?.[0];

    if (pendingItem) {
      setSelectedPoItem(pendingItem);
      setYarnType(pendingItem.yarnType as YarnType);
      setColour(pendingItem.colour);
      setSelectedStockId(pendingItem.yarnStockId || '');
      const remainingKg = Math.max(0, Number(pendingItem.orderedKg) - Number(pendingItem.receivedKg));
      setQuantityKg(remainingKg > 0 ? remainingKg : Number(pendingItem.orderedKg));
    }
  };

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
      (r.purchaseOrderId && r.purchaseOrderId.toLowerCase().includes(q)) ||
      (r.forOrderId && r.forOrderId.toLowerCase().includes(q)) ||
      (r.invoiceNo && r.invoiceNo.toLowerCase().includes(q));

    const matchesType = typeFilter === 'all' || r.yarnType === typeFilter;
    return matchesSearch && matchesType;
  });

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filtered, 20);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (intakeMode === 'po' && !selectedPoId) {
      setFormError('Please select a purchase order to receive against.');
      return;
    }
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
      if (intakeMode === 'po' && selectedPoId && selectedPoItem) {
        // Receive directly against the Purchase Order
        await api.post(`/purchase-orders/${selectedPoId}/receive`, {
          receivedItems: [
            {
              itemId: selectedPoItem.id,
              yarnStockId: selectedPoItem.yarnStockId,
              quantityKg: Number(quantityKg),
            }
          ],
          invoiceNo: invoiceNo.trim() ? invoiceNo.trim() : `INV-${Date.now().toString().slice(-6)}`,
          receivedBy: receivedBy.trim() ? receivedBy.trim() : 'Store Operator',
        });
      } else {
        // Direct / Spot Market Receipt
        await api.post<YarnReceipt>('/yarn/receipts', {
          date,
          supplier: supplier.trim(),
          supplierName: supplier.trim(),
          yarnType,
          colour: colour.trim(),
          quantityKg: Number(quantityKg),
          yarnStockId: selectedStockId || undefined,
          purchaseOrderId: selectedPoId || null,
          forOrderId: forOrderId.trim() ? forOrderId.trim() : null,
          invoiceNo: invoiceNo.trim() ? invoiceNo.trim() : `INV-${Date.now().toString().slice(-6)}`,
          receivedBy: receivedBy.trim() ? receivedBy.trim() : 'Store Clerk',
        });
      }

      // Reset form and refetch
      setSelectedPoId('');
      setSelectedPoItem(null);
      setSelectedStockId('');
      setSupplier('');
      setColour('White');
      setQuantityKg('');
      setForOrderId('');
      setInvoiceNo('');
      setReceivedBy('');
      setShowForm(false);
      await refetch();
      await refetchPOs();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to record yarn receipt consignment');
    } finally {
      setSubmitting(false);
    }
  };

  const openFormWithPo = (poId: string) => {
    setIntakeMode('po');
    setShowForm(true);
    handlePoSelect(poId);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner if open POs are arriving */}
      {pendingPOs.length > 0 && !showForm && (
        <div className="card p-4 border-l-4 border-l-[var(--olive-dark)] bg-[var(--surface-2)]/30 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--olive-dark)]/10 text-[var(--olive-dark)] flex items-center justify-center flex-shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text)]">
                {pendingPOs.length} Purchase Order{pendingPOs.length > 1 ? 's' : ''} Awaiting Delivery Intake
              </p>
              <p className="text-[11px] text-[var(--text-soft)]">
                Truck arrivals can be received directly with pre-filled specs and automated stock allocation.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setIntakeMode('po'); }}
            className="btn-secondary text-xs h-8 flex items-center gap-1.5"
          >
            <ShoppingCart size={13} /> Receive Incoming Delivery
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search receipts by ID, supplier, PO ref, invoice..."
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
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="text-sm font-display font-semibold text-[var(--text)]">Record Inward Yarn Consignment</h3>
              <p className="text-[11px] text-[var(--text-soft)]">Log vehicle weighbridge tare and gross intake into raw material stock.</p>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
              <button
                type="button"
                onClick={() => { setIntakeMode('po'); setSelectedPoId(''); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  intakeMode === 'po'
                    ? 'bg-[var(--olive-dark)] text-white shadow-sm'
                    : 'text-[var(--text-soft)] hover:text-[var(--text)]'
                }`}
              >
                <ShoppingCart size={12} /> Receive Against PO
              </button>
              <button
                type="button"
                onClick={() => { setIntakeMode('manual'); setSelectedPoId(''); setSelectedPoItem(null); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  intakeMode === 'manual'
                    ? 'bg-[var(--olive-dark)] text-white shadow-sm'
                    : 'text-[var(--text-soft)] hover:text-[var(--text)]'
                }`}
              >
                Direct / Spot Intake
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* PO Mode Selector */}
          {intakeMode === 'po' && (
            <div className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)] space-y-3">
              <div>
                <label className="section-title block mb-1.5">Select Incoming Purchase Order *</label>
                <select
                  required
                  value={selectedPoId}
                  onChange={e => handlePoSelect(e.target.value)}
                  className="input-field text-xs font-mono w-full"
                >
                  <option value="">-- Select Pending Purchase Order --</option>
                  {pendingPOs.map(po => {
                    const itemSummary = po.items.map(it => `${it.yarnType} ${it.colour} (${(Number(it.orderedKg) - Number(it.receivedKg)).toLocaleString()} kg)`).join(', ');
                    return (
                      <option key={po.id} value={po.id}>
                        {po.id} · {po.supplierName} — {itemSummary}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedPoId && selectedPoItem && (
                <div className="flex items-center gap-2 text-xs text-[var(--ok)] font-medium bg-[var(--ok)]/10 px-3 py-2 rounded border border-[var(--ok)]/20">
                  <Sparkles size={14} className="flex-shrink-0" />
                  <span>
                    Auto-filled from <strong>{selectedPoId}</strong>. Stock will be credited to raw inventory and automatically allocated to waiting customer orders.
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {intakeMode === 'manual' && (
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
            )}

            <div>
              <label className="section-title block mb-1.5">Receipt Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="input-field text-xs font-mono"
              />
            </div>

            <div>
              <label className="section-title block mb-1.5">Supplier / Mill *</label>
              <input
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                required
                readOnly={intakeMode === 'po' && !!selectedPoId}
                placeholder="e.g. Shree Yarns Pvt. Ltd."
                className={`input-field text-xs ${intakeMode === 'po' && selectedPoId ? 'bg-[var(--surface-2)]/50 opacity-90' : ''}`}
              />
            </div>

            <div>
              <label className="section-title block mb-1.5">Yarn Variety *</label>
              <select
                value={yarnType}
                onChange={e => setYarnType(e.target.value as YarnType)}
                disabled={intakeMode === 'po' && !!selectedPoId}
                className="input-field text-xs"
              >
                {(['Cotton','Polyester','Wool','Silk','Blended'] as YarnType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="section-title block mb-1.5">Colour / Shade *</label>
              <select
                value={colour}
                onChange={e => setColour(e.target.value)}
                disabled={intakeMode === 'po' && !!selectedPoId}
                className="input-field text-xs font-mono"
              >
                {MILL_SHADES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="section-title block mb-1.5">Delivered Net (kg) *</label>
              <input
                type="number"
                value={quantityKg}
                onChange={e => setQuantityKg(e.target.value === '' ? '' : Number(e.target.value))}
                required
                min="0.1"
                step="any"
                placeholder="0"
                className="input-field text-xs font-mono font-bold"
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
              <label className="section-title block mb-1.5">Supplier Invoice # *</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                required
                placeholder="e.g. SY-INV-4421"
                className="input-field text-xs font-mono"
              />
            </div>

            <div>
              <label className="section-title block mb-1.5">Receiving Officer *</label>
              <input
                type="text"
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                required
                placeholder="e.g. Ganesh P."
                className="input-field text-xs"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary text-xs">
              {submitting ? 'Saving Consignment...' : intakeMode === 'po' ? 'Receive & Allocate Consignment' : 'Save Consignment Entry'}
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Receipts Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Receipt ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Date</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Supplier</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">PO / Source</th>
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
                  <td colSpan={10} className="px-4 py-8 text-center text-xs text-[var(--text-soft)] font-mono">
                    Loading receipts archive...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-xs text-[var(--text-soft)]">
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
                    <td className="px-4 py-3.5 text-left">
                      {r.purchaseOrderId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--olive-dark)]/10 text-[var(--olive-dark)] border border-[var(--olive-dark)]/20">
                          <ShoppingCart size={10} /> {r.purchaseOrderId}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[var(--text-soft)]">Direct / Spot</span>
                      )}
                    </td>
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
              { label: 'Purchase Order Ref',value: selectedReceipt.purchaseOrderId || 'Direct Inward (No PO)', mono: true, accent: selectedReceipt.purchaseOrderId ? 'text-[var(--olive-dark)] font-bold' : '' },
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
