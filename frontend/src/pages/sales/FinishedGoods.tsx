import { Package, CheckCircle, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import type { SalesOrder } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';

interface BackendFabricRoll {
  id: string;
  orderId: string;
  metres: number;
  qcResult: string;
}

export default function FinishedGoods() {
  const { data: rawOrders, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useApi<SalesOrder[]>(
    () => api.get<SalesOrder[]>('/sales-orders?limit=200'),
    [],
    { autoPollMs: 15000 }
  );

  const { data: rawRolls, loading: rollsLoading, error: rollsError, refetch: refetchRolls } = useApi<BackendFabricRoll[]>(
    () => api.get<BackendFabricRoll[]>('/fabric-rolls?limit=200'),
    [],
    { autoPollMs: 15000 }
  );

  const salesOrders = rawOrders || [];
  const fabricRolls = rawRolls || [];

  const readyOrders     = salesOrders.filter(o => ['quality_check', 'ready_to_ship', 'dispatched'].includes(o.status));
  const totalFinished   = readyOrders.filter(o => o.status === 'ready_to_ship').reduce((s, o) => s + ((o.items || []).reduce((sum, item) => sum + (item.completedMetres || 0), 0)), 0);
  const passedRolls     = fabricRolls.filter(r => r.qcResult === 'passed');
  const totalPassedMetres = passedRolls.reduce((s, r) => s + (Number(r.metres) || 0), 0);

  const { paginatedData, ...paginationProps } = usePagination(readyOrders, 20);

  const handleRefresh = () => {
    refetchOrders();
    refetchRolls();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)] transition-colors flex items-center gap-1.5 text-xs"
          title="Refresh"
        >
          <RefreshCw size={14} className={ordersLoading || rollsLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {(ordersError || rollsError) && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-xs">
          {ordersError || rollsError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="stat-label mb-1">Cleared Stock</p>
          <p className="font-display text-4xl font-semibold text-[var(--text)]">
            {totalFinished.toLocaleString()} <span className="text-sm font-sans font-normal text-[var(--text-soft)]">m</span>
          </p>
          <p className="text-xs text-[var(--text-soft)] mt-1">Ready for packing &amp; dispatch</p>
        </div>
        <div className="card p-4">
          <p className="stat-label mb-1">QC Cleared Rolls</p>
          <p className="font-display text-4xl font-semibold text-[var(--ok)]">{passedRolls.length}</p>
          <p className="text-xs text-[var(--text-soft)] font-mono mt-1">{totalPassedMetres.toLocaleString()} m inspected &amp; tagged</p>
        </div>
        <div className="card p-4 border-l-4 border-l-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))]">
          <p className="stat-label text-[var(--warn)] mb-1">Awaiting Dispatch Dock</p>
          <p className="font-display text-4xl font-semibold text-[var(--warn)]">
            {salesOrders.filter(o => o.status === 'ready_to_ship').length}
          </p>
          <p className="text-xs text-[var(--text-soft)] mt-1">Consignments queued for freight</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <Package size={16} className="text-[var(--olive-dark)]" />
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">Finished Goods Vault &amp; Staged Rolls</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Order ID</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Buyer</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Fabric</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-left">Colour</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Meters Produced</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Passed Rolls</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-center">Status</th>
                <th className="px-4 py-3 section-title whitespace-nowrap text-right">Delivery Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedData.map(order => {
                const orderRolls = fabricRolls.filter(r => r.orderId === order.id && r.qcResult === 'passed');
                const firstItem = order.items?.[0];
                const totalCompleted = (order.items || []).reduce((sum, item) => sum + (item.completedMetres || 0), 0);
                
                return (
                  <tr key={order.id} className="table-row-hover">
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--olive-dark)] text-left">{order.id}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text)] text-left">{order.buyer}</td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text)] text-left">{(order.items?.length ?? 0) > 1 ? 'Multiple Items' : (firstItem?.product?.fabricType || firstItem?.fabricType || order.fabricType || '')}</td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text-soft)] text-left">{(order.items?.length ?? 0) > 1 ? 'Mixed' : (firstItem?.colour || order.colour || '')}</td>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-[var(--ok)] text-right tabular-nums">
                      {totalCompleted.toLocaleString()} m
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-mono text-[var(--text)]">
                        <CheckCircle size={13} className="text-[var(--ok)]" />
                        <span>{orderRolls.length} rolls</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--text-soft)] text-right">{order.deliveryDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination {...paginationProps} />
      </div>
    </div>
  );
}
