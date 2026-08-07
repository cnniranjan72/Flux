export function formatMoney(value: number): string {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

export function formatDateTime(value: string | Date): string {
  const d = new Date(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
