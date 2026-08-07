import { Route, Routes, Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth, Role } from './hooks/useAuth';
import Layout from './components/Layout';
import { TableSkeleton } from './components/ui/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Challans from './pages/Challans';
import ChallanCreate from './pages/ChallanCreate';
import ChallanDetail from './pages/ChallanDetail';
import NotFound from './pages/NotFound';

function Protected({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8">
          <TableSkeleton rows={4} cols={3} />
        </div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Protected><Dashboard /></Protected>} />

      <Route
        path="/customers"
        element={<Protected roles={['ADMIN', 'SALES', 'ACCOUNTS']}><Customers /></Protected>}
      />
      <Route
        path="/customers/:id"
        element={<Protected roles={['ADMIN', 'SALES', 'ACCOUNTS']}><CustomerDetail /></Protected>}
      />
      <Route
        path="/products"
        element={<Protected roles={['ADMIN', 'SALES', 'WAREHOUSE']}><Products /></Protected>}
      />
      <Route
        path="/products/:id"
        element={<Protected roles={['ADMIN', 'SALES', 'WAREHOUSE']}><ProductDetail /></Protected>}
      />
      <Route
        path="/challans"
        element={<Protected roles={['ADMIN', 'SALES', 'WAREHOUSE']}><Challans /></Protected>}
      />
      <Route
        path="/challans/new"
        element={<Protected roles={['ADMIN', 'SALES']}><ChallanCreate /></Protected>}
      />
      <Route
        path="/challans/:id"
        element={<Protected roles={['ADMIN', 'SALES', 'WAREHOUSE']}><ChallanDetail /></Protected>}
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
