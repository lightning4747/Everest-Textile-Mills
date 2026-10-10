import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, ArrowUpRight, Filter, RotateCcw, Boxes, ChevronRight } from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';
import type { YarnStock, YarnType } from '../../types';

export default function RawMaterialStock() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: stockItems, loading, error } = useApi<YarnStock[]>(
    () => api.get<YarnStock[]>('/yarn/stock'),
    []
  );

  const items = stockItems || [];
  const totalKg = items.reduce((s, y) => s + y.quantityKg, 0);
  const lowStockItems = items.filter(y => y.quantityKg <= y.reorderLevel);

  // Distinct fiber types for cycling/toggle filter
  const distinctTypes = useMemo(() => Array.from(new Set(items.map(y => y.type))), [items]);
  const [selectedType, setSelectedType] = useState<YarnType | 'ALL'>('ALL');

  // Cycle through varieties on card click
  const handleCycleVariety = () => {
    if (distinctTypes.length === 0) return;
    if (selectedType === 'ALL') {
      setSelectedType(distinctTypes[0]);
    } else {
      const currIdx = distinctTypes.indexOf(selectedType);
      if (currIdx === -1 || currIdx === distinctTypes.length - 1) {
        setSelectedType('ALL');
      } else {
        setSelectedType(distinctTypes[currIdx + 1]);
      }
    }
  };

  // Reset filter and scroll to table
  const handleResetAndScroll = () => {
    setSelectedType('ALL');
    tableRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredItems = useMemo(() => {
    if (selectedType === 'ALL') return items;
    return items.filter(y => y.type === selectedType);
  }, [items, selectedType]);

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filteredItems, 20);

  return (
    <div className="space-y-6">
      {/* Interactive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Warehouse Stock */}
        <div
          onClick={handleResetAndScroll}
          className="card p-4 cursor-pointer hover:border-[var(--olive-dark)] hover:shadow-sm transition-all group select-none relative"
          title="Click to reset filters and view full warehouse ledger"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="stat-label">Total Warehouse Stock</p>
            <div className="w-7 h-7 rounded-lg bg-[var(--panel-bg)] flex items-center justify-center text-[var(--text-soft)] group-hover:text-[var(--olive-dark)] transition-colors">
              <Boxes size={14} />
            </div>
          </div>
          <p className="font-display text-4xl font-semibold text-[var(--text)]">
            {totalKg.toLocaleString()} <span className="text-sm font-sans font-normal text-[var(--text-soft)]">kg</span>
          </p>
          <p className="text-[11px] text-[var(--text-soft)] mt-2 flex items-center gap-1 group-hover:text-[var(--olive-dark)] transition-colors">
            <span>Reset filters & view all</span>
            <ChevronRight size={12} />
          </p>
        </div>

        {/* Card 2: Active Yarn Varieties (Clickable toggle filter) */}
        <div
          onClick={handleCycleVariety}
          className={`card p-4 cursor-pointer hover:border-[var(--olive-dark)] hover:shadow-sm transition-all group select-none relative ${
            selectedType !== 'ALL' ? 'border-[var(--olive-dark)] ring-1 ring-[var(--olive-dark)]/30 bg-[var(--olive-dark)]/5' : ''
          }`}
          title="Click to cycle filter by yarn variety"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="stat-label">Active Yarn Varieties</p>
            <div className="w-7 h-7 rounded-lg bg-[var(--panel-bg)] flex items-center justify-center text-[var(--text-soft)] group-hover:text-[var(--olive-dark)] transition-colors">
              <Filter size={14} className={selectedType !== 'ALL' ? 'text-[var(--olive-dark)]' : ''} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-display text-4xl font-semibold text-[var(--text)]">{distinctTypes.length}</p>
            <span className="text-xs font-mono text-[var(--text-soft)]">({items.length} lots)</span>
          </div>
          <p className="text-[11px] text-[var(--text-soft)] mt-2 flex items-center gap-1.5">
            {selectedType === 'ALL' ? (
              <span className="group-hover:text-[var(--olive-dark)] transition-colors">Click to filter by fiber</span>
            ) : (
              <span className="font-bold text-[var(--olive-dark)]">Filtered: {selectedType} (click to cycle)</span>
            )}
          </p>
        </div>

        {/* Card 3: Low Stock Alerts (Clickable navigation) */}
        <div
          onClick={() => navigate('/yarn/alerts')}
          className="card p-4 cursor-pointer hover:border-[var(--olive-dark)] hover:shadow-sm transition-all group select-none relative"
          title="Click to navigate to Low Stock Alerts page"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="stat-label">Low Stock Alerts</p>
            <div className="w-7 h-7 rounded-lg bg-[var(--panel-bg)] flex items-center justify-center text-[var(--text-soft)] group-hover:text-[var(--olive-dark)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
              <ArrowUpRight size={14} />
            </div>
          </div>
          <p className={`font-display text-4xl font-semibold ${lowStockItems.length > 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
            {lowStockItems.length}
          </p>
          <p className="text-[11px] text-[var(--text-soft)] mt-2 flex items-center gap-1 group-hover:text-[var(--olive-dark)] transition-colors">
            <span>{lowStockItems.length > 0 ? 'Action required in Alerts' : 'All buffer levels healthy'}</span>
            <ChevronRight size={12} />
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Filter status indicator banner if active */}
      {selectedType !== 'ALL' && (
        <div className="p-3 rounded-lg bg-[var(--surface-2)]/40 border border-[var(--border)] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-[var(--olive-dark)]" />
            <span>Filtering inventory by variety: <strong className="font-semibold text-[var(--text)]">{selectedType}</strong> ({filteredItems.length} matching lots)</span>
          </div>
          <button
            onClick={() => setSelectedType('ALL')}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--olive-dark)] hover:underline"
          >
            <RotateCcw size={11} /> Reset Filter
          </button>
        </div>
      )}

      {/* Inventory Table */}
      <div ref={tableRef} className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">Raw Material Inventory Ledgers</h2>
          {selectedType !== 'ALL' && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--olive-dark)]/10 text-[var(--olive-dark)]">
              Showing {selectedType} only
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Stock ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Fiber Type</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Colour</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Current Qty (kg)</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Reorder Level</th>
                <th className="px-4 py-3 section-title whitespace-nowrap">Stock Level</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Warehouse Bin</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Last Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-[var(--text-soft)] font-mono">
                    Loading inventory ledger from database...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-[var(--text-soft)]">
                    No yarn inventory records found for filter &ldquo;{selectedType}&rdquo;.
                  </td>
                </tr>
              ) : (
                paginatedData.map(yarn => {
                  const pct = Math.min(100, Math.round((yarn.quantityKg / (yarn.reorderLevel * 4)) * 100));
                  const isLow      = yarn.quantityKg <= yarn.reorderLevel;
                  const isCritical = yarn.quantityKg <= yarn.reorderLevel * 0.4;
                  return (
                    <tr key={yarn.id} className="table-row-hover">
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{yarn.id}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{yarn.type}</td>
                      <td className="px-4 py-3.5 text-xs text-[var(--text-soft)] text-left">{yarn.colour}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-sm font-mono font-bold tabular-nums ${isCritical ? 'text-[var(--bad)]' : isLow ? 'text-[var(--warn)]' : 'text-[var(--text)]'}`}>
                            {yarn.quantityKg.toLocaleString()}
                          </span>
                          {isLow && <AlertTriangle size={13} className={isCritical ? 'text-[var(--bad)]' : 'text-[var(--warn)]'} />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono tabular-nums text-[var(--text-soft)] text-right">{yarn.reorderLevel.toLocaleString()}</td>
                      <td className="px-4 py-3.5 w-44">
                        <div className="space-y-1">
                          <ProgressBar value={pct} color={isCritical ? 'bad' : isLow ? 'warn' : 'ok'} />
                          <p className="text-[10px] font-mono tabular-nums text-[var(--text-soft)] text-right">
                            <span className={`font-semibold ${isCritical ? 'text-[var(--bad)]' : isLow ? 'text-[var(--warn)]' : 'text-[var(--text)]'}`}>{yarn.quantityKg.toLocaleString()} kg</span>
                            {' '}/ {(yarn.reorderLevel * 4).toLocaleString()} kg
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-left">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
                          <MapPin size={12} className="text-[var(--olive-grey)]" />
                          <span className="font-mono">{yarn.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{yarn.lastUpdated}</td>
                    </tr>
                  );
                })
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
