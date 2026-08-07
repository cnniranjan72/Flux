import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, downloadBlob, formatDateTime, formatMoney } from '../lib/api';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { Card, TableSkeleton, Th } from '../components/ui/Layout';
import Badge from '../components/Badge';
import { IconDownload, IconCheck, IconAlertTriangle, IconFileText, IconPackage } from '../components/icons';

interface ChallanDetail {
  id: string;
  challanNumber: string;
  status: string;
  totalQuantity: number;
  productSnapshot: any[];
  createdAt: string;
  customer: {
    id: string;
    name: string;
    businessName: string;
    mobile: string;
    email: string;
    address: string;
    gstNumber: string | null;
  };
  creator: { id: string; name: string; role: string };
  items: {
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      sku: string;
      unitPrice: number;
    };
  }[];
}

export default function ChallanDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [challan, setChallan] = useState<ChallanDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canConfirm = user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'WAREHOUSE';
  const canCancel = user?.role === 'ADMIN' || user?.role === 'SALES';

  const fetchChallan = useCallback(async () => {
    setError('');
    try {
      const res = await api<ChallanDetail>(`/challans/${id}`, { token });
      setChallan(res);
    } catch (e: any) {
      setError(e.message);
    }
  }, [id, token]);

  useEffect(() => {
    fetchChallan();
  }, [fetchChallan]);

  const confirm = async () => {
    if (!challan) return;
    setBusy(true);
    setError('');
    try {
      await api(`/challans/${challan.id}/confirm`, { method: 'PUT', token });
      toast('success', `${challan.challanNumber} confirmed — stock reduced`);
      setConfirmOpen(false);
      fetchChallan();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!challan) return;
    setBusy(true);
    setError('');
    try {
      await api(`/challans/${challan.id}/cancel`, { method: 'PUT', token });
      toast('info', `${challan.challanNumber} cancelled`);
      setCancelOpen(false);
      fetchChallan();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadInvoice = async () => {
    if (!challan) return;
    setDownloading(true);
    try {
      await downloadBlob(`/challans/${challan.id}/invoice`, token, `${challan.challanNumber}.pdf`);
      toast('success', 'Invoice downloaded');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }
  if (!challan) return <TableSkeleton rows={8} cols={4} />;

  const totalValue = challan.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="space-y-6">
      <Link to="/challans" className="text-sm font-medium text-blue-700 hover:underline">
        &larr; Back to Challans
      </Link>

      <Card pad={false}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                <IconFileText size={22} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{challan.challanNumber}</h1>
                  <Badge value={challan.status} />
                </div>
                <p className="mt-0.5 text-sm text-slate-500">Created {formatDateTime(challan.createdAt)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" loading={downloading} onClick={downloadInvoice}>
              <IconDownload size={16} />
              Invoice PDF
            </Button>
            {challan.status === 'DRAFT' && (
              <>
                {canCancel && (
                  <Button variant="secondary" onClick={() => setCancelOpen(true)}>
                    Cancel
                  </Button>
                )}
                {canConfirm && (
                  <Button variant="success" onClick={() => setConfirmOpen(true)}>
                    <IconCheck size={16} />
                    Confirm
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bill To</h2>
            <Link to={`/customers/${challan.customer.id}`} className="text-base font-semibold text-slate-800 hover:text-blue-700">
              {challan.customer.name}
            </Link>
            {challan.customer.businessName && (
              <div className="text-sm text-slate-600">{challan.customer.businessName}</div>
            )}
            <div className="mt-2 space-y-0.5 text-sm text-slate-600">
              <div>{challan.customer.mobile}</div>
              <div>{challan.customer.email}</div>
              <div>{challan.customer.address}</div>
              {challan.customer.gstNumber && <div className="font-medium">GST: {challan.customer.gstNumber}</div>}
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Details</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Created by</dt>
                <dd>
                  {challan.creator.name} <span className="text-slate-400">({challan.creator.role})</span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Total quantity</dt>
                <dd className="font-medium">{challan.totalQuantity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Total value</dt>
                <dd className="text-base font-bold text-slate-900">{formatMoney(totalValue)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      <Card title="Items" pad={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Unit Price</Th>
                <Th>Qty</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {challan.items.map((i) => (
                <tr key={i.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/products/${i.product.id}`} className="font-medium text-slate-700 hover:text-blue-700">
                      {i.product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{i.product.sku}</td>
                  <td className="px-4 py-3 text-slate-600">{formatMoney(i.price)}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{i.quantity}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{formatMoney(i.price * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {challan.productSnapshot && challan.productSnapshot.length > 0 && (
        <Card
          title="Product Snapshot"
          pad={false}
        >
          <p className="border-b border-slate-100 px-5 py-2 text-xs text-slate-400">
            Prices and details as recorded when this challan was created.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Name</Th>
                  <Th>SKU</Th>
                  <Th>Category</Th>
                  <Th>Unit Price</Th>
                  <Th>Stock at Time</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {challan.productSnapshot.map((p: any) => (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3 text-slate-600">{p.category}</td>
                    <td className="px-4 py-3 text-slate-600">{formatMoney(p.unitPrice)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.currentStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Challan"
        message={`Confirm ${challan.challanNumber}? Product stock will be deducted immediately. This action cannot be undone.`}
        confirmLabel="Confirm & Reduce Stock"
        tone="success"
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel Challan"
        message={`Cancel ${challan.challanNumber}? Only draft challans can be cancelled.`}
        confirmLabel="Cancel Challan"
        tone="danger"
        loading={busy}
        onConfirm={cancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}
