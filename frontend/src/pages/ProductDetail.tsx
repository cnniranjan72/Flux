import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, formatDateTime, formatMoney } from '../lib/api';
import Badge from '../components/Badge';
import { Card, TableSkeleton, Th } from '../components/ui/Layout';
import { IconBox, IconAlertTriangle } from '../components/icons';

interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  createdAt: string;
  stockMovements: {
    id: string;
    quantityChanged: number;
    movementType: string;
    reason: string;
    createdAt: string;
    user: { name: string };
  }[];
}

export default function ProductDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState('');

  const fetchProduct = useCallback(async () => {
    setError('');
    try {
      const res = await api<ProductDetail>(`/products/${id}`, { token });
      setProduct(res);
    } catch (e: any) {
      setError(e.message);
    }
  }, [id, token]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }
  if (!product) return <TableSkeleton rows={8} cols={4} />;

  const low = product.currentStock <= product.minStockAlert;

  const fields = [
    ['Category', product.category],
    ['Unit Price', formatMoney(product.unitPrice)],
    ['Current Stock', String(product.currentStock)],
    ['Min Stock Alert', String(product.minStockAlert)],
    ['Location', product.location || '—'],
    ['Added On', formatDateTime(product.createdAt)],
  ];

  return (
    <div className="space-y-6">
      <Link to="/products" className="text-sm font-medium text-blue-700 hover:underline">
        &larr; Back to Products
      </Link>

      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <IconBox size={22} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">{product.sku}</span>
              {low && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  <IconAlertTriangle size={12} />
                  Low stock alert
                </span>
              )}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 sm:grid-cols-3 lg:grid-cols-6">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
              <dd className="mt-0.5 text-sm text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Stock Movement History" pad={false}>
        {product.stockMovements.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <IconBox size={20} />
            </span>
            <p className="text-sm text-slate-500">No movements recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Type</Th>
                  <Th>Quantity</Th>
                  <Th>Reason</Th>
                  <Th>By</Th>
                  <Th>Timestamp</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.stockMovements.map((m) => (
                  <tr key={m.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Badge value={m.movementType} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{m.quantityChanged}</td>
                    <td className="px-4 py-3 text-slate-600">{m.reason}</td>
                    <td className="px-4 py-3 text-slate-600">{m.user.name}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
