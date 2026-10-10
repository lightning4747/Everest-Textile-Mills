import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { machines } from '../../data/mockData';

const TARGET = 500;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-lg">
        <p className="text-slate-700 font-medium mb-1">{label}</p>
        <p className="text-amber-600">Output: {payload[0]?.value} m</p>
        <p className="text-slate-400">Target: {TARGET} m</p>
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
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Output Today', value: `${totalOutput.toLocaleString()} m` },
          { label: 'Machines Running',   value: `${running.length}/${machines.length}` },
          { label: 'Fleet Efficiency',   value: `${avgEff}%` },
          { label: 'Daily Target',       value: `${(machines.length * TARGET).toLocaleString()} m` },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1">{s.label}</p>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-800">Output vs Target (Today)</p>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>Output</span>
            <span className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-dashed border-red-400 inline-block"></span>Target 500m</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 600]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={TARGET} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Bar dataKey="output" fill="#F59E0B" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Machine Details</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Machine','Type','Status','Current Order','Output Today','Target','Efficiency','Operator'].map(h=>(
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {machines.map(m => {
              const eff = Math.round((m.outputToday / TARGET) * 100);
              return (
                <tr key={m.id} className="border-b border-slate-50 table-row-hover">
                  <td className="px-4 py-3"><p className="text-xs font-mono text-amber-600 font-semibold">{m.id}</p><p className="text-[10px] text-slate-400">{m.name}</p></td>
                  <td className="px-4 py-3 text-xs text-slate-500 capitalize">{m.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3 text-xs font-mono text-sky-600">{m.currentOrder ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-700">{m.outputToday} m</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{TARGET} m</td>
                  <td className="px-4 py-3 w-28"><ProgressBar value={eff} color={eff >= 80 ? 'green' : eff >= 50 ? 'amber' : 'red'} showLabel /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{m.operator ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
