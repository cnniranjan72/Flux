import { useState, ReactNode } from 'react';
import { NavLink, Navigate } from 'react-router-dom';
import { useAuth, Role } from '../hooks/useAuth';
import { initials } from '../lib/api';
import {
  IconDashboard,
  IconUsers,
  IconBox,
  IconTruck,
  IconLogout,
  IconMenu,
  IconClose,
} from './icons';

const NAV: { to: string; label: string; icon: ReactNode; roles: Role[] }[] = [
  { to: '/', label: 'Dashboard', icon: <IconDashboard size={18} />, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { to: '/customers', label: 'Customers', icon: <IconUsers size={18} />, roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
  { to: '/products', label: 'Products', icon: <IconBox size={18} />, roles: ['ADMIN', 'SALES', 'WAREHOUSE'] },
  { to: '/challans', label: 'Sales Challans', icon: <IconTruck size={18} />, roles: ['ADMIN', 'SALES', 'WAREHOUSE'] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const items = NAV.filter((n) => n.roles.includes(user.role));

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex h-16 items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            F
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white">Flux ERP</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Operations Portal</div>
          </div>
        </div>
        <button
          className="text-slate-400 hover:text-white lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <IconClose size={20} />
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </p>
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {n.icon}
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium text-white">{user.name}</div>
            <div className="truncate text-[11px] text-slate-400">{user.email}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-red-400"
            title="Logout"
            aria-label="Logout"
          >
            <IconLogout size={18} />
          </button>
        </div>
        <span className="mt-3 block rounded-md bg-slate-800 px-2.5 py-1 text-center text-[10px] font-medium uppercase tracking-wider text-slate-300">
          {user.role}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-400">Flux ERP</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800">
              {items.find((n) => window.location.pathname.startsWith(n.to) && (n.to === '/' ? window.location.pathname === '/' : true))?.label || 'Dashboard'}
            </span>
          </div>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              ● Online
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
