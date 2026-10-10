import { Package, ArrowRight } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { fabricRolls, salesOrders, machines } from '../../data/mockData';

export default function FabricRolls() {
  const totalMetres = fabricRolls.reduce((s, r) => s + r.metres, 0);
  const inspectedRolls = fabricRolls.filter(r => r.qcResult !== 'pending');
  const passRate = inspectedRolls.length > 0
    ? Math.round((fabricRolls.filter(r => r.qcResult === 'passed').length / inspectedRolls.length) * 100)
    : 0;
  const rejectRate = inspectedRolls.length > 0
    ? Math.round((fabricRolls.filter(r => r.qcResult === 'rejected').length / inspectedRolls.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rolls',    value: fabricRolls.length,            accent: 'text-[var(--text)]' },
          { label: 'Total Metres',   value: `${totalMetres} m`,            accent: 'text-[var(--text)]' },
          { label: 'QC Pass Rate',   value: `${passRate}%`,                accent: 'text-[var(--ok)]' },
          { label: 'Rejection Rate', value: `${rejectRate}%`,              accent: 'text-[var(--bad)]' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="stat-label mb-1.5">{s.label}</p>
            <p className={`font-display text-3xl md:text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Traceability List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[var(--olive-dark)]" />
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">Roll Lineage & Traceability Chain</h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-soft)]">Order Ref → Machine → Grading Lab</span>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {fabricRolls.map(roll => {
            const order   = salesOrders.find(o => o.id === roll.orderId);
            const machine = machines.find(m => m.id === roll.machineId);
            return (
              <div key={roll.id} className="p-5 table-row-hover">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-[var(--sand)]/50 px-2.5 py-1 rounded-lg border border-[var(--border)]">
                      <Package size={14} className="text-[var(--olive-dark)]" />
                      <span className="text-xs font-mono font-bold text-[var(--olive-dark)]">{roll.id}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      {[
                        { label: 'Order',   value: roll.orderId,              isMono: true },
                        { label: 'Buyer',   value: order?.buyer ?? '—',       isMono: false },
                        { label: 'Machine', value: roll.machineId,            isMono: true },
                        { label: 'Process', value: machine?.type ?? '—',      isMono: false },
                        { label: 'Length',  value: `${roll.metres} m`,        isMono: true },
                      ].map((item, i, arr) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className="bg-[var(--surface)] border border-[var(--border)] rounded px-2.5 py-1">
                            <span className="text-[9px] uppercase tracking-wider text-[var(--text-soft)] block font-semibold">{item.label}</span>
                            <span className={`text-xs text-[var(--text)] font-medium ${item.isMono ? 'font-mono' : ''}`}>{item.value}</span>
                          </div>
                          {i < arr.length - 1 && <ArrowRight size={12} className="text-[var(--olive-grey)]" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] font-mono text-[var(--text-soft)]">{roll.producedDate}</p>
                      {roll.checkedBy && <p className="text-[10px] text-[var(--text)]">Inspector: {roll.checkedBy}</p>}
                      {roll.defects?.length ? (
                        <p className="text-[10px] text-[var(--bad)] font-semibold mt-0.5">{roll.defects.join(', ')}</p>
                      ) : null}
                    </div>
                    <StatusBadge status={roll.qcResult} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
