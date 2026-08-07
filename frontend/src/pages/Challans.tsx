import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, formatDate } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Form';
import { ConfirmDialog } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { Card, PageHeader, EmptyState, TableSkeleton, Th } from '../components/ui/Layout';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import { IconTruck, IconPlus, IconCheck, IconAlertTriangle } from '../components/icons';

interface Challan {
  id: string;
  challanNumber: string;
  status: string;
  totalQuantity: number;
  createdAt: string;
  customer: { id: string; name: string; businessName: string };
  creator: { id: string; name: string };
}

export default function Challans() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; number: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; number: string } | null>(null);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';
  const canConfirm = user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'WAREHOUSE';

  const take = 10;

  const fetchChallans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: String(take), skip: String((page - 1) * take) });
      if (status) params.set('status', status);
      const res = await api<{ data: Challan[]; total: number }>(`/challans?${params.toString()}`, { token });
      setChallans(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, status]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  const confirmChallan = async () => {
    if (!confirmTarget) return;
    setBusyId(confirmTarget.id);
    setError('');
    try {
      await api(`/challans/${confirmTarget.id}/confirm`, { method: 'PUT', token });
      toast('success', `${confirmTarget.number} confirmed — stock reduced`);
      setConfirmTarget(null);
      fetchChallans();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setBusyId('');
    }
  };

  const cancelChallan = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    setError('');
    try {
      await api(`/challans/${cancelTarget.id}/cancel`, { method: 'PUT', token });
      toast('info', `${cancelTarget.number} cancelled`);
      setCancelTarget(null);
      fetchChallans();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setBusyId('');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Challans"
        subtitle={`${total} challans recorded`}
        actions={
          canCreate ? (
            <Link to="/challans/new">
              <Button>
                <IconPlus size={16} />
                New Challan
              </Button>
            </Link>
          ) : undefined
        }
      />

      <Card pad={false}>
        <div className="border-b border-slate-100 p-4">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-48"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : challans.length === 0 ? (
          <EmptyState
            icon={<IconTruck size={22} />}
            title="No challans found"
            message={status ? 'No challans with this status.' : 'Create your first sales challan to get started.'}
            action={
              !status && canCreate ? (
                <Link to="/challans/new">
                  <Button>
                    <IconPlus size={16} />
                    New Challan
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Challan No</Th>
                  <Th>Customer</Th>
                  <Th>Qty</Th>
                  <Th>Created By</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {challans.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/challans/${c.id}`} className="font-semibold text-blue-700 hover:underline">
                        {c.challanNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/customers/${c.customer.id}`} className="text-slate-700 hover:underline">
                        {c.customer.name}
                      </Link>
                      {c.customer.businessName && (
                        <div className="text-xs text-slate-400">{c.customer.businessName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{c.totalQuantity}</td>
                    <td className="px-4 py-3 text-slate-600">{c.creator.name}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge value={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link
                          to={`/challans/${c.id}`}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                        >
                          View
                        </Link>
                        {c.status === 'DRAFT' && canConfirm && (
                          <button
                            onClick={() => setConfirmTarget({ id: c.id, number: c.challanNumber })}
                            disabled={busyId === c.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 transition hover:bg-green-50 disabled:opacity-40"
                          >
                            <IconCheck size={12} />
                            Confirm
                          </button>
                        )}
                        {c.status === 'DRAFT' && canCreate && (
                          <button
                            onClick={() => setCancelTarget({ id: c.id, number: c.challanNumber })}
                            disabled={busyId === c.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />

      <ConfirmDialog
        open={!!confirmTarget}
        title="Confirm Challan"
        message={`Confirm ${confirmTarget?.number}? Product stock will be deducted immediately. This action cannot be undone.`}
        confirmLabel="Confirm & Reduce Stock"
        tone="success"
        loading={busyId === confirmTarget?.id}
        onConfirm={confirmChallan}
        onCancel={() => setConfirmTarget(null)}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Challan"
        message={`Cancel ${cancelTarget?.number}? Only draft challans can be cancelled.`}
        confirmLabel="Cancel Challan"
        tone="danger"
        loading={busyId === cancelTarget?.id}
        onConfirm={cancelChallan}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
