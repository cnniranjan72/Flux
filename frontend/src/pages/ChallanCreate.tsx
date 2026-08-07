import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, formatMoney } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input, Select, Field } from '../components/ui/Form';
import { useToast } from '../components/ui/Toast';
import { Card, PageHeader, TableSkeleton, EmptyState } from '../components/ui/Layout';
import { IconPlus, IconTrash, IconTruck, IconCheck } from '../components/icons';

interface Customer {
  id: string;
  name: string;
  businessName: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function ChallanCreate() {
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ data: Customer[] }>('/customers?take=100', { token }),
      api<{ data: Product[] }>('/products?take=100', { token }),
    ])
      .then(([c, p]) => {
        setCustomers(c.data);
        setProducts(p.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const addItem = () => {
    if (!selectedProduct) return;
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const quantity = parseInt(qty) || 1;
    if (quantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity }];
    });
    setSelectedProduct('');
    setQty('1');
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const setQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleSubmit = async (status: 'DRAFT' | 'CONFIRMED') => {
    setError('');
    if (!customerId) {
      setError('Please select a customer');
      return toast('error', 'Please select a customer');
    }
    if (cart.length === 0) {
      setError('Add at least one product');
      return toast('error', 'Add at least one product');
    }

    setSubmitting(true);
    try {
      const res = await api<{ id: string }>('/challans', {
        method: 'POST',
        body: {
          customerId,
          status,
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        },
        token,
      });
      toast('success', status === 'CONFIRMED' ? 'Challan confirmed — stock reduced' : 'Challan saved as draft');
      navigate(`/challans/${res.id}`);
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
      setSubmitting(false);
    }
  };

  if (loading) return <TableSkeleton rows={8} cols={4} />;

  const totalQuantity = cart.reduce((s, i) => s + i.quantity, 0);
  const totalValue = cart.reduce((s, i) => s + i.product.unitPrice * i.quantity, 0);

  return (
    <div className="space-y-6">
      <Link to="/challans" className="text-sm font-medium text-blue-700 hover:underline">
        &larr; Back to Challans
      </Link>

      <PageHeader
        title="Create Sales Challan"
        subtitle="Select a customer, add products, then save as draft or confirm (reduces stock)."
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="1 · Select Customer" pad={false}>
            <div className="p-5">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Choose a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.businessName ? `(${c.businessName})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          <Card title="2 · Add Products" pad={false}>
            <div className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="flex-1">
                  <option value="">Choose a product...</option>
                  {products.map((p) => {
                    const inCart = cart.find((i) => i.product.id === p.id)?.quantity ?? 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {p.currentStock - inCart} in stock
                      </option>
                    );
                  })}
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-24"
                  />
                  <Button variant="secondary" onClick={addItem} disabled={!selectedProduct}>
                    <IconPlus size={16} />
                    Add
                  </Button>
                </div>
              </div>

              {cart.length === 0 ? (
                <EmptyState
                  icon={<IconTruck size={20} />}
                  title="Your cart is empty"
                  message="Pick a product and quantity above to add line items."
                />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Product</th>
                        <th className="px-2 py-2">Price</th>
                        <th className="px-2 py-2">Qty</th>
                        <th className="px-2 py-2 text-right">Amount</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((i) => (
                        <tr key={i.product.id}>
                          <td className="px-2 py-2.5">
                            <div className="font-medium text-slate-700">{i.product.name}</div>
                            <div className="text-xs text-slate-400">in stock: {i.product.currentStock}</div>
                          </td>
                          <td className="px-2 py-2.5 text-slate-600">{formatMoney(i.product.unitPrice)}</td>
                          <td className="px-2 py-2.5">
                            <Input
                              type="number"
                              min="1"
                              value={i.quantity}
                              onChange={(e) => setQuantity(i.product.id, parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                          </td>
                          <td className="px-2 py-2.5 text-right font-medium text-slate-700">
                            {formatMoney(i.product.unitPrice * i.quantity)}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <button
                              onClick={() => removeItem(i.product.id)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove item"
                            >
                              <IconTrash size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title="3 · Summary" className="lg:sticky lg:top-24">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Customer</dt>
                <dd className="max-w-[60%] truncate text-right font-medium">
                  {customers.find((c) => c.id === customerId)?.name || 'Not selected'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Line items</dt>
                <dd>{cart.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Total quantity</dt>
                <dd className="font-medium">{totalQuantity}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2.5">
                <dt className="text-slate-500">Total value</dt>
                <dd className="text-base font-bold text-slate-900">{formatMoney(totalValue)}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-2.5">
              <Button variant="secondary" loading={submitting} onClick={() => handleSubmit('DRAFT')}>
                Save as Draft
              </Button>
              <Button variant="success" loading={submitting} onClick={() => handleSubmit('CONFIRMED')}>
                <IconCheck size={16} />
                Confirm &amp; Reduce Stock
              </Button>
              <p className="text-center text-[11px] text-slate-400">
                Confirming checks stock availability and deducts inventory immediately.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
