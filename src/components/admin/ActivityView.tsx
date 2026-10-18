import { useEffect, useState } from 'react';
import { api, type Movement } from '../../lib/client/api';
import { Msg } from './ui';

export default function ActivityView({ role }: { role: 'owner' | 'staff' }) {
  const [items, setItems] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState('');
  const [reason, setReason] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const load = async () => {
    setErr('');
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (reason) params.set('reason', reason);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const r = await api<{ items: Movement[]; total: number }>(`/api/movements?${params}`);
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  useEffect(() => { void load(); }, [offset, reason, from, to]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={reason} onChange={(e) => { setReason(e.target.value); setOffset(0); }} className="rounded-lg border px-2 py-1.5 text-sm">
          <option value="">All reasons</option>
          <option value="receive">Receive</option>
          <option value="sale">Sale</option>
          <option value="adjust">Adjust</option>
          <option value="transfer">Transfer</option>
          <option value="loss">Loss</option>
          <option value="stocktake">Stocktake</option>
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }} className="rounded-lg border px-2 py-1.5 text-sm" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }} className="rounded-lg border px-2 py-1.5 text-sm" />
        {role === 'owner' && <a href="/api/export/movements.csv" className="ml-auto rounded-lg bg-[#2c5a3e] px-3 py-1.5 text-sm font-semibold text-white">Export CSV</a>}
      </div>
      {err && <Msg kind="err">{err}</Msg>}
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f4f6f3] text-left text-xs uppercase tracking-wide text-[#7c887e]">
            <tr><th className="px-3 py-2">Time</th><th className="px-3 py-2">Product</th><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Delta</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">User</th></tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(m.created_at).toLocaleString('en-NZ')}</td>
                <td className="px-3 py-2">{m.products?.name ?? '—'}</td>
                <td className="px-3 py-2">{m.batches?.batch_code ?? '—'}</td>
                <td className="px-3 py-2">{m.delta}</td>
                <td className="px-3 py-2">{m.reason}</td>
                <td className="px-3 py-2">{m.profiles?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>{total} total</span>
        <div className="flex gap-2">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Prev</button>
          <button type="button" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </div>
    </section>
  );
}
