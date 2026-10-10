import { useState, useRef, useEffect } from 'react';
import { Plus, Package, Calendar, User, FileText, AlertCircle, ChevronDown, Check, Boxes, Search } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';
import type { YarnReceipt, YarnType, YarnStock } from '../../types';

const STANDARD_COLORS = [
  'White',
  'Natural White',
  'Navy Blue',
  'Black',
  'Red',
  'Grey',
  'Ivory',
  'Khaki',
  'Olive Green',
  'Charcoal',
  'Teal',
  'Royal Blue',
];

export default function YarnReceipts() {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [yarnType, setYarnType] = useState<YarnType>('Cotton');
  const [colour, setColour] = useState('White');
  const [quantityKg, setQuantityKg] = useState<number | ''>('');
  const [forOrderId, setForOrderId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [selectedStockId, setSelectedStockId] = useState<string>('');

  // Fetch receipts history
  const { data, loading, error, refetch } = useApi<YarnReceipt[]>(
    () => api.get<YarnReceipt[]>('/yarn/receipts'),
    []
  );

  // Fetch current warehouse stock items for catalog alignment
  const { data: stockItemsData, refetch: refetchStock } = useApi<YarnStock[]>(
    () => api.get<YarnStock[]>('/yarn/stock'),
    []
  );

  const stockItems = stockItemsData || [];
  const receipts = data || [];
  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(receipts, 20);

  // Handle stock bin selection
  const handleStockBinSelect = (stockId: string) => {
    setSelectedStockId(stockId);
    if (!stockId) return;

    const matched = stockItems.find(s => s.id === stockId);
    if (matched) {
      setYarnType(matched.type);
      setColour(matched.colour);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplier.trim()) {
      setFormError('Supplier name is required.');
      return;
    }
    if (!colour.trim() || !STANDARD_COLORS.includes(colour.trim())) {
      setFormError('Please select a valid standard mill colour from the catalog list.');
      return;
    }
    if (!quantityKg || Number(quantityKg) <= 0) {
      setFormError('Please enter a positive quantity in kg.');
      return;
    }

    setSubmitting(true);
    try {
      // Find matching stock bin if not explicitly selected
      const resolvedStockId = selectedStockId ||
        stockItems.find(s => s.type === yarnType && s.colour.toLowerCase() === colour.trim().toLowerCase())?.id ||
        null;

      await api.post<YarnReceipt>('/yarn/receipts', {
        date,
        supplier: supplier.trim(),
        supplierName: supplier.trim(),
        yarnType,
        colour: colour.trim(),
        quantityKg: Number(quantityKg),
        yarnStockId: resolvedStockId,
        forOrderId: forOrderId.trim() ? forOrderId.trim() : null,
        invoiceNo: invoiceNo.trim() ? invoiceNo.trim() : `INV-${Date.now().toString().slice(-6)}`,
        receivedBy: receivedBy.trim() ? receivedBy.trim() : 'Store Clerk',
      });

      // Reset form and refetch
      setSupplier('');
      setColour('White');
      setSelectedStockId('');
      setQuantityKg('');
      setForOrderId('');
      setInvoiceNo('');
      setReceivedBy('');
      setShowForm(false);
      await Promise.all([refetch(), refetchStock()]);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to record yarn receipt consignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-soft)] text-sm font-medium">{receipts.length} material intake receipts logged</p>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold text-[var(--text)]">Record New Inward Yarn Consignment</h3>
            <span className="text-xs text-[var(--text-soft)] font-mono">Atomic Warehouse Allocation</span>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Quick Stock Bin Selection */}
          <div className="p-3 rounded-lg bg-[var(--panel-bg)] border border-[var(--border)]">
            <label className="section-title block mb-1 text-[11px] font-semibold text-[var(--olive-dark)] flex items-center gap-1.5">
              <Boxes size={13} /> Select Existing Warehouse Bin / Lot (Auto-populates Variety & Colour)
            </label>
            <select
              value={selectedStockId}
              onChange={e => handleStockBinSelect(e.target.value)}
              className="input-field text-xs w-full font-mono"
            >
              <option value="">-- Manual Variety & Colour Selection --</option>
              {stockItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.id} · {item.colour} {item.type} ({item.location} — {item.quantityKg.toLocaleString()} kg on hand)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                placeholder="e.g. Shree Yarns Ltd."
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="section-title block mb-1.5">Yarn Variety</label>
              <select
                value={yarnType}
                onChange={e => {
                  setYarnType(e.target.value as YarnType);
                  setSelectedStockId('');
                }}
                className="input-field text-xs"
              >
                {(['Cotton','Polyester','Wool','Silk','Blended'] as YarnType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Predefined Searchable Color Combobox */}
            <div>
              <label className="section-title block mb-1.5">Standard Mill Colour</label>
              <ColorCombobox
                value={colour}
                onChange={c => {
                  setColour(c);
                  setSelectedStockId('');
                }}
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
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Yarn Variety</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Colour</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Net Quantity</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Stock Bin</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Invoice No</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading && receipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-[var(--text-soft)] font-mono">
                    Loading receipts history...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-[var(--text-soft)]">
                    No yarn receipts logged yet.
                  </td>
                </tr>
              ) : (
                paginatedData.map(r => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-[var(--olive-dark)]">{r.id}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--text-soft)]">{r.date}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[var(--text)]">{r.supplier}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text)]">{r.yarnType}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-soft)]">{r.colour}</td>
                    <td className="px-4 py-3 text-xs font-mono font-bold text-right tabular-nums text-[var(--text)]">
                      {r.quantityKg.toLocaleString()} <span className="text-[10px] text-[var(--text-soft)] font-normal">kg</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--text-soft)]">
                      {(r as any).yarnStockId || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--text-soft)]">{r.invoiceNo || '—'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-soft)]">{r.receivedBy}</td>
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
    </div>
  );
}

/** Predefined Searchable Color Combobox Component */
function ColorCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Ensure input reverts to valid selected color if user typed an unmatched string
        if (!STANDARD_COLORS.includes(query)) {
          setQuery(value);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, value]);

  const filteredColors = STANDARD_COLORS.filter(c =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (color: string) => {
    onChange(color);
    setQuery(color);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            const exactMatch = STANDARD_COLORS.find(
              c => c.toLowerCase() === e.target.value.trim().toLowerCase()
            );
            if (exactMatch) {
              onChange(exactMatch);
            }
          }}
          placeholder="Search standard color..."
          className="input-field text-xs pr-8 w-full"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-soft)] hover:text-[var(--text)]"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-[var(--border)]/30">
          {filteredColors.length === 0 ? (
            <div className="p-2.5 text-center text-xs text-[var(--text-soft)]">
              No matching standard mill colour.
            </div>
          ) : (
            filteredColors.map(c => {
              const isSelected = c === value;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[var(--surface-2)] transition-colors ${
                    isSelected ? 'font-bold text-[var(--olive-dark)] bg-[var(--olive-dark)]/5' : 'text-[var(--text)]'
                  }`}
                >
                  <span>{c}</span>
                  {isSelected && <Check size={12} className="text-[var(--olive-dark)]" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
