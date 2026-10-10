import { AlertTriangle, MapPin } from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import { yarnStock } from '../../data/mockData';

export default function RawMaterialStock() {
  const totalKg = yarnStock.reduce((s, y) => s + y.quantityKg, 0);
  const lowStockItems = yarnStock.filter(y => y.quantityKg <= y.reorderLevel);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="stat-label mb-1">Total Warehouse Stock</p>
          <p className="font-display text-4xl font-semibold text-[var(--text)]">
            {totalKg.toLocaleString()} <span className="text-sm font-sans font-normal text-[var(--text-soft)]">kg</span>
          </p>
        </div>
        <div className="card p-5">
          <p className="stat-label mb-1">Active Yarn Varieties</p>
          <p className="font-display text-4xl font-semibold text-[var(--text)]">{yarnStock.length}</p>
        </div>
        <div className="card p-5">
          <p className="stat-label mb-1">Low Stock Alerts</p>
          <p className={`font-display text-4xl font-semibold ${lowStockItems.length > 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
            {lowStockItems.length}
          </p>
          {lowStockItems.length > 0 && <p className="text-xs text-[var(--text-soft)] mt-1">counts below safety stock</p>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">Raw Material Inventory Ledgers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                {['Stock ID','Fiber Type','Colour','Current Qty (kg)','Reorder Level','Stock Level','Warehouse Bin','Last Verified'].map(h=>(
                  <th key={h} className="px-4 py-3 section-title whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {yarnStock.map(yarn => {
                const pct = Math.min(100, Math.round((yarn.quantityKg / (yarn.reorderLevel * 4)) * 100));
                const isLow      = yarn.quantityKg <= yarn.reorderLevel;
                const isCritical = yarn.quantityKg <= yarn.reorderLevel * 0.4;
                return (
                  <tr key={yarn.id} className="table-row-hover">
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)]">{yarn.id}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)]">{yarn.type}</td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text-soft)]">{yarn.colour}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-bold ${isCritical ? 'text-[var(--bad)]' : isLow ? 'text-[var(--warn)]' : 'text-[var(--text)]'}`}>
                          {yarn.quantityKg.toLocaleString()}
                        </span>
                        {isLow && <AlertTriangle size={13} className={isCritical ? 'text-[var(--bad)]' : 'text-[var(--warn)]'} />}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)]">{yarn.reorderLevel.toLocaleString()}</td>
                    <td className="px-4 py-3.5 w-36">
                      <ProgressBar value={pct} color={isCritical ? 'bad' : isLow ? 'warn' : 'ok'} showLabel />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
                        <MapPin size={12} className="text-[var(--olive-grey)]" />
                        <span className="font-mono">{yarn.location}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)]">{yarn.lastUpdated}</td>
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
