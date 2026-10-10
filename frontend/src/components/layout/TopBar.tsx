import { Bell, Search, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard':             'Dashboard & Operations',
  '/yarn/receipts':         'Yarn Receipts',
  '/yarn/stock':            'Raw Material Stock',
  '/yarn/alerts':           'Low Stock Alerts',
  '/production/machines':   'Machine Fleet',
  '/production/orders':     'Production Orders',
  '/production/shopfloor':  'Shop Floor Board',
  '/quality/checks':        'Quality Assurance Logs',
  '/quality/rolls':         'Fabric Roll Traceability',
  '/quality/pending':       'Pending Inspection Queue',
  '/sales/orders':          'Sales Orders',
  '/sales/status':          'Live Order Status Pipeline',
  '/sales/finished':        'Finished Goods Inventory',
  '/sales/dispatches':      'Dispatch Logistics',
  '/reports/costing':       'Order Costing & Margins',
  '/reports/machines':      'Machine Performance & OEE',
  '/reports/monthly':       'Monthly Production & P&L Summary',
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
    <header className="h-[64px] flex items-center justify-between px-6 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0 z-10">
      {/* Left Title */}
      <div>
        <h1 className="text-lg font-display font-semibold text-[var(--text)] leading-tight">{title}</h1>
        <p className="text-[11px] font-mono text-[var(--text-soft)]">{dateStr} · {timeStr}</p>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <div className="relative hidden md:flex items-center">
          <Search size={13} className="absolute left-3 text-[var(--olive-grey)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search roll, order ref, machine..."
            className="input-field pl-8 pr-3 py-1.5 text-xs w-56 font-mono"
          />
        </div>

        <button
          className="relative p-2 rounded-lg text-[var(--olive-grey)] hover:text-[var(--text)] hover:bg-[var(--sand)] transition-colors"
          title="Alerts"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--bad)] border border-[var(--surface)]"></span>
        </button>

        <div className="h-6 w-px bg-[var(--border)]" />

        <div className="flex items-center gap-2.5 px-2 py-1 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-[var(--sand)] border border-[var(--border)] flex items-center justify-center text-[var(--olive-dark)]">
            <User size={13} />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-[var(--text)] leading-none">Shift Supervisor</p>
            <p className="text-[10px] font-mono text-[var(--text-soft)] leading-tight">Mill Floor A</p>
          </div>
        </div>
      </div>
    </header>
  );
}
