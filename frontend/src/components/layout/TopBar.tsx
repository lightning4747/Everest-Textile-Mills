import { Bell, Search, User, AlertTriangle, X, ChevronRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { yarnStock } from '../../data/mockData';

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
  const navigate = useNavigate();
  const title = pageTitles[location.pathname] ?? 'Everest Textile Mills';

  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLButtonElement>(null);

  // Compute low-stock alerts from mock data
  const lowItems   = yarnStock.filter(y => y.quantityKg <= y.reorderLevel);
  const critical   = lowItems.filter(y => y.quantityKg <= y.reorderLevel * 0.4);
  const alertCount = lowItems.length;

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current  && !bellRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

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

        {/* Notification Bell */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setNotifOpen(o => !o)}
            className={`relative p-2 rounded-lg transition-colors ${notifOpen ? 'bg-[var(--sand)] text-[var(--text)]' : 'text-[var(--olive-grey)] hover:text-[var(--text)] hover:bg-[var(--sand)]'}`}
            title={`${alertCount} stock alert${alertCount !== 1 ? 's' : ''}`}
            aria-haspopup="true"
            aria-expanded={notifOpen}
          >
            <Bell size={16} />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--bad)] border-2 border-[var(--surface)] flex items-center justify-center">
                <span className="text-[9px] font-mono font-bold text-white leading-none">{alertCount}</span>
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {notifOpen && (
            <div
              ref={panelRef}
              className="absolute right-0 top-[calc(100%+8px)] w-80 rounded-xl shadow-xl border border-[var(--border)] bg-[var(--surface)] z-50 overflow-hidden"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-[var(--text-soft)]" />
                  <span className="text-xs font-semibold text-[var(--text)]">Stock Alerts</span>
                  {alertCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[color-mix(in_srgb,var(--bad)_12%,var(--surface))] text-[var(--bad)]">
                      {alertCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="p-1 rounded text-[var(--olive-grey)] hover:text-[var(--text)] hover:bg-[var(--sand)] transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Alert Items */}
              {alertCount === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-[var(--text-soft)]">All yarn stock levels are healthy.</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
                  {lowItems.map(yarn => {
                    const isCritical = yarn.quantityKg <= yarn.reorderLevel * 0.4;
                    const deficit    = Math.max(0, yarn.reorderLevel - yarn.quantityKg);
                    return (
                      <div key={yarn.id} className="px-4 py-3 hover:bg-[var(--sand)] transition-colors cursor-default">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${isCritical ? 'bg-[color-mix(in_srgb,var(--bad)_12%,var(--surface))] text-[var(--bad)]' : 'bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-[var(--warn)]'}`}>
                            <AlertTriangle size={12} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold text-[var(--text)] truncate">{yarn.colour} {yarn.type}</p>
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isCritical ? 'bg-[color-mix(in_srgb,var(--bad)_10%,var(--surface))] text-[var(--bad)]' : 'bg-[color-mix(in_srgb,var(--warn)_10%,var(--surface))] text-[var(--warn)]'}`}>
                                {isCritical ? 'CRITICAL' : 'WARNING'}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-[var(--text-soft)] mt-0.5">{yarn.id} · {yarn.location}</p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] font-mono tabular-nums">
                              <span className={`font-bold ${isCritical ? 'text-[var(--bad)]' : 'text-[var(--warn)]'}`}>{yarn.quantityKg.toLocaleString()} kg on hand</span>
                              <span className="text-[var(--text-soft)]">↓ {deficit.toLocaleString()} kg short</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Panel Footer */}
              {alertCount > 0 && (
                <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--sand)]">
                  <button
                    onClick={() => { navigate('/yarn/alerts'); setNotifOpen(false); }}
                    className="w-full flex items-center justify-between text-xs font-semibold text-[var(--cyprus)] hover:text-[var(--text)] transition-colors"
                  >
                    <span>View all {alertCount} alerts in detail</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
