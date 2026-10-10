import { Bell, Search, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard':             'Dashboard',
  '/yarn/receipts':         'Yarn Receipts',
  '/yarn/stock':            'Raw Material Stock',
  '/yarn/alerts':           'Low Stock Alerts',
  '/production/machines':   'Machines',
  '/production/orders':     'Production Orders',
  '/production/shopfloor':  'Shop Floor Board',
  '/quality/checks':        'Quality Checks',
  '/quality/rolls':         'Fabric Rolls',
  '/quality/pending':       'Pending Inspection',
  '/sales/orders':          'Sales Orders',
  '/sales/status':          'Order Status',
  '/sales/finished':        'Finished Goods Stock',
  '/sales/dispatches':      'Dispatches',
  '/reports/costing':       'Order Costing',
  '/reports/machines':      'Machine Performance',
  '/reports/monthly':       'Monthly Summary',
};

export default function TopBar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'Everest Textile Mills';

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="h-[60px] flex items-center justify-between px-6 bg-white border-b border-slate-200 flex-shrink-0">
      {/* Left */}
      <div>
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        <p className="text-[10px] text-slate-400">{dateStr} · {timeStr}</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <div className="relative hidden md:flex items-center">
          <Search size={13} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders, rolls…"
            className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-amber-400 w-48"
          />
        </div>

        <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        </button>

        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
            <User size={12} className="text-amber-600" />
          </div>
          <span className="text-xs text-slate-600 hidden md:block">Admin</span>
        </button>
      </div>
    </header>
  );
}
