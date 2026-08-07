import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, formatMoney } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input, Select, Field } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { Card, PageHeader, EmptyState, TableSkeleton, Th } from '../components/ui/Layout';
import Pagination from '../components/Pagination';
import { IconBox, IconPlus, IconSearch, IconEdit, IconRefresh } from '../components/icons';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
}

const EMPTY_FORM = {
  name: '',
  sku: '',
  category: '',
  unitPrice: '',
  currentStock: '',
  minStockAlert: '',
  location: '',
};

export default function Products() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState({ movementType: 'IN', quantityChanged: '', reason: '' });
  const [stockSaving, setStockSaving] = useState(false);

  const take = 10;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: String(take), skip: String((page - 1) * take) });
      if (search) params.set('search', search);
      if (lowStockOnly) params.set('lowStock', 'true');
      const res = await api<{ data: Product[]; total: number }>(`/products?${params.toString()}`, { token });
      setProducts(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, lowStockOnly]);

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(), 250);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitPrice: String(p.unitPrice),
      currentStock: String(p.currentStock),
      minStockAlert: String(p.minStockAlert),
      location: p.location,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        unitPrice: parseFloat(form.unitPrice) || 0,
        currentStock: parseInt(form.currentStock) || 0,
        minStockAlert: parseInt(form.minStockAlert) || 0,
        location: form.location,
      };
      if (editing) {
        await api(`/products/${editing.id}`, { method: 'PUT', body, token });
        toast('success', 'Product updated');
      } else {
        await api('/products', { method: 'POST', body, token });
        toast('success', 'Product added');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStock = async () => {
    if (!stockTarget) return;
    setStockSaving(true);
    setError('');
    try {
      await api('/products/stock-movements', {
        method: 'POST',
        body: {
          productId: stockTarget.id,
          movementType: stockForm.movementType,
          quantityChanged: parseInt(stockForm.quantityChanged),
          reason: stockForm.reason,
        },
        token,
      });
      toast(
        'success',
        `Stock ${stockForm.movementType === 'IN' ? 'added' : 'removed'} — ${stockTarget.name}`
      );
      setStockTarget(null);
      setStockForm({ movementType: 'IN', quantityChanged: '', reason: '' });
      fetchProducts();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setStockSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products & Inventory"
        subtitle={`${total} products in stock`}
        actions={
          <Button onClick={openCreate}>
            <IconPlus size={16} />
            Add Product
          </Button>
        }
      />

      <Card pad={false}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or SKU..."
              className="pl-9"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Low stock only
          </label>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<IconBox size={22} />}
            title="No products found"
            message={search || lowStockOnly ? 'Try adjusting your filters.' : 'Add your first product to track inventory.'}
            action={
              !search && !lowStockOnly ? (
                <Button onClick={openCreate}>
                  <IconPlus size={16} />
                  Add Product
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Product</Th>
                  <Th>SKU</Th>
                  <Th>Category</Th>
                  <Th>Unit Price</Th>
                  <Th>Stock</Th>
                  <Th>Location</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const low = p.currentStock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link to={`/products/${p.id}`} className="font-medium text-blue-700 hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                      <td className="px-4 py-3 text-slate-600">{p.category}</td>
                      <td className="px-4 py-3 text-slate-600">{formatMoney(p.unitPrice)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            low ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {p.currentStock}
                          {low && <span className="text-[10px] font-medium">low</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{p.location || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setStockTarget(p);
                              setStockForm({ movementType: 'IN', quantityChanged: '', reason: '' });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                            title="Adjust stock"
                          >
                            <IconRefresh size={12} />
                            Stock
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                            title="Edit product"
                          >
                            <IconEdit size={12} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Product' : 'Add Product'}
        subtitle={editing ? `Editing ${editing.name}` : 'Create a new product'}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Product Name *" htmlFor="p-name">
              <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          </div>
          <Field label="SKU *" htmlFor="p-sku">
            <Input id="p-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </Field>
          <Field label="Category *" htmlFor="p-cat">
            <Input id="p-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Unit Price (₹)" htmlFor="p-price">
            <Input id="p-price" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          </Field>
          <Field label={editing ? 'Current Stock' : 'Initial Stock'} htmlFor="p-stock">
            <Input
              id="p-stock"
              type="number"
              value={form.currentStock}
              onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
              disabled={!!editing}
            />
          </Field>
          <Field label="Min Stock Alert" htmlFor="p-min">
            <Input id="p-min" type="number" value={form.minStockAlert} onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })} />
          </Field>
          <Field label="Location" htmlFor="p-loc">
            <Input id="p-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!form.name || !form.sku || !form.category} onClick={handleSubmit}>
            {editing ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!stockTarget}
        onClose={() => setStockTarget(null)}
        title="Stock Adjustment"
        subtitle={`${stockTarget?.name} · current stock: ${stockTarget?.currentStock}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Movement Type" htmlFor="sm-type">
              <Select
                id="sm-type"
                value={stockForm.movementType}
                onChange={(e) => setStockForm({ ...stockForm, movementType: e.target.value })}
              >
                <option value="IN">Stock In (+)</option>
                <option value="OUT">Stock Out (−)</option>
              </Select>
            </Field>
            <Field label="Quantity" htmlFor="sm-qty">
              <Input
                id="sm-qty"
                type="number"
                min="1"
                value={stockForm.quantityChanged}
                onChange={(e) => setStockForm({ ...stockForm, quantityChanged: e.target.value })}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Reason *" htmlFor="sm-reason" hint="e.g. Manual restock, damaged goods, returns">
                <Input
                  id="sm-reason"
                  value={stockForm.reason}
                  onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                  placeholder="Why is this stock moving?"
                />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setStockTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={stockSaving}
              disabled={!stockForm.quantityChanged || parseInt(stockForm.quantityChanged) <= 0 || !stockForm.reason}
              onClick={handleStock}
            >
              Record Movement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
