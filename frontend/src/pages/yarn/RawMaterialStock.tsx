import { useState } from 'react';
import { AlertTriangle, MapPin, Search } from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';
import type { YarnStock } from '../../types';

export default function RawMaterialStock() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  const { data: stockItems, loading, error } = useApi<YarnStock[]>(
    () => api.get<YarnStock[]>('/yarn/stock'),
    []
  );

  const items = stockItems || [];
  const totalKg = items.reduce((s, y) => s + y.quantityKg, 0);
  const lowStockItems = items.filter(y => y.quantityKg <= y.reorderLevel);

  const filtered = items.filter(yarn => {
    const q = debouncedSearch.toLowerCase();
    const matchesSearch =
      !debouncedSearch.trim() ||
      yarn.id.toLowerCase().includes(q) ||
      yarn.type.toLowerCase().includes(q) ||
      yarn.colour.toLowerCase().includes(q) ||
      yarn.location.toLowerCase().includes(q);

    const matchesType = typeFilter === 'all' || yarn.type === typeFilter;

    let matchesStatus = true;
    if (statusFilter === 'low') {
      matchesStatus = yarn.quantityKg <= yarn.reorderLevel;
    } else if (statusFilter === 'critical') {
      matchesStatus = yarn.quantityKg <= yarn.reorderLevel * 0.4;
    } else if (statusFilter === 'healthy') {
      matchesStatus = yarn.quantityKg > yarn.reorderLevel;
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filtered, 20);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="stat-label mb-1">Total Warehouse Stock</p>
          <p className="font-display text-4xl font-semibold text-[var(--text)]">
            {totalKg.toLocaleString()} <span className="text-sm font-sans font-normal text-[var(--text-soft)]">kg</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1">Active Yarn Varieties</p>
          <p className="font-display text-4xl font-semibold text-[var(--text)]">{items.length}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1">Low Stock Alerts</p>
          <p className={`font-display text-4xl font-semibold ${lowStockItems.length > 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
            {lowStockItems.length}
          </p>
          {lowStockItems.length > 0 && <p className="text-xs text-[var(--text-soft)] mt-1">counts below safety stock</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stock by ID, fiber type, colour, bin location..."
              className="input-field h-10 pl-9 text-xs font-mono w-full"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="input-field h-10 text-xs font-mono w-40"
          >
            <option value="all">All Fiber Types</option>
            <option value="Cotton">Cotton</option>
            <option value="Polyester">Polyester</option>
            <option value="Wool">Wool</option>
            <option value="Silk">Silk</option>
            <option value="Blended">Blended</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field h-10 text-xs font-mono w-40"
          >
            <option value="all">All Stock Levels</option>
            <option value="healthy">Healthy Stock</option>
            <option value="low">Low Stock Alert</option>
            <option value="critical">Critical Deficit</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">Raw Material Inventory Ledgers</h2>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-[var(--text-soft)]">
                    No yarn stock ledgers match your search filters.
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

