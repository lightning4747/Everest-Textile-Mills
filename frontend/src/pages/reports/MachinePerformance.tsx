import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { machines } from '../../data/mockData';

const TARGET = 500;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="card p-3 text-xs shadow-md border border-[var(--border)]">
        <p className="text-[var(--text)] font-semibold mb-1 font-mono">{label}</p>
        <p className="text-[var(--olive-dark)] font-mono">Shift Output: {payload[0]?.value} m</p>
        <p className="text-[var(--text-soft)] font-mono">Shift Target: {TARGET} m</p>
      </div>
    );
  }
  return null;
};

export default function MachinePerformance() {
  const running     = machines.filter(m => m.status === 'running');
  const totalOutput = machines.reduce((s, m) => s + m.outputToday, 0);
  const avgEff      = Math.round((totalOutput / (machines.length * TARGET)) * 100);

  const chartData = machines.map(m => ({ name: m.id, output: m.outputToday }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Output Today', value: `${totalOutput.toLocaleString()} m`, accent: 'text-[var(--text)]' },
          { label: 'Machines Running',   value: `${running.length}/${machines.length}`, accent: 'text-[var(--ok)]' },
          { label: 'Fleet Efficiency',   value: `${avgEff}%`,                           accent: avgEff >= 70 ? 'text-[var(--ok)]' : 'text-[var(--warn)]' },
          { label: 'Daily Fleet Target', value: `${(machines.length * TARGET).toLocaleString()} m`, accent: 'text-[var(--text-soft)]' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="stat-label mb-1.5">{s.label}</p>
            <p className={`font-display text-3xl md:text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-display font-semibold text-[var(--text)]">Unit Output vs Shift Target</h2>
            <p className="text-xs text-[var(--text-soft)]">Metres produced in current operational shift</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-soft)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--cyprus)] inline-block"></span>
              Current Output
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 border-t-2 border-dashed border-[var(--cyprus-muted)] inline-block"></span>
              Standard Target (500m)
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--cyprus-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--cyprus-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} domain={[0, 600]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={TARGET} stroke="var(--bad)" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="output" fill="var(--cyprus)" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">Machine Telemetry & Efficiency Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                {['Machine ID','Type','Status','Current Order','Shift Output','Target','Efficiency %','Operator'].map(h=>(
                  <th key={h} className="px-4 py-3 section-title whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {machines.map(m => {
                const eff = Math.round((m.outputToday / TARGET) * 100);
                return (
                  <tr key={m.id} className="table-row-hover">
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-mono font-bold text-[var(--olive-dark)]">{m.id}</p>
                      <p className="text-[10px] text-[var(--text-soft)]">{m.name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text)] capitalize">{m.type}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--olive-dark)]">{m.currentOrder ?? '—'}</td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--text)]">{m.outputToday} m</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)]">{TARGET} m</td>
                    <td className="px-4 py-3.5 w-32">
                      <ProgressBar value={eff} color={eff >= 80 ? 'ok' : eff >= 50 ? 'warn' : 'bad'} showLabel />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text)]">{m.operator ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
