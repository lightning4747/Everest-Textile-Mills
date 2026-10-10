import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { machines } from '../../data/mockData';

export default function Machines() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{machines.length} machines registered</p>
        <button className="btn-primary text-xs">+ Add Machine</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['ID', 'Name', 'Type', 'Status', 'Order', 'Operator', 'Shift', 'Progress', 'Output Today'].map(h => (
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {machines.map(m => (
              <tr key={m.id} className="border-b border-slate-50 table-row-hover">
                <td className="px-4 py-3 text-xs font-mono text-amber-600 font-semibold">{m.id}</td>
                <td className="px-4 py-3 text-xs font-medium text-slate-800">{m.name}</td>
                <td className="px-4 py-3 text-xs text-slate-500 capitalize">{m.type}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 text-xs font-mono text-sky-600">{m.currentOrder ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{m.operator ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-700 font-medium">{m.shift}</td>
                <td className="px-4 py-3 w-28">
                  <ProgressBar value={m.progress} showLabel thin />
                </td>
                <td className="px-4 py-3 text-xs font-mono text-slate-700">{m.outputToday} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
