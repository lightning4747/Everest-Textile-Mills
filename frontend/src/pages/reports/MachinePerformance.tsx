import { useMemo, useState } from 'react';
import { Download, Printer, Search } from 'lucide-react';
import { exportCsv } from '../../utils/exportCsv';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { machines } from '../../data/mockData';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';

const TARGET = 500;

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
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

const ALL = 'all';

export default function MachinePerformance() {
  const [search, setSearch]       = useState('');
  const [typeFilter, setType]     = useState(ALL);
  const [statusFilter, setStatus] = useState(ALL);
  const debouncedSearch           = useDebounce(search, 300);

  const types    = [...new Set(machines.map(m => m.type))];
  const statuses = [...new Set(machines.map(m => m.status))];

  const filtered = useMemo(() =>
    machines.filter(m => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch = !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || (m.operator ?? '').toLowerCase().includes(q);
      const matchType   = typeFilter   === ALL || m.type   === typeFilter;
      const matchStatus = statusFilter === ALL || m.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    }),
  [debouncedSearch, typeFilter, statusFilter]);

  const { running, totalOutput, avgEff, chartData } = useMemo(() => {
    const running     = filtered.filter(m => m.status === 'running');
    const totalOutput = filtered.reduce((s, m) => s + m.outputToday, 0);
    const avgEff      = filtered.length ? Math.round((totalOutput / (filtered.length * TARGET)) * 100) : 0;
    const chartData   = filtered.map(m => ({ name: m.id, output: m.outputToday }));
    return { running, totalOutput, avgEff, chartData };
  }, [filtered]);

  const { paginatedData, ...paginationProps } = usePagination(filtered, 20);

  function handleExport() {
    exportCsv(
      `machine-performance${typeFilter !== ALL ? `-${typeFilter}` : ''}${statusFilter !== ALL ? `-${statusFilter}` : ''}.csv`,
      ['Machine ID', 'Name', 'Type', 'Status', 'Current Order', 'Shift Output (m)', 'Target (m)', 'Efficiency (%)', 'Operator'],
      filtered.map(m => [
        m.id, m.name, m.type, m.status,
        m.currentOrder ?? '',
        m.outputToday, TARGET,
        Math.round((m.outputToday / TARGET) * 100),
        m.operator ?? '',
      ]),
    );
  }

  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 print-hide">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Machine Performance &amp; OEE Report</h2>
        <div className="flex items-center gap-2">
          <button className="btn-secondary h-9 text-xs" onClick={handleExport}>
            <Download size={14} /> Export CSV ({filtered.length})
          </button>
          <button className="btn-primary h-9 text-xs" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap print-hide">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-3 text-[var(--text-soft)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search machine, operator..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field h-9 pl-8 pr-3 text-xs font-mono w-52"
          />
        </div>
        <select value={typeFilter} onChange={e => setType(e.target.value)} className="input-field h-9 text-xs font-mono w-36">
          <option value={ALL}>All Types</option>
          {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} className="input-field h-9 text-xs font-mono w-36">
          <option value={ALL}>All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {(typeFilter !== ALL || statusFilter !== ALL || search) && (
          <button className="btn-ghost h-9 text-xs" onClick={() => { setSearch(''); setType(ALL); setStatus(ALL); }}>
            Reset
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Filtered Output',   value: `${totalOutput.toLocaleString()} m`,      accent: 'text-[var(--text)]' },
          { label: 'Running',           value: `${running.length}/${filtered.length}`,   accent: 'text-[var(--ok)]' },
          { label: 'Avg Efficiency',    value: `${avgEff}%`,                             accent: avgEff >= 70 ? 'text-[var(--ok)]' : 'text-[var(--warn)]' },
          { label: 'Filtered Machines', value: `${filtered.length}`,                     accent: 'text-[var(--text-soft)]' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="stat-label mb-1.5">{s.label}</p>
            <p className={`font-display text-3xl md:text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-display font-semibold text-[var(--text)]">Unit Output vs Shift Target</h2>
            <p className="text-xs text-[var(--text-soft)]">Metres produced in current operational shift</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-soft)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--cyprus)] inline-block" />
              Current Output
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 border-t-2 border-dashed border-[var(--cyprus-muted)] inline-block" />
              Target (500m)
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
            <Bar dataKey="output" fill="var(--cyprus)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">Machine Telemetry & Efficiency Log</h2>
          <span className="text-xs font-mono text-[var(--text-soft)]">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-[var(--text-soft)]">No machines match the current filters.</p>
            <button className="btn-ghost mt-3 text-xs" onClick={() => { setSearch(''); setType(ALL); setStatus(ALL); }}>Reset Filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--panel-bg)]">
                  <th className="px-4 py-3 section-title whitespace-nowrap text-left">Machine ID</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-left">Type</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-center">Status</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-left">Current Order</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-right">Shift Output</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-right">Target</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap">Efficiency</th>
                  <th className="px-4 py-3 section-title whitespace-nowrap text-left">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {paginatedData.map(m => {
                  const eff = Math.round((m.outputToday / TARGET) * 100);
                  return (
                    <tr key={m.id} className="table-row-hover">
                      <td className="px-4 py-3.5 text-left">
                        <p className="text-xs font-mono font-bold text-[var(--olive-dark)]">{m.id}</p>
                        <p className="text-[10px] text-[var(--text-soft)]">{m.name}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[var(--text)] capitalize text-left">{m.type}</td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--olive-dark)] text-left">{m.currentOrder ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--text)] text-right tabular-nums">{m.outputToday} m</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right tabular-nums">{TARGET} m</td>
                      <td className="px-4 py-3.5 w-32">
                        <ProgressBar value={eff} color={eff >= 80 ? 'ok' : eff >= 50 ? 'warn' : 'bad'} showLabel />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[var(--text)] text-left">{m.operator ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...paginationProps} />
      </div>
    </div>
  );
}
