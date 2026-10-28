import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, isNetworkError, type Location, type Product } from '../../lib/client/api';
import { enqueue, enqueueTransfer, flushQueue, flushTransferQueue, listQueue, listTransferQueue, lookupOffline, refreshCatalog } from '../../lib/client/offline';
import Scanner from './Scanner';
import { Btn, Msg, inputCls } from './ui';

type Mode = 'in' | 'out' | 'transfer';

export default function ScanView({ role }: { role: 'owner' | 'staff' }) {
  const [mode, setMode] = useState<Mode>('out');
  const [product, setProduct] = useState<Product | null>(null);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<'sale' | 'loss'>('sale');
  const [batchId, setBatchId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [note, setNote] = useState('');
  const [manual, setManual] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<{ unit_price: number | null; line_total: number | null; discount_pct: number } | null>(null);
  const online = useRef(navigator.onLine);

  // Transfer-specific state
  const [locations, setLocations] = useState<Location[]>([]);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferring, setTransferring] = useState(false);
  const [transferMsg, setTransferMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [transferPending, setTransferPending] = useState(0);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    const r = await flushQueue();
    const tr = await flushTransferQueue();
    setPending(r.remaining);
    setTransferPending(tr.remaining);
    if (r.sent || tr.sent) setMsg({ kind: 'ok', text: `Synced ${r.sent} scan(s) and ${tr.sent} transfer(s)` });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshCatalog();
      } catch {
        /* offline: use cached */
      }
      const qCount = (await listQueue()).length;
      const tCount = (await listTransferQueue()).length;
      setPending(qCount);
      setTransferPending(tCount);
      syncNow();

      // load locations for transfer mode
      try {
        const locs = await api<Location[]>('/api/locations');
        setLocations(locs);
      } catch {
        setLocations([]);
      }
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
    setLocationId('');
    setNote('');
    setQuote(null);
  }, []);

  useEffect(() => {
    if (!product || mode !== 'out' || reason !== 'sale') { setQuote(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ unit_price: number | null; line_total: number | null; discount_pct: number }>(
          `/api/pricing/quote?product_id=${encodeURIComponent(product.id)}${batchId ? `&batch_id=${encodeURIComponent(batchId)}` : ''}&qty=${qty}`
        );
        if (!cancelled) setQuote(res);
      } catch {
        if (!cancelled) setQuote(null);
      }
    })();
    return () => { cancelled = true; };
  }, [product, batchId, qty, reason, mode]);

  const here = product?.stock_levels?.reduce((n, s) => n + s.qty, 0) ?? 0;

  const confirm = async () => {
    if (!product) return;
    setBusy(true);
    const movement = {
      client_op_id: crypto.randomUUID(),
      product_id: product.id,
      batch_id: batchId || null,
      location_id: locationId || null,
      delta: mode === 'in' ? qty : -qty,
      reason: (mode === 'in' ? 'receive' : reason) as 'receive' | 'sale' | 'loss',
      note: note || null,
      ...(reason === 'sale' ? { unit_price: quote?.unit_price ?? null, line_total: quote?.line_total ?? null } : {}),
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

  // Transfer submit
  const submitTransfer = async () => {
    setTransferMsg(null);
    if (!product) return setTransferMsg({ kind: 'err', text: 'Select a product first (scan or search).' });
    if (fromLocation === toLocation) return setTransferMsg({ kind: 'err', text: 'Choose two different locations.' });
    if (!navigator.onLine) return setTransferMsg({ kind: 'err', text: 'Transfers require a network connection.' });
    const n = Number(transferQty);
    if (!Number.isInteger(n) || n <= 0) return setTransferMsg({ kind: 'err', text: 'Invalid quantity' });
    setTransferring(true);
    try {
      await api('/api/transfers', {
        method: 'POST',
        json: {
          product_id: product.id,
          batch_id: batchId || null,
          from_location_id: fromLocation || null,
          to_location_id: toLocation || null,
          qty: n,
          note: note || null,
          client_op_id: crypto.randomUUID(),
        },
      });
      setTransferMsg({ kind: 'ok', text: `Moved ${n} × ${product.name} from ${locations.find((l) => l.id === fromLocation)?.name ?? 'unassigned'} to ${locations.find((l) => l.id === toLocation)?.name ?? 'unassigned'}.` });
      setProduct(null);
      setFromLocation('');
      setToLocation('');
      setTransferQty(1);
      // refresh catalog/parent data
      try { await refreshCatalog(); } catch { /* ignore */ }
    } catch (e) {
      setTransferMsg({ kind: 'err', text: (e as Error).message });
    } finally {
      setTransferring(false);
    }
  };

  // enqueue transfer when offline
  const enqueueTransferLocal = async () => {
    if (!product) return setTransferMsg({ kind: 'err', text: 'Select a product first (scan or search).' });
    if (fromLocation === toLocation) return setTransferMsg({ kind: 'err', text: 'Choose two different locations.' });
    const n = Number(transferQty);
    if (!Number.isInteger(n) || n <= 0) return setTransferMsg({ kind: 'err', text: 'Invalid quantity' });
    try {
      await enqueueTransfer({
        client_op_id: crypto.randomUUID(),
        product_id: product.id,
        batch_id: batchId || null,
        from_location_id: fromLocation || null,
        to_location_id: toLocation || null,
        qty: n,
        note: note || null,
        queued_at: Date.now(),
        product_name: product.name,
      });
      setTransferMsg({ kind: 'ok', text: `Offline: queued transfer of ${n} × ${product.name}` });
      setProduct(null);
      setFromLocation('');
      setToLocation('');
      setTransferQty(1);
      setTransferPending((await listTransferQueue()).length);
    } catch (e) {
      setTransferMsg({ kind: 'err', text: (e as Error).message });
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {(['out', 'in', 'transfer'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-xl py-3 text-lg font-semibold ${mode === m ? (m === 'in' ? 'bg-green-600 text-white' : m === 'out' ? 'bg-orange-600 text-white' : 'bg-green-700 text-white') : 'bg-stone-200'}`}
          >
            {m === 'in' ? 'Stock IN' : m === 'out' ? 'Stock OUT' : 'Transfer'}
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

      {(pending > 0 || transferPending > 0) && (
        <p className="rounded-lg bg-amber-100 p-2 text-sm">
          {pending > 0 && <span>{pending} scan(s) waiting to sync. </span>}
          {transferPending > 0 && <span>{transferPending} transfer(s) waiting to sync. </span>}
          <button className="underline" onClick={syncNow}>Sync now</button>
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
          {mode === 'transfer' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm">
                        <span className="mb-1 block text-stone-600">From location <span title="Origin of the goods. Locations are internal storage places (bench, tunnel, shadehouse, shop)." className="ml-1 inline-block text-xs text-stone-400">?</span></span>
                  <select className={inputCls} value={fromLocation} onChange={(e) => setFromLocation(e.target.value)}>
                    <option value="">Unassigned location</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.kind}{l.active ? '' : ' (inactive)'}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                        <span className="mb-1 block text-stone-600">To location <span title="Destination of the goods. Deactivated locations are hidden by default." className="ml-1 inline-block text-xs text-stone-400">?</span></span>
                  <select className={inputCls} value={toLocation} onChange={(e) => setToLocation(e.target.value)}>
                    <option value="">Unassigned location</option>
                    {locations.filter((l) => l.active).map((l) => <option key={l.id} value={l.id}>{l.name} · {l.kind}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Btn onClick={() => setTransferQty((q) => Math.max(1, q - 1))}>−</Btn>
                <input
                  className="w-20 rounded-lg border p-2 text-center text-2xl"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100000}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.min(100000, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                />
                <Btn onClick={() => setTransferQty((q) => Math.min(100000, q + 1))}>+</Btn>
              </div>
              <input className={inputCls} placeholder="Note (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              {transferMsg && <Msg kind={transferMsg.kind}>{transferMsg.text}</Msg>}
              <div className="grid grid-cols-2 gap-2">
                <Btn onClick={() => { setProduct(null); setFromLocation(''); setToLocation(''); setTransferQty(1); setTransferMsg(null); }}>Cancel</Btn>
                <Btn primary disabled={transferring} onClick={navigator.onLine ? submitTransfer : enqueueTransferLocal}>{transferring ? 'Moving…' : navigator.onLine ? 'Move stock' : 'Queue transfer'}</Btn>
              </div>
            </>
          ) : (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-stone-600">Stock location</span>
                <select className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  <option value="">Unassigned location</option>
                  {locations.filter((l) => l.active || mode === 'out').map((l) => <option key={l.id} value={l.id}>{l.name}{l.active ? '' : ' (inactive)'}</option>)}
                </select>
              </label>
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
              {reason === 'sale' && quote && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">Unit price:</span>
                  <span className="font-semibold">{quote.unit_price == null ? '—' : new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(quote.unit_price)}</span>
                  <span className="text-stone-500">·</span>
                  <span className="font-medium">Line total:</span>
                  <span className="font-semibold">{quote.line_total == null ? '—' : new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(quote.line_total)}</span>
                  {quote.discount_pct > 0 && <span className="ml-2 text-xs text-stone-500">({quote.discount_pct}% tier)</span>}
                </div>
              )}
              <input className={inputCls} placeholder="Note (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Btn onClick={() => setProduct(null)}>Cancel</Btn>
                <Btn primary disabled={busy} onClick={confirm}>
                  Confirm {mode === 'in' ? 'IN' : 'OUT'}
                </Btn>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
