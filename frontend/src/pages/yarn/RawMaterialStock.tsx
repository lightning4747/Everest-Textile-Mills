import { AlertTriangle, MapPin } from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import { yarnStock } from '../../data/mockData';

export default function RawMaterialStock() {
  const totalKg = yarnStock.reduce((s, y) => s + y.quantityKg, 0);
  const lowStockItems = yarnStock.filter(y => y.quantityKg <= y.reorderLevel);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="stat-label mb-1">Total Stock</p>
          <p className="stat-value">{totalKg.toLocaleString()} <span className="text-sm text-slate-400">kg</span></p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1">Yarn Types</p>
          <p className="stat-value">{yarnStock.length}</p>
        </div>
        <div className={`card p-4 ${lowStockItems.length > 0 ? 'border-amber-200 bg-amber-50' : ''}`}>
          <p className="stat-label mb-1">Low Stock</p>
          <p className={`stat-value ${lowStockItems.length > 0 ? 'text-amber-600' : ''}`}>{lowStockItems.length}</p>
          {lowStockItems.length > 0 && <p className="text-xs text-amber-500 mt-0.5">items need reorder</p>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Yarn Inventory</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['ID','Type','Colour','Stock (kg)','Reorder Level','Stock Level','Location','Last Updated'].map(h=>(
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yarnStock.map(yarn => {
              const pct = Math.min(100, Math.round((yarn.quantityKg / (yarn.reorderLevel * 4)) * 100));
              const isLow      = yarn.quantityKg <= yarn.reorderLevel;
              const isCritical = yarn.quantityKg <= yarn.reorderLevel * 0.4;
              return (
                <tr key={yarn.id} className={`border-b border-slate-50 table-row-hover ${isLow ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{yarn.id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{yarn.type}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{yarn.colour}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono font-bold ${isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                        {yarn.quantityKg.toLocaleString()}
                      </span>
                      {isLow && <AlertTriangle size={12} className={isCritical ? 'text-red-500' : 'text-amber-500'} />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{yarn.reorderLevel.toLocaleString()}</td>
                  <td className="px-4 py-3 w-36">
                    <ProgressBar value={pct} color={isCritical ? 'red' : isLow ? 'amber' : 'green'} showLabel />
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={11} />{yarn.location}</div></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{yarn.lastUpdated}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
