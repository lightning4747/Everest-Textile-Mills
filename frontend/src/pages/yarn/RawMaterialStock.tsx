import { useState } from 'react';
import { AlertTriangle, MapPin, Search, Layers, Lock, CheckCircle2 } from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/ui/Pagination';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';
import type { YarnStock } from '../../types';

interface InventoryBalance {
  id: string;
  itemType: string;
  itemId: string;
  skuName: string;
  state: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unit: string;
  location: string;
  lastUpdated: string;
}

export default function RawMaterialStock() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  // Real-time inventory balances from central inventory service
  const { data: balanceData, loading: balanceLoading, error: balanceError } = useApi<InventoryBalance[]>(
    () => api.get<InventoryBalance[]>('/inventory/balances?state=raw_yarn'),
    [],
    { autoPollMs: 15000 }
  );

  // Auxiliary yarn bin metadata for reorder thresholds and fiber classifications
  const { data: stockMeta, loading: metaLoading, error: metaError } = useApi<YarnStock[]>(
    () => api.get<YarnStock[]>('/yarn/stock'),
    [],
    { autoPollMs: 15000 }
  );

  const metaMap = new Map<string, YarnStock>();
  (stockMeta || []).forEach(m => metaMap.set(m.id, m));

  const balances = balanceData || [];
  const mergedItems = balances.map(b => {
    const meta = metaMap.get(b.itemId);
    const reorderLevel = meta?.reorderLevel ?? 200;
    const type = meta?.type ?? b.skuName.split(' ')[0] ?? 'Yarn';
    const colour = meta?.colour ?? '';
    const isLow = b.availableQuantity <= reorderLevel;
    const isCritical = b.availableQuantity <= reorderLevel * 0.4;

    return {
      id: b.itemId,
      balanceId: b.id,
      skuName: b.skuName,
      type,
      colour,
      onHandKg: b.quantity,
      reservedKg: b.reservedQuantity,
      availableKg: b.availableQuantity,
      reorderLevel,
      location: b.location || meta?.location || 'Main Floor',
      lastUpdated: new Date(b.lastUpdated).toISOString().split('T')[0],
      isLow,
      isCritical,
    };
  });

  const totalOnHandKg = mergedItems.reduce((s, y) => s + y.onHandKg, 0);
  const totalReservedKg = mergedItems.reduce((s, y) => s + y.reservedKg, 0);
  const totalAvailableKg = mergedItems.reduce((s, y) => s + y.availableKg, 0);
  const lowStockItems = mergedItems.filter(y => y.isLow);

  const filtered = mergedItems.filter(yarn => {
    const q = debouncedSearch.toLowerCase();
    const matchesSearch =
      !debouncedSearch.trim() ||
      yarn.id.toLowerCase().includes(q) ||
      yarn.skuName.toLowerCase().includes(q) ||
      yarn.type.toLowerCase().includes(q) ||
      yarn.colour.toLowerCase().includes(q) ||
      yarn.location.toLowerCase().includes(q);

    const matchesType = typeFilter === 'all' || yarn.type.toLowerCase() === typeFilter.toLowerCase();

    let matchesStatus = true;
    if (statusFilter === 'low') {
      matchesStatus = yarn.isLow;
    } else if (statusFilter === 'critical') {
      matchesStatus = yarn.isCritical;
    } else if (statusFilter === 'healthy') {
      matchesStatus = !yarn.isLow;
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  const { paginatedData, page, totalPages, pageSize, setPage, setPageSize } = usePagination(filtered, 20);

  const loading = balanceLoading || metaLoading;
  const error = balanceError || metaError;

  return (
    <div className="space-y-6">
      {/* 4 Summary Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="stat-label">On-Hand Physical Stock</p>
            <Layers size={16} className="text-[var(--text-soft)]" />
          </div>
          <p className="font-display text-3xl font-semibold text-[var(--text)]">
            {totalOnHandKg.toLocaleString()} <span className="text-xs font-sans font-normal text-[var(--text-soft)]">kg</span>
          </p>
          <p className="text-[11px] text-[var(--text-soft)] mt-1">Physical material in warehouse bins</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="stat-label">Reserved For Orders</p>
            <Lock size={16} className="text-[var(--warn)]" />
          </div>
          <p className="font-display text-3xl font-semibold text-[var(--warn)]">
            {totalReservedKg.toLocaleString()} <span className="text-xs font-sans font-normal text-[var(--text-soft)]">kg</span>
          </p>
          <p className="text-[11px] text-[var(--text-soft)] mt-1">Earmarked for spinning & weaving</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="stat-label">Available to Allocate</p>
            <CheckCircle2 size={16} className="text-[var(--ok)]" />
          </div>
          <p className="font-display text-3xl font-semibold text-[var(--ok)]">
            {totalAvailableKg.toLocaleString()} <span className="text-xs font-sans font-normal text-[var(--text-soft)]">kg</span>
          </p>
          <p className="text-[11px] text-[var(--text-soft)] mt-1">Unreserved stock ready for sales</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="stat-label">Safety Alerts</p>
            <AlertTriangle size={16} className={lowStockItems.length > 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'} />
          </div>
          <p className={`font-display text-3xl font-semibold ${lowStockItems.length > 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
            {lowStockItems.length}
          </p>
          <p className="text-[11px] text-[var(--text-soft)] mt-1">Bins below safety reorder threshold</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stock by ID, fiber SKU, colour, bin location..."
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

      {/* Real-time Material Balances Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">Raw Material Real-Time Balances</h2>
            <p className="text-xs text-[var(--text-soft)]">Live material snapshots synchronized with immutable event ledger</p>
          </div>
          <span className="text-[11px] font-mono bg-[var(--surface-2)] px-2.5 py-1 rounded border border-[var(--border)] text-[var(--text-soft)]">
            Central Ledger Connected
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Stock ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">SKU / Fiber Name</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">On-Hand (kg)</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Reserved (kg)</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Available (kg)</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Safety Level</th>
                <th className="px-4 py-3 section-title whitespace-nowrap">Stock Gauge</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Warehouse Bin</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Last Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading && mergedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-[var(--text-soft)] font-mono">
                    Loading inventory balances from central engine...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-[var(--text-soft)]">
                    No yarn stock balances match your search filters.
                  </td>
                </tr>
              ) : (
                paginatedData.map(yarn => {
                  const pct = Math.min(100, Math.round((yarn.availableKg / (yarn.reorderLevel * 4)) * 100));
                  return (
                    <tr key={yarn.id} className="table-row-hover">
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">
                        {yarn.id}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-left">
                        <span className="font-semibold text-[var(--text)] block">{yarn.skuName}</span>
                        <span className="text-[11px] text-[var(--text-soft)]">{yarn.type} {yarn.colour ? `· ${yarn.colour}` : ''}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums text-[var(--text)] font-semibold">
                        {yarn.onHandKg.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums text-[var(--warn)] font-semibold">
                        {yarn.reservedKg > 0 ? `${yarn.reservedKg.toLocaleString()}` : '0'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-sm font-mono font-bold tabular-nums ${yarn.isCritical ? 'text-[var(--bad)]' : yarn.isLow ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
                            {yarn.availableKg.toLocaleString()}
                          </span>
                          {yarn.isLow && (
                            <AlertTriangle size={13} className={yarn.isCritical ? 'text-[var(--bad)]' : 'text-[var(--warn)]'} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono tabular-nums text-[var(--text-soft)] text-right">
                        {yarn.reorderLevel.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 w-40">
                        <div className="space-y-1">
                          <ProgressBar value={pct} color={yarn.isCritical ? 'bad' : yarn.isLow ? 'warn' : 'ok'} />
                          <p className="text-[10px] font-mono tabular-nums text-[var(--text-soft)] text-right">
                            <span className={`font-semibold ${yarn.isCritical ? 'text-[var(--bad)]' : yarn.isLow ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
                              {yarn.availableKg.toLocaleString()} kg avail
                            </span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-left">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
                          <MapPin size={12} className="text-[var(--olive-grey)]" />
                          <span className="font-mono">{yarn.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">
                        {yarn.lastUpdated}
                      </td>
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
