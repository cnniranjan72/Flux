import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, formatDate } from '../lib/api';
import Badge from '../components/Badge';
import { Card, PageHeader, EmptyState, TableSkeleton } from '../components/ui/Layout';
import { IconUsers, IconBox, IconTruck, IconClock, IconAlertTriangle, IconTrendUp } from '../components/icons';

interface Summary {
  customers: { total: number; active: number; dueFollowUps: any[] };
  products: { total: number; lowStock: number; lowStockProducts: any[] };
  challans: {
    total: number;
    confirmed: number;
    draft: number;
    recent: any[];
    trend: { date: string; label: string; count: number }[];
  };
}

function TrendChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-600">{d.count}</span>
          <div
            className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-blue-600 to-indigo-400 transition-all"
            style={{ height: `${Math.max((d.count / max) * 100, 6)}%`, minHeight: 12 }}
          />
          <span className="text-[10px] font-medium uppercase text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Summary>('/dashboard/summary', { token })
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
    );
  }
  if (!summary) return <TableSkeleton rows={6} cols={4} />;

  const cards = [
    {
      label: 'Total Customers',
      value: summary.customers.total,
      sub: `${summary.customers.active} active`,
      to: '/customers',
      icon: <IconUsers size={20} />,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Products',
      value: summary.products.total,
      sub: `${summary.products.lowStock} low on stock`,
      to: '/products',
      icon: <IconBox size={20} />,
      accent: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Sales Challans',
      value: summary.challans.total,
      sub: `${summary.challans.confirmed} confirmed · ${summary.challans.draft} draft`,
      to: '/challans',
      icon: <IconTruck size={20} />,
      accent: 'bg-green-50 text-green-600',
    },
    {
      label: 'Follow-ups Due',
      value: summary.customers.dueFollowUps.length,
      sub: 'customers to contact',
      to: '/customers',
      icon: <IconClock size={20} />,
      accent: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Here's what's happening across your business today."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.accent}`}>
                {c.icon}
              </div>
              <IconTrendUp size={16} className="text-slate-300 transition group-hover:text-blue-500" />
            </div>
            <div className="mt-4 text-3xl font-bold text-slate-900">{c.value}</div>
            <div className="mt-0.5 text-sm font-medium text-slate-600">{c.label}</div>
            <div className="text-xs text-slate-400">{c.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Challans — Last 7 Days" className="lg:col-span-2" pad={false}>
          <div className="p-5">
            {summary.challans.trend.every((t) => t.count === 0) ? (
              <EmptyState title="No challans this week" message="Create your first sales challan to see activity here." />
            ) : (
              <TrendChart data={summary.challans.trend} />
            )}
          </div>
        </Card>

        <Card title="Low Stock Alerts" pad={false}>
          {summary.products.lowStockProducts.length === 0 ? (
            <EmptyState title="All stocked up" message="No products below their minimum stock threshold." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.products.lowStockProducts.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <Link to={`/products/${p.id}`} className="text-sm font-medium text-slate-700 hover:text-blue-700">
                      {p.name}
                    </Link>
                    <div className="text-xs text-slate-400">{p.sku}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                      <IconAlertTriangle size={13} />
                      {p.currentStock} left
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recent Challans" pad={false}>
          {summary.challans.recent.length === 0 ? (
            <EmptyState title="No challans yet" message="Create your first sales challan." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.challans.recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                      {c.totalQuantity}
                    </span>
                    <div>
                      <Link to={`/challans/${c.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-700">
                        {c.challanNumber}
                      </Link>
                      <div className="text-xs text-slate-500">{c.customer.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-xs text-slate-400 sm:block">{formatDate(c.createdAt)}</span>
                    <Badge value={c.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Upcoming Follow-ups" pad={false}>
          {summary.customers.dueFollowUps.length === 0 ? (
            <EmptyState title="No follow-ups scheduled" message="Add follow-ups from a customer's detail page." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.customers.dueFollowUps.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div>
                    <Link to={`/customers/${c.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-700">
                      {c.name}
                    </Link>
                    <div className="text-xs text-slate-500">{c.mobile}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge value={c.status} />
                    <span className="text-xs text-slate-500">{formatDate(c.followUpDate)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
