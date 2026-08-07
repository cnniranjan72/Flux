import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-slate-800">404</h1>
      <p className="text-slate-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
        Go to Dashboard
      </Link>
    </div>
  );
}
