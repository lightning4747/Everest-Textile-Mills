import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, FlaskConical, User, AlertTriangle, ShieldCheck, ShieldX, RotateCcw } from 'lucide-react';
import { yarnInspections } from '../../data/mockData';
import type { YarnInspectionRecord, YarnInspectionVerdict } from '../../types';
import ProgressBar from '../../components/ui/ProgressBar';

// ─── Threshold config ──────────────────────────────────────────────────────
const DAMAGE_WARN  = 30; // % — warning zone starts
const DAMAGE_LIMIT = 40; // % — auto-reject above this

const INSPECTOR_NAME = 'Ramesh K.'; // logged-in quality member

// ─── Helpers ──────────────────────────────────────────────────────────────
function verdictColor(v: YarnInspectionVerdict) {
  if (v === 'accepted') return 'text-[var(--ok)]';
  if (v === 'rejected') return 'text-[var(--bad)]';
  return 'text-[var(--warn)]';
}

function damageColor(pct: number) {
  if (pct >= DAMAGE_LIMIT) return 'bad' as const;
  if (pct >= DAMAGE_WARN)  return 'warn' as const;
  return 'ok' as const;
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

// ─── Page ─────────────────────────────────────────────────────────────────
export default function YarnInspection() {
  const [records, setRecords] = useState<YarnInspectionRecord[]>(yarnInspections);
  const [activeTab, setActiveTab] = useState<'all' | YarnInspectionVerdict>('all');
  const [rejectModal, setRejectModal] = useState<YarnInspectionRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const counts = useMemo(() => ({
    all:      records.length,
    pending:  records.filter(r => r.verdict === 'pending').length,
    accepted: records.filter(r => r.verdict === 'accepted').length,
    rejected: records.filter(r => r.verdict === 'rejected').length,
  }), [records]);

  const filtered = useMemo(() =>
    activeTab === 'all' ? records : records.filter(r => r.verdict === activeTab),
  [records, activeTab]);

  function handleAccept(id: string) {
    setRecords(prev => prev.map(r =>
      r.id === id
        ? { ...r, verdict: 'accepted', rejectionReason: undefined, inspector: INSPECTOR_NAME, inspectedAt: new Date().toLocaleString('en-IN') }
        : r
    ));
  }

  function openReject(record: YarnInspectionRecord) {
    setRejectReason(record.damagePct >= DAMAGE_LIMIT
      ? `Damage at ${record.damagePct}% exceeds the ${DAMAGE_LIMIT}% rejection threshold`
      : '');
    setRejectModal(record);
  }

  function confirmReject() {
    if (!rejectModal) return;
    setRecords(prev => prev.map(r =>
      r.id === rejectModal.id
        ? { ...r, verdict: 'rejected', rejectionReason: rejectReason || 'Failed quality inspection', inspector: INSPECTOR_NAME, inspectedAt: new Date().toLocaleString('en-IN') }
        : r
    ));
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
      <div className="card p-4 flex items-center gap-3 border-l-4 border-l-[var(--warn)]">
        <FlaskConical size={16} className="text-[var(--warn)] flex-shrink-0" />
        <p className="text-xs text-[var(--text-soft)]">
          Quality threshold: <strong className="text-[var(--warn)] font-mono">{DAMAGE_WARN}%–{DAMAGE_LIMIT}% damage</strong> triggers warning.
          Above <strong className="text-[var(--bad)] font-mono">{DAMAGE_LIMIT}%</strong> auto-flags for rejection.
          Inspector on duty: <strong className="text-[var(--text)] font-mono">{INSPECTOR_NAME}</strong>
        </p>
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
        {filtered.length === 0 && (
          <div className="card p-10 text-center text-sm text-[var(--text-soft)]">No records in this category.</div>
        )}
        {filtered.map(record => {
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

                {/* Left info */}
                <div className="flex-1 min-w-0">
                  {/* Header row */}
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

                  {/* Yarn details */}
                  <p className="font-display text-sm font-semibold text-[var(--text)] mb-0.5">
                    {record.colour} {record.yarnType}
                  </p>
                  <p className="text-xs text-[var(--text-soft)] font-mono mb-3">
                    {record.supplier} · {record.date}
                  </p>

                  {/* Metrics grid */}
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
                      <ProgressBar value={record.damagePct} color={damageColor(record.damagePct)} />
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {record.verdict === 'rejected' && record.rejectionReason && (
                    <p className="text-xs text-[var(--bad)] font-mono mt-1">
                      ✕ {record.rejectionReason}
                    </p>
                  )}

                  {/* Inspector */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <User size={11} className="text-[var(--text-soft)]" />
                    <span className="text-[10px] font-mono text-[var(--text-soft)]">
                      {record.inspector} · {record.inspectedAt}
                    </span>
                  </div>
                </div>

                {/* Right actions — only for pending */}
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

                {/* Undo for already decided */}
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
        })}
      </div>

      {/* Reject reason modal */}
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
