import { Bell, Search, User, AlertTriangle, X, ChevronRight, CheckCheck, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/apiClient';

interface StockAlertItem {
  id: string;
  type: string;
  colour: string;
  quantityKg: number;
  reorderLevel: number;
  location: string;
  deficit: number;
  severity: 'critical' | 'warning';
  supplier: string;
}

const pageTitles: Record<string, string> = {
  '/dashboard':             'Dashboard & Operations',
  '/yarn/receipts':         'Yarn Receipts',
  '/yarn/stock':            'Raw Material Stock',
  '/yarn/alerts':           'Low Stock Alerts',
  '/yarn/inspection':       'Yarn Incoming Inspection',
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
  const { user, logout, isAuthenticated } = useAuth();

  const [notifOpen, setNotifOpen]   = useState(false);
  const [readIds,   setReadIds]     = useState<Set<string>>(new Set());
  const [lowItems,  setLowItems]    = useState<StockAlertItem[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLButtonElement>(null);

  // Fetch low-stock yarn items from API
  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get<StockAlertItem[]>('/yarn/stock/alerts');
      setLowItems(res.data || []);
    } catch {
      // Fallback or unauthenticated
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const unreadCount = lowItems.filter(y => !readIds.has(y.id)).length;

  // Toggle panel on bell click; if already open navigate to /yarn/alerts and close
  const handleBellClick = useCallback(() => {
    if (notifOpen) {
      // Second click — navigate to the full alerts page and close panel
      navigate('/yarn/alerts');
      setNotifOpen(false);
    } else {
      setNotifOpen(true);
    }
  }, [notifOpen, navigate]);

  // Mark all as read
  const markAllRead = useCallback(() => {
    setReadIds(new Set(lowItems.map(y => y.id)));
  }, [lowItems]);

  // Close on outside click
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
            onClick={handleBellClick}
            className={`relative p-2 rounded-lg transition-colors ${
              notifOpen
                ? 'bg-[var(--panel-bg)] text-[var(--text)]'
                : 'text-[var(--olive-grey)] hover:text-[var(--text)] hover:bg-[var(--panel-bg)]'
            }`}
            title={notifOpen ? 'Click again to view full alerts page' : `${unreadCount} unread stock alert${unreadCount !== 1 ? 's' : ''}`}
            aria-haspopup="true"
            aria-expanded={notifOpen}
          >
            <Bell size={16} />
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--bad)] border-2 border-[var(--surface)] flex items-center justify-center">
                <span className="text-[9px] font-mono font-bold text-white leading-none">{unreadCount}</span>
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
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-[var(--text-soft)]" />
                  <span className="text-xs font-semibold text-[var(--text)]">Stock Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--panel-bg)] text-[var(--bad)]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Mark all read */}
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-[var(--ok)] hover:bg-[var(--panel-bg)] transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck size={12} /> Mark read
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="p-1 rounded text-[var(--olive-grey)] hover:text-[var(--text)] hover:bg-[var(--panel-bg)] transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Hint */}
              <div className="px-4 pt-2 pb-1">
                <p className="text-[10px] font-mono text-[var(--text-soft)]">
                  Click bell again to open full alerts page ↗
                </p>
              </div>

              {/* Alert Items */}
              {lowItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-[var(--text-soft)]">All yarn stock levels are healthy.</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
                  {lowItems.map(yarn => {
                    const isCritical = yarn.severity === 'critical';
                    const deficit    = yarn.deficit;
                    const isRead     = readIds.has(yarn.id);
                    return (
                      <div
                        key={yarn.id}
                        onClick={() => setReadIds(prev => new Set([...prev, yarn.id]))}
                        className={`px-4 py-3 transition-colors cursor-pointer hover:bg-[var(--panel-bg)] ${isRead ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Unread dot */}
                          <div className="flex-shrink-0 mt-1.5">
                            {!isRead
                              ? <span className="block w-1.5 h-1.5 rounded-full bg-[var(--bad)]" />
                              : <span className="block w-1.5 h-1.5 rounded-full bg-transparent" />
                            }
                          </div>
                          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                            isCritical ? 'bg-[var(--panel-bg)] text-[var(--bad)]' : 'bg-[var(--panel-bg)] text-[var(--warn)]'
                          }`}>
                            <AlertTriangle size={12} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold text-[var(--text)] truncate">{yarn.colour} {yarn.type}</p>
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 border ${
                                isCritical
                                  ? 'text-[var(--bad)] border-[var(--bad)] bg-[var(--panel-bg)]'
                                  : 'text-[var(--warn)] border-[var(--warn)] bg-[var(--panel-bg)]'
                              }`}>
                                {isCritical ? 'CRITICAL' : 'WARNING'}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-[var(--text-soft)] mt-0.5">{yarn.id} · {yarn.location}</p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] font-mono tabular-nums">
                              <span className={`font-bold ${isCritical ? 'text-[var(--bad)]' : 'text-[var(--warn)]'}`}>
                                {yarn.quantityKg.toLocaleString()} kg
                              </span>
                              <span className="text-[var(--text-soft)]">↓ {deficit.toLocaleString()} kg short</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--panel-bg)]">
                <button
                  onClick={() => { navigate('/yarn/alerts'); setNotifOpen(false); }}
                  className="w-full flex items-center justify-between text-xs font-semibold text-[var(--cyprus)] hover:text-[var(--text)] transition-colors"
                >
                  <span>View all {lowItems.length} alerts in detail</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-[var(--border)]" />

        {/* User profile & quick logout */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--panel-bg)] transition-colors">
          <div className="w-7 h-7 rounded-full bg-[var(--panel-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--olive-dark)]">
            <User size={13} />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-[var(--text)] leading-none">{user?.name ?? 'Shift Supervisor'}</p>
            <p className="text-[10px] font-mono text-[var(--text-soft)] leading-tight capitalize">{user?.role ? `${user.role.replace('_', ' ')} · Mill Floor` : 'Mill Floor A'}</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Sign Out"
              className="ml-1 p-1 text-[var(--text-soft)] hover:text-[var(--bad)] transition-colors rounded"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
