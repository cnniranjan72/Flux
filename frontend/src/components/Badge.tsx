const styles: Record<string, string> = {
  LEAD: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-slate-200 text-slate-600',
  DRAFT: 'bg-slate-200 text-slate-600',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  IN: 'bg-green-100 text-green-700',
  OUT: 'bg-red-100 text-red-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  SALES: 'bg-blue-100 text-blue-700',
  WAREHOUSE: 'bg-orange-100 text-orange-700',
  ACCOUNTS: 'bg-cyan-100 text-cyan-700',
};

export default function Badge({ value }: { value: string }) {
  const cls = styles[value] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {value}
    </span>
  );
}
