import { useCallback, useEffect, useState } from 'react';
import { FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api, formatDate } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { Card, PageHeader, EmptyState, TableSkeleton, Th } from '../components/ui/Layout';
import Badge from '../components/Badge';
import { IconUserCog, IconPlus, IconShield } from '../components/icons';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'];

export default function Users() {
  const { token, user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'SALES', password: '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<{ data: UserRow[] }>(`/users`, { token });
      setUsers(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleActive = async (u: UserRow) => {
    if (u.id === me?.id) {
      toast('error', 'You cannot deactivate your own account');
      return;
    }
    setBusyId(u.id);
    setError('');
    try {
      await api(`/users/${u.id}/active`, { method: 'PUT', body: { active: !u.active }, token });
      toast('success', `${u.name} ${u.active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setBusyId('');
    }
  };

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/auth/register', { method: 'POST', body: form, token });
      toast('success', `${form.name} created`);
      setCreateOpen(false);
      setForm({ name: '', email: '', role: 'SALES', password: '' });
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        subtitle={`${users.length} accounts`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <IconPlus size={16} />
            New User
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card pad={false}>
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<IconUserCog size={22} />}
            title="No users yet"
            message="Create the first account to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Created</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className={`transition hover:bg-slate-50 ${u.id === me?.id ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-slate-800">
                        {u.name}
                        {u.id === me?.id && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                            you
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge value={u.role} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          u.active ? 'text-green-700' : 'text-slate-400'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-slate-300'}`} />
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={busyId === u.id || u.id === me?.id}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            u.active
                              ? 'border-red-200 text-red-700 hover:bg-red-50'
                              : 'border-green-200 text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New User"
        subtitle="Create an account with role-based access"
      >
        <form onSubmit={createUser} className="space-y-4">
          <Field label="Full name" htmlFor="user-name">
            <Input
              id="user-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Priya Sharma"
            />
          </Field>
          <Field label="Email address" htmlFor="user-email">
            <Input
              id="user-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="person@company.com"
            />
          </Field>
          <Field label="Role" htmlFor="user-role">
            <Select id="user-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Password" htmlFor="user-password" hint="At least 6 characters">
            <Input
              id="user-password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <IconShield size={16} />
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
