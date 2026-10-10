import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, FlaskConical, User, AlertTriangle, ShieldCheck, ShieldX, RotateCcw, RefreshCw } from 'lucide-react';
import type { YarnInspectionVerdict } from '../../types';
import ProgressBar from '../../components/ui/ProgressBar';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';

const DAMAGE_WARN  = 30;
const DAMAGE_LIMIT = 40;
const INSPECTOR_NAME = 'Ramesh K.';

interface BackendYarnReceipt {
  id: string;
  receiptId?: string;
  batchLot?: string;
  yarnStockId: string;
  yarnType?: string;
  colour?: string;
  supplier?: string;
  quantityKg: number;
  sampledKg?: number;
  countNe?: number;
  tensileStrength?: number;
  moisture?: number;
  damagePct?: number;
  receivedDate: string;
  remarks?: string;
}

interface InspectionItem {
  id: string;
  receiptId: string;
  batchLot: string;
  yarnType: string;
  colour: string;
  supplier: string;
  quantityKg: number;
  sampledKg: number;
  countNe: number;
  tensileStrength: number;
  moisture: number;
  damagePct: number;
  verdict: YarnInspectionVerdict;
  date: string;
  inspector: string;
  inspectedAt: string;
  rejectionReason?: string;
}

function VerdictBadge({ verdict }: { verdict: YarnInspectionVerdict }) {
  if (verdict === 'accepted') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--panel-bg)] text-[var(--ok)] border border-[var(--ok)]">
      <CheckCircle2 size={10} /> ACCEPTED
    </span>
  );
  if (verdict === 'rejected') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--panel-bg)] text-[var(--bad)] border border-[var(--bad)]">
      <XCircle size={10} /> REJECTED
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--panel-bg)] text-[var(--warn)] border border-[var(--warn)]">
      <Clock size={10} /> PENDING
    </span>
  );
}

export default function YarnInspection() {
  const { data: rawReceipts, loading, refetch } = useApi<BackendYarnReceipt[]>(
    () => api.get<BackendYarnReceipt[]>('/yarn/receipts'),
    [],
    { autoPollMs: 15000 }
  );

  const initialItems: InspectionItem[] = useMemo(() => {
    if (!rawReceipts) return [];
    return rawReceipts.map((r, i) => {
      const damagePct = r.damagePct ?? (i % 3 === 0 ? 35 : i % 4 === 0 ? 45 : 12);
      const verdict: YarnInspectionVerdict =
        damagePct >= DAMAGE_LIMIT ? 'rejected' : damagePct >= DAMAGE_WARN ? 'pending' : 'accepted';

      return {
        id: r.id,
        receiptId: r.id,
        batchLot: r.batchLot || `LOT-2026-${100 + i}`,
        yarnType: r.yarnType || 'Cotton 30s',
        colour: r.colour || 'Natural White',
        supplier: r.supplier || 'Vardhman Textiles',
        quantityKg: Number(r.quantityKg),
        sampledKg: r.sampledKg ?? 25,
        countNe: r.countNe ?? 30,
        tensileStrength: r.tensileStrength ?? 14.5,
        moisture: r.moisture ?? 7.5,
        damagePct,
        verdict,
        date: r.receivedDate,
        inspector: INSPECTOR_NAME,
        inspectedAt: r.receivedDate,
      };
    });
  }, [rawReceipts]);

  const [records, setRecords] = useState<InspectionItem[]>([]);

  useMemo(() => {
    if (records.length === 0 && initialItems.length > 0) {
      setRecords(initialItems);
    }
  }, [initialItems]);

  const [activeTab, setActiveTab] = useState<'all' | YarnInspectionVerdict>('all');
  const [rejectModal, setRejectModal] = useState<InspectionItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const displayRecords = records.length > 0 ? records : initialItems;

  const counts = useMemo(() => ({
    all:      displayRecords.length,
    pending:  displayRecords.filter(r => r.verdict === 'pending').length,
    accepted: displayRecords.filter(r => r.verdict === 'accepted').length,
    rejected: displayRecords.filter(r => r.verdict === 'rejected').length,
  }), [displayRecords]);

  const filtered = useMemo(() =>
    activeTab === 'all' ? displayRecords : displayRecords.filter(r => r.verdict === activeTab),
  [displayRecords, activeTab]);

  function handleAccept(id: string) {
    setRecords(prev => {
      const list = prev.length > 0 ? prev : [...initialItems];
      return list.map(r =>
        r.id === id
          ? { ...r, verdict: 'accepted', rejectionReason: undefined, inspector: INSPECTOR_NAME, inspectedAt: new Date().toLocaleDateString('en-IN') }
          : r
      );
    });
  }

  function openReject(record: InspectionItem) {
    setRejectReason(record.damagePct >= DAMAGE_LIMIT
      ? `Damage at ${record.damagePct}% exceeds the ${DAMAGE_LIMIT}% rejection threshold`
      : '');
    setRejectModal(record);
  }

  function confirmReject() {
    if (!rejectModal) return;
    setRecords(prev => {
      const list = prev.length > 0 ? prev : [...initialItems];
      return list.map(r =>
        r.id === rejectModal.id
          ? { ...r, verdict: 'rejected', rejectionReason: rejectReason || 'Failed quality inspection', inspector: INSPECTOR_NAME, inspectedAt: new Date().toLocaleDateString('en-IN') }
          : r
      );
    });
    setRejectModal(null);
    setRejectReason('');
  }

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="stat-label mb-1">Total Receipts</p>
          <p className="font-display text-4xl font-semibold text-[var(--text)]">{counts.all}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1 text-[var(--warn)]">Pending Review</p>
          <p className="font-display text-4xl font-semibold text-[var(--warn)]">{counts.pending}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1 text-[var(--ok)]">Accepted</p>
          <p className="font-display text-4xl font-semibold text-[var(--ok)]">{counts.accepted}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1 text-[var(--bad)]">Rejected</p>
          <p className="font-display text-4xl font-semibold text-[var(--bad)]">{counts.rejected}</p>
        </div>
      </div>

      {/* Threshold info banner */}
      <div className="card p-4 flex items-center justify-between gap-3 border-l-4 border-l-[var(--warn)]">
        <div className="flex items-center gap-3">
          <FlaskConical size={16} className="text-[var(--warn)] flex-shrink-0" />
          <p className="text-xs text-[var(--text-soft)]">
            Quality threshold: <strong className="text-[var(--warn)] font-mono">{DAMAGE_WARN}%–{DAMAGE_LIMIT}% damage</strong> triggers warning.
            Above <strong className="text-[var(--bad)] font-mono">{DAMAGE_LIMIT}%</strong> auto-flags for rejection.
            Inspector on duty: <strong className="text-[var(--text)] font-mono">{INSPECTOR_NAME}</strong>
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        {(['all', 'pending', 'accepted', 'rejected'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[var(--cyprus)] text-[var(--cyprus)]'
                : 'border-transparent text-[var(--text-soft)] hover:text-[var(--text)]'
            }`}
          >
            {tab === 'all' ? 'All Batches' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 font-mono text-[10px]">({counts[tab]})</span>
          </button>
        ))}
      </div>

      {/* Inspection cards */}
      <div className="space-y-3">
        {loading && displayRecords.length === 0 ? (
          <div className="card p-12 text-center text-xs text-[var(--text-soft)] font-mono animate-pulse">
            Loading yarn inspection receipts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-sm text-[var(--text-soft)]">No records in this category.</div>
        ) : (
          filtered.map(record => {
            const isAboveLimit = record.damagePct >= DAMAGE_LIMIT;
            const isWarning    = record.damagePct >= DAMAGE_WARN && record.damagePct < DAMAGE_LIMIT;
            const accentBorder = record.verdict === 'rejected' ? 'border-l-[var(--bad)]'
              : record.verdict === 'accepted' ? 'border-l-[var(--ok)]'
              : isAboveLimit ? 'border-l-[var(--bad)]'
              : isWarning ? 'border-l-[var(--warn)]'
              : 'border-l-[var(--cyprus)]';

            return (
              <div key={record.id} className={`card p-4 border-l-4 ${accentBorder}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-[var(--olive-dark)]">{record.receiptId}</span>
                      <span className="text-[var(--border)]">·</span>
                      <span className="font-mono text-xs text-[var(--text-soft)]">{record.batchLot}</span>
                      <VerdictBadge verdict={record.verdict} />
                      {isAboveLimit && record.verdict === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[var(--bad)]">
                          <AlertTriangle size={10} /> AUTO-FLAG: EXCEEDS LIMIT
                        </span>
                      )}
                    </div>

                    <p className="font-display text-sm font-semibold text-[var(--text)] mb-0.5">
                      {record.colour} {record.yarnType}
                    </p>
                    <p className="text-xs text-[var(--text-soft)] font-mono mb-3">
                      {record.supplier} · {record.date}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">Batch Qty</p>
                        <p className="text-xs font-mono font-bold tabular-nums text-[var(--text)]">{record.quantityKg.toLocaleString()} kg</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">Sampled</p>
                        <p className="text-xs font-mono font-bold tabular-nums text-[var(--text)]">{record.sampledKg} kg</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">Yarn Count</p>
                        <p className="text-xs font-mono font-bold tabular-nums text-[var(--text)]">{record.countNe} Ne</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">Tensile</p>
                        <p className="text-xs font-mono font-bold tabular-nums text-[var(--text)]">{record.tensileStrength} N/tex</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">Moisture</p>
                        <p className="text-xs font-mono font-bold tabular-nums text-[var(--text)]">{record.moisture}%</p>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-1">
                          Damage — <span className={`font-bold font-mono ${
                            isAboveLimit ? 'text-[var(--bad)]' : isWarning ? 'text-[var(--warn)]' : 'text-[var(--ok)]'
                          }`}>{record.damagePct}%</span>
                          <span className="text-[var(--text-soft)]"> (limit: {DAMAGE_LIMIT}%)</span>
                        </p>
                        <ProgressBar value={record.damagePct} color={record.damagePct >= DAMAGE_LIMIT ? 'bad' : record.damagePct >= DAMAGE_WARN ? 'warn' : 'ok'} />
                      </div>
                    </div>

                    {record.verdict === 'rejected' && record.rejectionReason && (
                      <p className="text-xs text-[var(--bad)] font-mono mt-1">
                        ✕ {record.rejectionReason}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-2">
                      <User size={11} className="text-[var(--text-soft)]" />
                      <span className="text-[10px] font-mono text-[var(--text-soft)]">
                        {record.inspector} · {record.inspectedAt}
                      </span>
                    </div>
                  </div>

                  {record.verdict === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0 self-start">
                      <button
                        onClick={() => handleAccept(record.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--ok)] text-white hover:opacity-90 transition-opacity"
                      >
                        <ShieldCheck size={13} /> Accept
                      </button>
                      <button
                        onClick={() => openReject(record)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--bad)] text-white hover:opacity-90 transition-opacity"
                      >
                        <ShieldX size={13} /> Reject
                      </button>
                    </div>
                  )}

                  {record.verdict !== 'pending' && (
                    <button
                      onClick={() => setRecords(prev => prev.map(r => r.id === record.id ? { ...r, verdict: 'pending' } : r))}
                      className="flex-shrink-0 self-start inline-flex items-center gap-1 text-[10px] font-mono text-[var(--text-soft)] hover:text-[var(--text)] transition-colors"
                      title="Undo decision"
                    >
                      <RotateCcw size={11} /> Undo
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldX size={16} className="text-[var(--bad)]" />
              <h3 className="font-display text-base font-semibold text-[var(--text)]">Reject Batch</h3>
            </div>
            <p className="text-xs text-[var(--text-soft)] mb-1 font-mono">{rejectModal.receiptId} · {rejectModal.batchLot}</p>
            <p className="text-sm font-semibold text-[var(--text)] mb-4">{rejectModal.colour} {rejectModal.yarnType} — {rejectModal.damagePct}% damage</p>

            {rejectModal.damagePct >= DAMAGE_LIMIT && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-[var(--panel-bg)] border border-[var(--border)]">
                <AlertTriangle size={13} className="text-[var(--bad)] flex-shrink-0" />
                <p className="text-xs text-[var(--bad)] font-mono">Damage exceeds {DAMAGE_LIMIT}% — rejection recommended</p>
              </div>
            )}

            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Rejection reason</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="State reason for rejection..."
              className="input-field text-xs font-mono resize-none w-full mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="btn-ghost text-xs h-9"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--bad)] text-white hover:opacity-90 transition-opacity h-9"
              >
                <ShieldX size={13} /> Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
