import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, formatDate, formatDateTime } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Field } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { Card, TableSkeleton } from '../components/ui/Layout';
import Badge from '../components/Badge';
import { IconPhone, IconUsers, IconTruck, IconPlus } from '../components/icons';

interface CustomerDetail {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string | null;
  type: string;
  address: string;
  status: string;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  followUps: {
    id: string;
    note: string;
    nextFollowDate: string;
    createdAt: string;
    creator: { name: string };
  }[];
  challans: {
    id: string;
    challanNumber: string;
    status: string;
    totalQuantity: number;
    createdAt: string;
  }[];
}

export default function CustomerDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState('');
  const [nextFollowDate, setNextFollowDate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setError('');
    try {
      const res = await api<CustomerDetail>(`/customers/${id}`, { token });
      setCustomer(res);
    } catch (e: any) {
      setError(e.message);
    }
  }, [id, token]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleAddFollowUp = async () => {
    if (!note.trim()) return;
    setSaving(true);
    setError('');
    try {
      const body: any = { note: note.trim() };
      if (nextFollowDate) body.nextFollowDate = new Date(nextFollowDate).toISOString();
      await api(`/customers/${id}/follow-ups`, { method: 'POST', body, token });
      toast('success', 'Follow-up recorded');
      setModalOpen(false);
      setNote('');
      setNextFollowDate('');
      fetchCustomer();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }
  if (!customer) return <TableSkeleton rows={8} cols={3} />;

  const fields = [
    ['Mobile', customer.mobile],
    ['Email', customer.email],
    ['GST Number', customer.gstNumber || '—'],
    ['Address', customer.address || '—'],
    ['Follow-up Date', formatDate(customer.followUpDate)],
    ['Customer Since', formatDate(customer.createdAt)],
  ];

  return (
    <div className="space-y-6">
      <Link to="/customers" className="text-sm font-medium text-blue-700 hover:underline">
        &larr; Back to Customers
      </Link>

      <Card pad={false}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white">
              {customer.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
                <Badge value={customer.status} />
                <Badge value={customer.type} />
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{customer.businessName}</p>
            </div>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <IconPlus size={16} />
            Add Follow-up
          </Button>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
              <dd className="mt-0.5 text-sm text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
        {customer.notes && (
          <div className="mx-6 mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Notes: </span>
            {customer.notes}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Follow-up History" pad={false}>
          {customer.followUps.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <IconUsers size={20} />
              </span>
              <p className="text-sm text-slate-500">No follow-ups recorded yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {customer.followUps.map((f) => (
                <li key={f.id} className="px-5 py-3.5">
                  <p className="text-sm text-slate-700">{f.note}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="font-medium text-slate-500">{f.creator.name}</span> ·
                    {formatDateTime(f.createdAt)} · next {formatDate(f.nextFollowDate)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Sales Challans" pad={false}>
          {customer.challans.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <IconTruck size={20} />
              </span>
              <p className="text-sm text-slate-500">No challans for this customer yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {customer.challans.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <Link to={`/challans/${c.id}`} className="font-medium text-blue-700 hover:underline">
                    {c.challanNumber}
                  </Link>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">Qty {c.totalQuantity}</span>
                    <span className="hidden text-slate-400 sm:block">{formatDate(c.createdAt)}</span>
                    <Badge value={c.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Follow-up" subtitle={`${customer.name}`}>
        <div className="space-y-4">
          <Field label="Note *" htmlFor="fu-note">
            <Textarea
              id="fu-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was discussed?"
            />
          </Field>
          <Field label="Next Follow-up Date" htmlFor="fu-date" hint="Updates the customer's follow-up date">
            <Input
              id="fu-date"
              type="datetime-local"
              value={nextFollowDate}
              onChange={(e) => setNextFollowDate(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} disabled={!note.trim()} onClick={handleAddFollowUp}>
              Save Follow-up
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
