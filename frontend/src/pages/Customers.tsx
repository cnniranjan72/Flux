import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, formatDate } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input, Select, Field } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { Card, PageHeader, EmptyState, TableSkeleton, Th } from '../components/ui/Layout';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import { IconUsers, IconPlus, IconSearch } from '../components/icons';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  type: string;
  status: string;
  followUpDate: string | null;
  createdAt: string;
  _count?: { followUps: number; challans: number };
}

const EMPTY_FORM = {
  name: '',
  mobile: '',
  email: '',
  businessName: '',
  gstNumber: '',
  type: 'Retail',
  address: '',
  status: 'LEAD',
  followUpDate: '',
  notes: '',
};

const inputDark = '';

export default function Customers() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const take = 10;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: String(take), skip: String((page - 1) * take) });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await api<{ data: Customer[]; total: number }>(`/customers?${params.toString()}`, { token });
      setCustomers(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, status]);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(), 250);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      mobile: c.mobile,
      email: c.email,
      businessName: c.businessName || '',
      gstNumber: '',
      type: c.type,
      address: '',
      status: c.status,
      followUpDate: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const body: any = {
        name: form.name,
        mobile: form.mobile,
        email: form.email,
        businessName: form.businessName,
        gstNumber: form.gstNumber || null,
        type: form.type,
        address: form.address,
        status: form.status,
        notes: form.notes || null,
      };
      if (form.followUpDate) body.followUpDate = new Date(form.followUpDate).toISOString();

      if (editing) {
        await api(`/customers/${editing.id}`, { method: 'PUT', body, token });
        toast('success', 'Customer updated successfully');
      } else {
        await api('/customers', { method: 'POST', body, token });
        toast('success', 'Customer added successfully');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        subtitle={`${total} customer${total === 1 ? '' : 's'} in your CRM`}
        actions={
          <Button onClick={openCreate}>
            <IconPlus size={16} />
            Add Customer
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
              placeholder="Search by name, email, mobile..."
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="sm:w-44"
          >
            <option value="">All statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<IconUsers size={22} />}
            title="No customers found"
            message={search || status ? 'Try adjusting your search or filters.' : 'Add your first customer to get started.'}
            action={
              !search && !status ? (
                <Button onClick={openCreate}>
                  <IconPlus size={16} />
                  Add Customer
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Customer</Th>
                  <Th>Contact</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Follow-up</Th>
                  <Th className="text-right">Challans</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/customers/${c.id}`} className="font-medium text-blue-700 hover:underline">
                        {c.name}
                      </Link>
                      <div className="text-xs text-slate-500">{c.businessName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{c.email}</div>
                      <div className="text-xs text-slate-500">{c.mobile}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.type}</td>
                    <td className="px-4 py-3">
                      <Badge value={c.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.followUpDate)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{c._count?.challans ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        subtitle={editing ? `Editing ${editing.name}` : 'Create a new customer record'}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name *" htmlFor="c-name">
            <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Mobile *" htmlFor="c-mobile">
            <Input id="c-mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </Field>
          <Field label="Email *" htmlFor="c-email">
            <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Business Name" htmlFor="c-business">
            <Input id="c-business" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </Field>
          <Field label="GST Number" htmlFor="c-gst">
            <Input id="c-gst" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </Field>
          <Field label="Type" htmlFor="c-type">
            <Select id="c-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Retail</option>
              <option>Wholesale</option>
              <option>Distributor</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="c-address">
              <Input id="c-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
          <Field label="Status" htmlFor="c-status">
            <Select id="c-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>LEAD</option>
              <option>ACTIVE</option>
              <option>INACTIVE</option>
            </Select>
          </Field>
          <Field label="Follow-up Date" htmlFor="c-follow">
            <Input id="c-follow" type="datetime-local" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="c-notes">
              <Input id="c-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button
            loading={saving}
            disabled={!form.name || !form.mobile || !form.email}
            onClick={handleSubmit}
          >
            {editing ? 'Save Changes' : 'Add Customer'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
