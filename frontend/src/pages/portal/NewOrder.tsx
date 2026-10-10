import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ShoppingCart, Info } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/apiClient';
import type { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function NewOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: products, loading: productsLoading } = useApi<Product[]>(
    () => api.get<Product[]>('/products'),
    []
  );

  const activeProducts = useMemo(() => (products || []).filter(p => p.isActive), [products]);

  const [items, setItems] = useState<{ id: string; productId: string; colour: string; quantityMetres: number }[]>([
    { id: crypto.randomUUID(), productId: '', colour: '', quantityMetres: 1000 }
  ]);
  
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), productId: '', colour: '', quantityMetres: 1000 }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = activeProducts.find(p => p.id === item.productId);
      const price = Number(product?.pricePerMetre) || 0;
      return sum + price * (item.quantityMetres || 0);
    }, 0);
  }, [items, activeProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.productId || !i.quantityMetres || i.quantityMetres <= 0)) {
      setError('Please fill all items with valid product and quantity');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/sales-orders', {
        clientId: user?.id,
        buyer: user?.name || 'Client',
        deliveryDate,
        items: items.map(i => ({
          productId: i.productId,
          colour: i.colour || 'Standard',
          quantityMetres: i.quantityMetres,
        }))
      });
      navigate('/portal/orders');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-[var(--text)]">Place New Order</h2>
        <p className="text-[var(--text-soft)] text-sm mt-1">Configure fabric requirements and submit for production scheduling.</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="section-title block mb-2">Requested Delivery Date *</label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="input-field text-sm font-mono w-full max-w-xs"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Order Lines</h3>
            </div>
            
            {items.map((item, index) => {
              const product = activeProducts.find(p => p.id === item.productId);
              const price = Number(product?.pricePerMetre) || 0;
              const lineTotal = price * (item.quantityMetres || 0);

              return (
                <div key={item.id} className="p-4 bg-[var(--surface-2)]/30 border border-[var(--border)] rounded-lg grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative">
                  <div className="md:col-span-5">
                    <label className="text-xs font-semibold text-[var(--text-soft)] mb-1 block">Fabric Product *</label>
                    <select
                      required
                      value={item.productId}
                      onChange={e => updateItem(item.id, 'productId', e.target.value)}
                      className="input-field text-xs font-mono w-full"
                    >
                      <option value="">-- Select Fabric --</option>
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.id} - {p.name} ({p.gsm} GSM)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-[var(--text-soft)] mb-1 block">Colour/Dye</label>
                    <input
                      type="text"
                      placeholder="e.g. Navy Blue"
                      value={item.colour}
                      onChange={e => updateItem(item.id, 'colour', e.target.value)}
                      className="input-field text-xs font-mono w-full"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-[var(--text-soft)] mb-1 block">Quantity (m) *</label>
                    <input
                      type="number"
                      required
                      min="100"
                      step="100"
                      value={item.quantityMetres}
                      onChange={e => updateItem(item.id, 'quantityMetres', Number(e.target.value))}
                      className="input-field text-xs font-mono w-full"
                    />
                  </div>

                  <div className="md:col-span-2 text-right">
                    <div className="text-xs font-semibold text-[var(--text-soft)] mb-1 block">Line Value</div>
                    <div className="text-sm font-mono font-bold text-[var(--text)]">
                      ₹{lineTotal.toLocaleString()}
                    </div>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="absolute -top-2 -right-2 bg-[var(--surface)] text-red-500 hover:text-red-600 p-1 rounded-full shadow border border-[var(--border)]"
                      title="Remove Line"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
            
            <button
              type="button"
              onClick={addItem}
              className="btn-secondary text-xs flex items-center gap-2 mt-2"
            >
              <Plus size={14} /> Add Line Item
            </button>
          </div>

          <div className="border-t border-[var(--border)] pt-4 flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--text-soft)]">Total Estimated Value:</span>
              <span className="text-2xl font-mono font-bold text-[var(--olive-dark)]">
                ₹{totalAmount.toLocaleString()}
              </span>
            </div>
            
            {error && (
              <div className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <Info size={14} /> {error}
              </div>
            )}
            
            <div className="mt-4">
              <button
                type="submit"
                disabled={isSubmitting || productsLoading || items.length === 0}
                className="btn-primary flex items-center gap-2 px-8 py-3"
              >
                <ShoppingCart size={16} />
                {isSubmitting ? 'Placing Order...' : 'Confirm & Place Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
