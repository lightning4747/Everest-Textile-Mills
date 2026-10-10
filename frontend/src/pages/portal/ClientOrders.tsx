import { useState, Fragment } from 'react';
import { Package, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import type { SalesOrder } from '../../types';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function ClientOrders() {
  const { user } = useAuth();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // In a real app we would pass ?clientId=user.id to filter.
  // For now, we fetch all and filter client-side, or assume backend filters by user auth token.
  const { data: rawOrders, loading, error, refetch } = useApi<SalesOrder[]>(
    () => api.get<SalesOrder[]>('/sales-orders'),
    [],
    { autoPollMs: 30000 }
  );

  const orders = (rawOrders || []).filter(o => user?.role === 'client' ? o.clientId === user.id || o.buyer === user.name : true);

  const toggleOrder = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-[var(--text)]">My Orders</h2>
          <p className="text-[var(--text-soft)] text-sm mt-1">Track the production progress of your fabric orders.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-xs">
          {error}
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--text-soft)] font-mono animate-pulse">
          Loading your orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="card py-16 flex flex-col items-center justify-center text-center gap-3">
          <Package size={48} className="text-[var(--olive-grey)]" />
          <p className="text-base font-semibold text-[var(--text)]">No orders found</p>
          <p className="text-sm text-[var(--text-soft)] max-w-sm">You haven't placed any fabric orders yet. Go to Place Order to begin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isExpanded = expandedIds.has(order.id);
            const items = order.items || [];
            const totalQty = items.reduce((s, i) => s + (i.quantityMetres || 0), 0) || 1;
            const totalCompleted = items.reduce((s, i) => s + (i.completedMetres || 0), 0);
            const pct = Math.round((totalCompleted / totalQty) * 100);
            const totalValue = order.totalAmount || 0;

            return (
              <div key={order.id} className="card overflow-hidden">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-2)]/30 transition-colors"
                  onClick={() => toggleOrder(order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[var(--surface-2)] rounded-lg text-[var(--olive-dark)]">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[var(--olive-dark)]">{order.id}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="text-sm text-[var(--text-soft)] mt-1">
                        Placed on {order.createdDate || 'N/A'} • Delivery: {order.deliveryDate}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-xs text-[var(--text-soft)] uppercase tracking-wide">Total Volume</div>
                      <div className="font-mono font-bold text-[var(--text)]">{(totalQty === 1 && items.length === 0) ? 0 : totalQty.toLocaleString()} m</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[var(--text-soft)] uppercase tracking-wide">Value</div>
                      <div className="font-mono font-bold text-[var(--text)]">₹{totalValue.toLocaleString()}</div>
                    </div>
                    <div className="w-32 hidden sm:block">
                      <div className="text-xs text-[var(--text-soft)] uppercase tracking-wide mb-1">Progress</div>
                      <ProgressBar value={pct} color={pct >= 100 ? 'ok' : pct > 50 ? 'warn' : 'default'} showLabel />
                    </div>
                  </div>
                </div>

                {isExpanded && items.length > 0 && (
                  <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/10 p-4">
                    <h4 className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-wider">Line Items</h4>
                    <div className="space-y-3">
                      {items.map(item => {
                        const itemFabric = item.product?.fabricType || item.fabricType || 'N/A';
                        const itemColor = item.colour || '';
                        const itemPct = Math.round(((item.completedMetres || 0) / (item.quantityMetres || 1)) * 100);
                        
                        return (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-[var(--text)]">
                                {itemFabric} {itemColor && <span className="text-[var(--text-soft)]">· {itemColor}</span>}
                              </div>
                              <div className="text-xs font-mono text-[var(--text-soft)] mt-1">Line Ref: {item.id}</div>
                            </div>
                            
                            <div className="flex items-center gap-6 text-right">
                              <div>
                                <div className="text-xs text-[var(--text-soft)]">Qty</div>
                                <div className="text-sm font-mono">{item.quantityMetres?.toLocaleString()} m</div>
                              </div>
                              <div className="w-24">
                                <ProgressBar value={itemPct} color={itemPct >= 100 ? 'ok' : 'default'} />
                                <div className="text-[10px] text-[var(--text-soft)] mt-1 text-right">{item.completedMetres?.toLocaleString()} m done</div>
                              </div>
                              <div className="w-24">
                                <StatusBadge status={item.status} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
