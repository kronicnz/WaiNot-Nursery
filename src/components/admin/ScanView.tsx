import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, isNetworkError, type Product } from '../../lib/client/api';
import { enqueue, flushQueue, listQueue, lookupOffline, refreshCatalog } from '../../lib/client/offline';
import Scanner from './Scanner';
import { Btn, Msg, inputCls } from './ui';

type Mode = 'in' | 'out';

export default function ScanView({ role }: { role: 'owner' | 'staff' }) {
  const [mode, setMode] = useState<Mode>('out');
  const [product, setProduct] = useState<Product | null>(null);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<'sale' | 'loss'>('sale');
  const [batchId, setBatchId] = useState('');
  const [note, setNote] = useState('');
  const [manual, setManual] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const online = useRef(navigator.onLine);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    const r = await flushQueue();
    setPending(r.remaining);
    if (r.sent) setMsg({ kind: 'ok', text: `Synced ${r.sent} offline scan(s)` });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshCatalog();
      } catch {
        /* offline: use cached */
      }
      setPending((await listQueue()).length);
      syncNow();
    })();
    const on = () => {
      online.current = true;
      syncNow();
    };
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, [syncNow]);

  const handleCode = useCallback(async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    setMsg(null);
    setUnknown(null);
    let found: Product | null = null;
    try {
      found = await api<Product>(`/api/products/lookup?barcode=${encodeURIComponent(code)}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) found = null;
      else if (isNetworkError(e)) found = await lookupOffline(code);
      else return setMsg({ kind: 'err', text: (e as Error).message });
    }
    if (!found) return setUnknown(code);
    setProduct(found);
    setQty(1);
    setBatchId(found.scanned_batch_id ?? '');
    setNote('');
  }, []);

  const here = product?.stock_levels?.reduce((n, s) => n + s.qty, 0) ?? 0;

  const confirm = async () => {
    if (!product) return;
    setBusy(true);
    const movement = {
      client_op_id: crypto.randomUUID(),
      product_id: product.id,
      batch_id: batchId || null,
      delta: mode === 'in' ? qty : -qty,
      reason: (mode === 'in' ? 'receive' : reason) as 'receive' | 'sale' | 'loss',
      note: note || null,
    };
    try {
      await api('/api/stock/movements', { method: 'POST', json: movement });
      setMsg({ kind: 'ok', text: `${mode === 'in' ? 'Added' : 'Removed'} ${qty} × ${product.name}` });
      setProduct(null);
    } catch (e) {
      if (isNetworkError(e)) {
        await enqueue({ ...movement, queued_at: Date.now(), product_name: product.name });
        setPending((await listQueue()).length);
        setMsg({ kind: 'ok', text: `Offline: saved ${qty} × ${product.name}, will sync later` });
        setProduct(null);
      } else setMsg({ kind: 'err', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(['out', 'in'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-xl py-3 text-lg font-semibold ${mode === m ? (m === 'in' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white') : 'bg-stone-200'}`}
          >
            {m === 'in' ? 'Stock IN' : 'Stock OUT'}
          </button>
        ))}
      </div>

      <Scanner onScan={handleCode} paused={!!product || !!unknown} />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleCode(manual);
          setManual('');
        }}
      >
        <input className={inputCls} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Type barcode or WN:SKU" inputMode="text" />
        <Btn type="submit">Find</Btn>
      </form>

      {pending > 0 && (
        <p className="rounded-lg bg-amber-100 p-2 text-sm">
          {pending} scan(s) waiting to sync. <button className="underline" onClick={syncNow}>Sync now</button>
        </p>
      )}
      {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}

      {unknown && (
        <div className="space-y-2 rounded-xl border bg-white p-4">
          <p>
            Unknown code <code className="break-all">{unknown}</code>
          </p>
          {role === 'owner' ? (
            <p className="text-sm text-stone-600">Open Products, edit a product and add this barcode to it (or create a new product).</p>
          ) : (
            <p className="text-sm text-stone-600">Ask an owner to link this barcode to a product.</p>
          )}
          <Btn onClick={() => setUnknown(null)}>Dismiss</Btn>
        </div>
      )}

      {product && (
        <div className="space-y-3 rounded-xl border bg-white p-4 shadow">
          <div className="flex gap-3">
            {product.image_path && <img src={`/api/products/${product.id}/image`} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />}
            <div className="min-w-0">
              <h2 className="break-words text-lg font-semibold">{product.name}</h2>
              <p className="break-words text-sm text-stone-600">
                {product.sku}
                {product.pot_size ? ` · ${product.pot_size}` : ''}
              </p>
              <p className="text-sm">Total on hand: <b>{here}</b></p>
            </div>
          </div>
          {product.batches && product.batches.length > 0 && (
            <select className={inputCls} value={batchId} onChange={(e) => setBatchId(e.target.value)} aria-label="Batch">
              <option value="">No batch</option>
              {product.batches.filter((batch) => batch.archived_at === null).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_code}{b.potted_on ? ` · potted ${b.potted_on}` : ''}
                </option>
              ))}
            </select>
          )}
          {mode === 'out' && (
            <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value as 'sale' | 'loss')} aria-label="Reason">
              <option value="sale">Sale</option>
              <option value="loss">Loss / damaged</option>
            </select>
          )}
          <div className="flex items-center justify-center gap-4">
            <Btn onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Btn>
            <input
              className="w-20 rounded-lg border p-2 text-center text-2xl"
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              value={qty}
              onChange={(e) => setQty(Math.min(100000, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            />
            <Btn onClick={() => setQty((q) => Math.min(100000, q + 1))}>+</Btn>
          </div>
          <input className={inputCls} placeholder="Note (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => setProduct(null)}>Cancel</Btn>
            <Btn primary disabled={busy} onClick={confirm}>
              Confirm {mode === 'in' ? 'IN' : 'OUT'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
