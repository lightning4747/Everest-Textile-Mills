import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Clock, FlaskConical, User, AlertTriangle,
  ShieldCheck, ShieldX, RotateCcw, RefreshCw, SlidersHorizontal, X, Loader2, Settings
} from 'lucide-react';
import type { YarnInspectionVerdict } from '../../types';
import ProgressBar from '../../components/ui/ProgressBar';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import DetailModal from '../../components/ui/DetailModal';

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

interface InspectionConfig {
  damageWarningPct: number;
  damageRejectionPct: number;
  moistureMaxPct: number;
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [config, setConfig] = useState<InspectionConfig>({
    damageWarningPct: 30,
    damageRejectionPct: 40,
    moistureMaxPct: 8.5,
  });
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Fetch dynamic thresholds from backend
  useEffect(() => {
    api.get<InspectionConfig>('/yarn/inspection/config')
      .then(res => {
        if (res?.data) {
          setConfig(res.data);
        }
      })
      .catch(() => {});
  }, []);

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
        damagePct >= config.damageRejectionPct
          ? 'rejected'
          : damagePct >= config.damageWarningPct
          ? 'pending'
          : 'accepted';

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
  }, [rawReceipts, config]);

  const [records, setRecords] = useState<InspectionItem[]>([]);

  useEffect(() => {
    if (initialItems.length > 0 && records.length === 0) {
      setRecords(initialItems);
    }
  }, [initialItems]);

  const [activeTab, setActiveTab] = useState<'all' | YarnInspectionVerdict>('all');
  const [rejectModal, setRejectModal] = useState<InspectionItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailRecord, setDetailRecord] = useState<InspectionItem | null>(null);

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
    setRejectReason(record.damagePct >= config.damageRejectionPct
      ? `Damage at ${record.damagePct}% exceeds the ${config.damageRejectionPct}% rejection threshold`
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

  const handleConfigSaved = (newConfig: InspectionConfig) => {
    setConfig(newConfig);
    // Recalculate verdicts immediately for records
    setRecords(prev => {
      const list = prev.length > 0 ? prev : [...initialItems];
      return list.map(r => {
        const newVerdict: YarnInspectionVerdict =
          r.damagePct >= newConfig.damageRejectionPct
            ? 'rejected'
            : r.damagePct >= newConfig.damageWarningPct
            ? 'pending'
            : 'accepted';
        return { ...r, verdict: newVerdict };
      });
    });
    setShowConfigModal(false);
  };

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
            Quality threshold: <strong className="text-[var(--warn)] font-mono">{config.damageWarningPct}%–{config.damageRejectionPct}% damage</strong> triggers warning.
            Above <strong className="text-[var(--bad)] font-mono">{config.damageRejectionPct}%</strong> auto-flags for rejection.
            Max moisture tolerance: <strong className="text-[var(--text)] font-mono">{config.moistureMaxPct}%</strong>.
            Inspector on duty: <strong className="text-[var(--text)] font-mono">{INSPECTOR_NAME}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-xs font-semibold text-[var(--text)] transition-colors"
              title="Configure QC Tolerances"
            >
              <SlidersHorizontal size={13} className="text-[var(--olive-dark)]" />
              <span>Configure Tolerances</span>
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
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
            const isAboveLimit = record.damagePct >= config.damageRejectionPct;
            const isWarning    = record.damagePct >= config.damageWarningPct && record.damagePct < config.damageRejectionPct;
            const isHighMoisture = record.moisture > config.moistureMaxPct;

            const accentBorder = record.verdict === 'rejected' ? 'border-l-[var(--bad)]'
              : record.verdict === 'accepted' ? 'border-l-[var(--ok)]'
              : isAboveLimit ? 'border-l-[var(--bad)]'
              : isWarning ? 'border-l-[var(--warn)]'
              : 'border-l-[var(--cyprus)]';

            return (
              <div key={record.id} className={`card p-4 border-l-4 ${accentBorder} cursor-pointer`} onClick={() => setDetailRecord(record)}>
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
                      {isHighMoisture && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[var(--warn)]">
                          <AlertTriangle size={10} /> HIGH MOISTURE
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
                        <p className={`text-xs font-mono font-bold tabular-nums ${isHighMoisture ? 'text-[var(--bad)]' : 'text-[var(--text)]'}`}>
                          {record.moisture}% {isHighMoisture ? `(max ${config.moistureMaxPct}%)` : ''}
                        </p>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-1">
                          Damage — <span className={`font-bold font-mono ${
                            isAboveLimit ? 'text-[var(--bad)]' : isWarning ? 'text-[var(--warn)]' : 'text-[var(--ok)]'
                          }`}>{record.damagePct}%</span>
                          <span className="text-[var(--text-soft)]"> (limit: {config.damageRejectionPct}%)</span>
                        </p>
                        <ProgressBar value={record.damagePct} color={record.damagePct >= config.damageRejectionPct ? 'bad' : record.damagePct >= config.damageWarningPct ? 'warn' : 'ok'} />
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
                    <div className="flex flex-col gap-2 flex-shrink-0 self-start" onClick={e => e.stopPropagation()}>
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
                      onClick={e => { e.stopPropagation(); setRecords(prev => prev.map(r => r.id === record.id ? { ...r, verdict: 'pending' } : r)); }}
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

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldX size={16} className="text-[var(--bad)]" />
              <h3 className="font-display text-base font-semibold text-[var(--text)]">Reject Batch</h3>
            </div>
            <p className="text-xs text-[var(--text-soft)] mb-1 font-mono">{rejectModal.receiptId} · {rejectModal.batchLot}</p>
            <p className="text-sm font-semibold text-[var(--text)] mb-4">{rejectModal.colour} {rejectModal.yarnType} — {rejectModal.damagePct}% damage</p>

            {rejectModal.damagePct >= config.damageRejectionPct && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-[var(--panel-bg)] border border-[var(--border)]">
                <AlertTriangle size={13} className="text-[var(--bad)] flex-shrink-0" />
                <p className="text-xs text-[var(--bad)] font-mono">Damage exceeds {config.damageRejectionPct}% — rejection recommended</p>
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

      {/* Admin QC Config Modal */}
      {showConfigModal && (
        <AdminConfigModal
          currentConfig={config}
          onClose={() => setShowConfigModal(false)}
          onSave={handleConfigSaved}
        />
      )}

      {/* Inspection Detail Modal */}
      <DetailModal
        open={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        title={detailRecord ? `${detailRecord.colour} ${detailRecord.yarnType}` : ''}
        subtitle={detailRecord ? `${detailRecord.receiptId} · ${detailRecord.batchLot}` : ''}
        badge={detailRecord ? <VerdictBadge verdict={detailRecord.verdict} /> : undefined}
        sections={detailRecord ? [
          {
            title: 'Batch Identity',
            fields: [
              { label: 'Receipt ID',        value: detailRecord.receiptId,              mono: true, accent: 'text-[var(--olive-dark)]' },
              { label: 'Batch Lot',         value: detailRecord.batchLot,               mono: true },
              { label: 'Supplier',          value: detailRecord.supplier },
              { label: 'Inspection Date',   value: detailRecord.date,                   mono: true },
            ],
          },
          {
            title: 'Yarn Specification',
            fields: [
              { label: 'Yarn Type',         value: detailRecord.yarnType },
              { label: 'Colour',            value: detailRecord.colour },
              { label: 'Batch Qty',         value: `${detailRecord.quantityKg.toLocaleString()} kg`, mono: true },
              { label: 'Sampled',           value: `${detailRecord.sampledKg} kg`,      mono: true },
              { label: 'Yarn Count',        value: `${detailRecord.countNe} Ne`,         mono: true },
              { label: 'Tensile Strength',  value: `${detailRecord.tensileStrength} N/tex`, mono: true },
            ],
          },
          {
            title: 'Quality Measurements',
            fields: [
              { label: 'Damage %',          value: `${detailRecord.damagePct}%`,         mono: true, accent: detailRecord.damagePct >= config.damageRejectionPct ? 'text-[var(--bad)] font-bold' : detailRecord.damagePct >= config.damageWarningPct ? 'text-[var(--warn)] font-bold' : 'text-[var(--ok)]' },
              { label: 'Moisture %',        value: `${detailRecord.moisture}%`,           mono: true, accent: detailRecord.moisture > config.moistureMaxPct ? 'text-[var(--bad)] font-bold' : 'text-[var(--text)]' },
              { label: 'Inspector',         value: detailRecord.inspector },
              { label: 'Inspected At',      value: detailRecord.inspectedAt,              mono: true },
              ...(detailRecord.rejectionReason ? [{ label: 'Rejection Reason', value: detailRecord.rejectionReason, accent: 'text-[var(--bad)]', span: true as const }] : []),
            ],
          },
        ] : []}
      />
    </div>
  );
}

function AdminConfigModal({
  currentConfig,
  onClose,
  onSave,
}: {
  currentConfig: InspectionConfig;
  onClose: () => void;
  onSave: (saved: InspectionConfig) => void;
}) {
  const [warningPct, setWarningPct] = useState(currentConfig.damageWarningPct);
  const [rejectionPct, setRejectionPct] = useState(currentConfig.damageRejectionPct);
  const [moistureMaxPct, setMoistureMaxPct] = useState(currentConfig.moistureMaxPct);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (warningPct > rejectionPct) {
      setError('Warning threshold (%) cannot exceed rejection threshold (%).');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put<InspectionConfig>('/yarn/inspection/config', {
        damageWarningPct: warningPct,
        damageRejectionPct: rejectionPct,
        moistureMaxPct: moistureMaxPct,
      });

      onSave(res?.data || {
        damageWarningPct: warningPct,
        damageRejectionPct: rejectionPct,
        moistureMaxPct: moistureMaxPct,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to update inspection tolerances.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[var(--border)] rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--olive-dark)]/10 text-[var(--olive-dark)] flex items-center justify-center">
              <Settings size={16} />
            </div>
            <div>
              <h3 className="font-syne font-bold text-base text-[var(--text)]">QC Inspection Tolerances</h3>
              <p className="text-xs text-[var(--text-soft)]">Admin Quality Control Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 hover:bg-[var(--surface-2)] rounded text-[var(--text-soft)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
              Warning Threshold (% Damage)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              required
              value={warningPct}
              onChange={e => setWarningPct(Number(e.target.value))}
              className="input-field text-xs font-mono w-full font-bold"
            />
            <p className="text-[10px] text-[var(--text-soft)] mt-1">Batches at or above this percentage trigger review warnings.</p>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
              Rejection Threshold (% Damage)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              required
              value={rejectionPct}
              onChange={e => setRejectionPct(Number(e.target.value))}
              className="input-field text-xs font-mono w-full font-bold"
            />
            <p className="text-[10px] text-[var(--text-soft)] mt-1">Batches at or above this percentage auto-flag for rejection.</p>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[var(--text-soft)] mb-1">
              Max Moisture Tolerance (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              required
              value={moistureMaxPct}
              onChange={e => setMoistureMaxPct(Number(e.target.value))}
              className="input-field text-xs font-mono w-full font-bold"
            />
            <p className="text-[10px] text-[var(--text-soft)] mt-1">Moisture content above this percentage flags as high moisture.</p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="btn-ghost text-xs h-9 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs h-9 px-4 inline-flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving Tolerances...</span>
                </>
              ) : (
                <span>Save Tolerances</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
