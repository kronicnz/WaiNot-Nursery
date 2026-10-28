import { useEffect, useState } from 'react';
import { api } from '../../lib/client/api';
import { Msg } from './ui';

export default function NurserySummary({ onNavigate }: { onNavigate: (target: 'nursery:orders' | 'nursery:care') => void }) {
  const [summary, setSummary] = useState<{ open_orders: number; due_tasks: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    api<{ open_orders: number; due_tasks: number }>(`/api/nursery-summary?today=${day}`).then(setSummary).catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <Msg kind="err">Could not load nursery reminders: {error}</Msg>;
  if (!summary) return <p className="text-sm text-stone-500" role="status">Loading nursery reminders...</p>;
  return <section className="grid gap-3 sm:grid-cols-2" aria-label="Nursery reminders">
    <button className="rounded-2xl border border-[#e6ebe3] bg-white p-4 text-left hover:bg-green-50" onClick={() => onNavigate('nursery:orders')}>
      <strong className="block text-lg">{summary.open_orders} open orders</strong>
      <span className="text-sm text-stone-600">View orders awaiting fulfilment</span>
    </button>
    <button className="rounded-2xl border border-[#e6ebe3] bg-white p-4 text-left hover:bg-green-50" onClick={() => onNavigate('nursery:care')}>
      <strong className="block text-lg">{summary.due_tasks} care tasks due</strong>
      <span className="text-sm text-stone-600">View today’s and overdue tasks</span>
    </button>
  </section>;
}
