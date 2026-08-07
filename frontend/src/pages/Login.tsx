import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input, Field } from '../components/ui/Form';

const DEMO = [
  { label: 'Admin', email: 'admin@test.com', cls: 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400' },
  { label: 'Sales', email: 'sales@test.com', cls: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400' },
  { label: 'Warehouse', email: 'warehouse@test.com', cls: 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400' },
  { label: 'Accounts', email: 'accounts@test.com', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:border-cyan-400' },
];

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoEmail, setDemoEmail] = useState('');

  if (user) return <Navigate to="/" replace />;

  const doLogin = async (mail: string, pass: string, isDemo = false) => {
    setError('');
    setSubmitting(true);
    if (isDemo) setDemoEmail(mail);
    try {
      await login(mail, pass);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      if (isDemo) setDemoEmail('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-lg">
            F
          </div>
          <h1 className="text-2xl font-bold text-white">Flux ERP / CRM</h1>
          <p className="mt-1 text-sm text-slate-400">
            Wholesale &amp; distribution operations portal
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email address" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </Field>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" loading={submitting} className="w-full py-2.5">
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Demo accounts · password: password123
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  disabled={submitting}
                  onClick={() => doLogin(d.email, 'password123', true)}
                  className={`rounded-lg border px-2 py-1.5 text-left text-xs transition disabled:cursor-wait disabled:opacity-60 ${d.cls}`}
                >
                  <span className="font-semibold">{d.label}</span>
                  <span className="block opacity-70">{d.email}</span>
                  {demoEmail === d.email && submitting && (
                    <span className="mt-0.5 block text-[10px] font-medium text-slate-500">Signing in…</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Role-based access · JWT secured · PostgreSQL backed
        </p>
      </div>
    </div>
  );
}
