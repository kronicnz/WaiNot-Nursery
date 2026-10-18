import { useCallback, useEffect, useState } from 'react';
import { api, type Product } from '../../lib/client/api';
import { lookupOffline } from '../../lib/client/offline';
import Scanner from './Scanner';
import { Btn, Msg, inputCls } from './ui';

interface Detail {
  id: string;
  status: 'open' | 'finalized';
  lines: {
    product_id: string;
    batch_id: string | null;
    counted_qty: number;
    products: { name: string; sku: string };
    batches: { batch_code: string; potted_on: string | null } | null;
  }[];
  expected: { product_id: string; batch_id: string | null; qty: number }[];
}
interface Summary { id: string; status: string; created_at: string }

export default function StocktakeView({ role }: { role: 'owner' | 'staff' }) {
  const [list, setList] = useState<Summary[]>([]);
  const [current, setCurrent] = useState<Detail | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [batchId, setBatchId] = useState('');
  const [count, setCount] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const loadList = useCallback(async () => {
    setList(await api<Summary[]>('/api/stocktakes'));
  }, []);
  const open = useCallback(async (id: string) => setCurrent(await api<Detail>(`/api/stocktakes/${id}`)), []);
  useEffect(() => { loadList().catch((e) => setMsg({ kind: 'err', text: e.message })); }, [loadList]);

  const onScan = async (code: string) => {
    try {
      const found = await api<Product>(`/api/products/lookup?barcode=${encodeURIComponent(code)}`);
      setProduct(found);
      setBatchId(found.scanned_batch_id ?? '');
    } catch {
      const found = await lookupOffline(code);
      if (!found) {
        setMsg({ kind: 'err', text: 'Plant not found. Check the barcode and try again.' });
        return;
      }
      setProduct(found);
      setBatchId(found.scanned_batch_id ?? '');
    }
    setCount('');
  };

  const saveLine = async () => {
    if (!current || !product) return;
    try {
      await api(`/api/stocktakes/${current.id}/lines`, {
        method: 'PUT',
        json: { product_id: product.id, batch_id: batchId || null, counted_qty: Number(count) },
      });
      setProduct(null);
      setBatchId('');
      await open(current.id);
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    }
  };

  if (!current) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-stone-600">Stock counts are grouped by plant batch.</p>
        <Btn primary onClick={async () => { const s = await api<{ id: string }>('/api/stocktakes', { method: 'POST', json: {} }); open(s.id); }}>Start batch count</Btn>
        {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id}><button className="w-full rounded-lg bg-white p-3 text-left shadow-sm" onClick={() => open(s.id)}>Batch count · {s.status} · {new Date(s.created_at).toLocaleDateString()}</button></li>
          ))}
        </ul>
      </div>
    );
  }

  const expected = (id: string, batch: string | null) =>
    current.expected.filter((e) => e.product_id === id && e.batch_id === batch).reduce((n, e) => n + e.qty, 0);
  const isOpen = current.status === 'open';

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Batch stocktake ({current.status})</h2>
      {isOpen && <Scanner onScan={onScan} paused={!!product} />}
      {product && (
        <div className="space-y-2 rounded-xl border bg-white p-3">
          <p className="font-medium">{product.name}</p>
          {product.batches && product.batches.length > 0 && (
            <select className={inputCls} value={batchId} onChange={(e) => setBatchId(e.target.value)} aria-label="Plant batch">
              <option value="">Unassigned batch</option>
              {product.batches.filter((batch) => batch.archived_at === null).map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_code}{batch.potted_on ? ` · potted ${batch.potted_on}` : ''}
                </option>
              ))}
            </select>
          )}
          <input className={inputCls} type="number" inputMode="numeric" min={0} placeholder="Counted quantity" value={count} onChange={(e) => setCount(e.target.value)} />
          <div className="grid grid-cols-2 gap-2"><Btn onClick={() => setProduct(null)}>Cancel</Btn><Btn primary disabled={count === ''} onClick={saveLine}>Save count</Btn></div>
        </div>
      )}
      <ul className="space-y-1">
        {current.lines.map((l) => {
          const system = expected(l.product_id, l.batch_id);
          const diff = l.counted_qty - system;
          return (
            <li key={`${l.product_id}:${l.batch_id ?? 'unassigned'}`} className="grid grid-cols-1 gap-1 rounded-lg bg-white p-3 text-sm shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span className="min-w-0 break-words">{l.products.name}<small className="block text-stone-500">{l.batches?.batch_code ?? 'Unassigned batch'}</small></span>
              <span className="break-words sm:text-right">{l.counted_qty} (system {system}) <b className={diff === 0 ? '' : diff > 0 ? 'text-green-700' : 'text-red-700'}>{diff > 0 ? `+${diff}` : diff}</b></span>
            </li>
          );
        })}
      </ul>
      {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
      <div className="grid grid-cols-2 gap-2">
        <Btn onClick={() => { setCurrent(null); loadList(); }}>Back</Btn>
        {isOpen && role === 'owner' && (
          <Btn primary onClick={async () => {
            if (!confirm('Apply counted quantities as stock adjustments? This cannot be undone.')) return;
            try {
              const r = await api<{ adjustments: number }>(`/api/stocktakes/${current.id}/finalize`, { method: 'POST' });
              setMsg({ kind: 'ok', text: `Finalized with ${r.adjustments} adjustment(s)` });
              await open(current.id);
            } catch (e) { setMsg({ kind: 'err', text: (e as Error).message }); }
          }}>Finalize</Btn>
        )}
      </div>
    </div>
  );
}
