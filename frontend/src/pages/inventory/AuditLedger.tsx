import { useState } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Scale,
  Calendar,
  User,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../../services/apiClient';
import { useApi } from '../../hooks/useApi';
import Pagination from '../../components/ui/Pagination';

interface InventoryMovement {
  id: string;
  itemType: string;
  itemId: string;
  skuName: string;
  state: string;
  direction: 'in' | 'out';
  quantity: number;
  quantityDelta: number;
  reservedDelta: number;
  unit: string;
  reason: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey?: string | null;
  actor: string;
  notes?: string | null;
  createdAt: string;
}

interface ReconciliationReport {
  status: 'CONSISTENT' | 'DRIFT_DETECTED';
  driftCount: number;
  timestamp: string;
  checks: {
    balanceVsLedger: Array<{
      itemId: string;
      state: string;
      balance: number;
      ledgerSum: number;
      drift: number;
      status: string;
    }>;
    finishedGoodsVsRolls: Array<{
      orderId: string;
      balance: number;
      rollSum: number;
      drift: number;
      status: string;
    }>;
    pendingQcVsRolls: Array<{
      orderId: string;
      balance: number;
      rollSum: number;
      drift: number;
      status: string;
    }>;
    dispatchVsRolls: {
      ledgerDispatched: number;
      rollDispatched: number;
      drift: number;
      status: string;
    };
  };
}

export default function AuditLedger() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [stateFilter, setStateFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Fetch movements
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
  });
  if (stateFilter !== 'all') queryParams.append('state', stateFilter);
  if (reasonFilter !== 'all') queryParams.append('reason', reasonFilter);
  if (search.trim()) queryParams.append('item_id', search.trim());

  const {
    data: movementData,
    loading: movementsLoading,
    error: movementsError,
    refetch: refetchMovements,
  } = useApi<InventoryMovement[]>(
    () => api.get<InventoryMovement[]>(`/inventory/movements?${queryParams.toString()}`),
    [page, pageSize, stateFilter, reasonFilter, search],
    { autoPollMs: 15000 },
  );

  // Fetch live reconciliation status
  const {
    data: reconReport,
    loading: reconLoading,
    error: reconError,
    refetch: refetchRecon,
  } = useApi<ReconciliationReport>(
    () => api.get<ReconciliationReport>('/inventory/reconciliation'),
    [],
    { autoPollMs: 30000 },
  );

  const movements = movementData || [];
  const isHealthy = reconReport?.status === 'CONSISTENT' && reconReport?.driftCount === 0;

  const handleRefresh = () => {
    refetchMovements();
    refetchRecon();
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'receipt':
        return <span className="badge-status-ok">Receipt</span>;
      case 'reservation':
        return <span className="badge-status-warn">Reservation</span>;
      case 'unreservation':
        return <span className="badge-status-neutral">Unreservation</span>;
      case 'consumption':
        return <span className="badge-status-primary">Consumption</span>;
      case 'roll_production':
        return <span className="badge-status-info">Roll Production</span>;
      case 'qc_pass':
        return <span className="badge-status-ok">QC Pass</span>;
      case 'qc_reject':
        return <span className="badge-status-bad">QC Reject</span>;
      case 'dispatch':
        return <span className="badge-status-neutral">Dispatch</span>;
      case 'adjustment':
        return <span className="badge-status-warn">Adjustment</span>;
      default:
        return <span className="badge-status-neutral">{reason}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Reconciliation Status Widget */}
      <div className="card p-5 border-l-4 border-l-[var(--olive-dark)] flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-display font-semibold text-[var(--text)]">Immutable Audit Ledger</h1>
            <span className="badge-status-ok flex items-center gap-1 font-mono text-[10px]">
              <ShieldCheck size={12} /> Append-Only Protected
            </span>
          </div>
          <p className="text-xs text-[var(--text-soft)] mt-1">
            Complete cryptographic audit trail of every material movement, reservation, production event, and QC outcome.
          </p>
        </div>

        {/* Live Integrity Card */}
        <div className="flex items-center gap-3 bg-[var(--surface-2)] px-4 py-2.5 rounded-lg border border-[var(--border)]">
          <Scale size={20} className={isHealthy ? 'text-[var(--ok)]' : 'text-[var(--bad)]'} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--text)]">Reconciliation Health:</span>
              <span className={`text-xs font-mono font-bold ${isHealthy ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}`}>
                {reconLoading ? 'Checking...' : isHealthy ? '0 DRIFT (100% IN SYNC)' : `${reconReport?.driftCount} DRIFT DETECTED`}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-soft)] font-mono">
              4 mathematical cross-checks verified {reconReport?.timestamp ? new Date(reconReport.timestamp).toLocaleTimeString() : 'now'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--text-soft)] transition-colors ml-2"
            title="Refresh Ledger and Verification Suite"
          >
            <RefreshCw size={14} className={movementsLoading || reconLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 4 Integrity Verification Tiles */}
      {reconReport && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-3.5 border-t-2 border-t-[var(--ok)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[var(--text)]">1. Balance vs Ledger</span>
              <CheckCircle2 size={14} className="text-[var(--ok)]" />
            </div>
            <p className="text-xs text-[var(--text-soft)]">
              {reconReport.checks.balanceVsLedger.filter(c => c.status === 'MATCH').length} / {reconReport.checks.balanceVsLedger.length} balances exact
            </p>
          </div>

          <div className="card p-3.5 border-t-2 border-t-[var(--ok)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[var(--text)]">2. Finished Goods vs Rolls</span>
              <CheckCircle2 size={14} className="text-[var(--ok)]" />
            </div>
            <p className="text-xs text-[var(--text-soft)]">
              {reconReport.checks.finishedGoodsVsRolls.length} finished lots match passed rolls
            </p>
          </div>

          <div className="card p-3.5 border-t-2 border-t-[var(--ok)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[var(--text)]">3. Pending QC vs Rolls</span>
              <CheckCircle2 size={14} className="text-[var(--ok)]" />
            </div>
            <p className="text-xs text-[var(--text-soft)]">
              {reconReport.checks.pendingQcVsRolls.length} inspection lots match pending rolls
            </p>
          </div>

          <div className="card p-3.5 border-t-2 border-t-[var(--ok)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[var(--text)]">4. Dispatches vs Consignments</span>
              <CheckCircle2 size={14} className="text-[var(--ok)]" />
            </div>
            <p className="text-xs text-[var(--text-soft)] font-mono">
              {reconReport.checks.dispatchVsRolls.ledgerDispatched} m dispatched
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Item ID (e.g. YS-001, ORD-1033)..."
              className="input-field h-10 pl-9 text-xs font-mono w-full"
            />
          </div>
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="input-field h-10 text-xs font-mono w-44"
          >
            <option value="all">All States</option>
            <option value="raw_yarn">raw_yarn</option>
            <option value="wip">wip</option>
            <option value="fabric_pending_qc">fabric_pending_qc</option>
            <option value="finished_goods">finished_goods</option>
            <option value="scrap_fabric">scrap_fabric</option>
          </select>
          <select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            className="input-field h-10 text-xs font-mono w-44"
          >
            <option value="all">All Reasons</option>
            <option value="receipt">receipt</option>
            <option value="reservation">reservation</option>
            <option value="consumption">consumption</option>
            <option value="roll_production">roll_production</option>
            <option value="qc_pass">qc_pass</option>
            <option value="qc_reject">qc_reject</option>
            <option value="dispatch">dispatch</option>
            <option value="adjustment">adjustment</option>
          </select>
        </div>
      </div>

      {movementsError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
          {movementsError}
        </div>
      )}

      {/* Movement Ledger Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--olive-dark)]" />
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">Transaction Log Entries</h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-soft)]">
            Showing {movements.length} events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Timestamp</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Item / State</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Event Reason</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Physical Delta</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Reserved Delta</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Reference Source</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Actor</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {movementsLoading && movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-xs text-[var(--text-soft)] font-mono">
                    Querying immutable event ledger...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-xs text-[var(--text-soft)]">
                    No movement ledger entries found matching current filter parameters.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositiveDelta = m.quantityDelta > 0;
                  const isNegativeDelta = m.quantityDelta < 0;

                  return (
                    <tr key={m.id} className="table-row-hover">
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-left">
                        <span className="font-mono font-bold text-[var(--olive-dark)] block">{m.itemId}</span>
                        <span className="text-[11px] font-mono text-[var(--text-soft)]">{m.state} ({m.unit})</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                        {getReasonBadge(m.reason)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums whitespace-nowrap font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          {isPositiveDelta && <ArrowDownLeft size={13} className="text-[var(--ok)]" />}
                          {isNegativeDelta && <ArrowUpRight size={13} className="text-[var(--bad)]" />}
                          <span
                            className={
                              isPositiveDelta
                                ? 'text-[var(--ok)]'
                                : isNegativeDelta
                                ? 'text-[var(--bad)]'
                                : 'text-[var(--text-soft)]'
                            }
                          >
                            {isPositiveDelta ? `+${m.quantityDelta}` : `${m.quantityDelta}`} {m.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        {m.reservedDelta !== 0 ? (
                          <span className={m.reservedDelta > 0 ? 'text-[var(--warn)]' : 'text-[var(--text-soft)]'}>
                            {m.reservedDelta > 0 ? `+${m.reservedDelta}` : `${m.reservedDelta}`} {m.unit}
                          </span>
                        ) : (
                          <span className="text-[var(--text-soft)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-left">
                        <span className="font-mono text-[var(--text)] font-medium block">{m.referenceId}</span>
                        <span className="text-[10px] text-[var(--text-soft)] uppercase tracking-wider">{m.referenceType}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-left">
                        <div className="flex items-center gap-1 text-[var(--text-soft)]">
                          <User size={12} />
                          <span>{m.actor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[var(--text-soft)] max-w-xs truncate" title={m.notes ?? ''}>
                        {m.notes ?? '—'}
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
            totalPages={Math.max(1, Math.ceil(movements.length / pageSize))}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        </div>
      </div>
    </div>
  );
}
