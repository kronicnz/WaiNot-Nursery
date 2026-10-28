import { useCallback, useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { api, type Category, type Product, type Location } from '../../lib/client/api';
import { Btn, Msg, inputCls, Modal } from './ui';
import { listTransferQueue, discardQueuedTransfer, flushTransferQueue, retryQueuedTransfer, enqueueTransfer, clearTransferQueue } from '../../lib/client/offline';
import PotSizesEditor from './pricing/PotSizesEditor';
import GradesEditor from './pricing/GradesEditor';
import PriceBookTable from './pricing/PriceBookTable';

function Label({ p }: { p: Product }) {
  const qr = useRef<HTMLCanvasElement>(null);
  const bar = useRef<SVGSVGElement>(null);
  const code = p.product_barcodes?.[0]?.barcode ?? `WN:${p.sku}`;
  useEffect(() => {
    if (qr.current) QRCode.toCanvas(qr.current, code, { width: 90, margin: 1 });
    if (bar.current) {
      try {
        JsBarcode(bar.current, code, { format: 'CODE128', height: 40, displayValue: false, margin: 0 });
      } catch {
        /* unsupported characters */
      }
    }
  }, [code]);
  return (
    <div className="break-inside-avoid rounded border p-2 text-center text-xs">
      <canvas ref={qr} className="mx-auto" />
      <svg ref={bar} className="mx-auto mt-1 h-8 w-full" />
      <p className="font-semibold">{p.name}</p>
      <p>{p.sku}{p.pot_size ? ` · ${p.pot_size}` : ''}</p>
      <p className="sr-only">{code}</p>
    </div>
  );
}

function BatchLabel({ batch, product }: { batch: NonNullable<Product['batches']>[number]; product: Product }) {
  const qr = useRef<HTMLCanvasElement>(null);
  const bar = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (qr.current) QRCode.toCanvas(qr.current, batch.barcode, { width: 90, margin: 1 });
    if (bar.current) JsBarcode(bar.current, batch.barcode, { format: 'CODE128', height: 40, displayValue: false, margin: 0 });
  }, [batch.barcode]);
  return (
    <div className="break-inside-avoid rounded border p-2 text-center text-xs">
      <canvas ref={qr} className="mx-auto" />
      <svg ref={bar} className="mx-auto mt-1 h-8 w-full" />
      <p className="font-semibold">{product.name}</p>
      <p>{batch.batch_code}{batch.potted_on ? ` · potted ${batch.potted_on}` : ''}</p>
      <p className="break-all">{batch.barcode}</p>
    </div>
  );
}

function Labels() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [batchSel, setBatchSel] = useState<Set<string>>(new Set());
  useEffect(() => { api<{ items: Product[] }>('/api/products?limit=100').then((r) => setProducts(r.items)); }, []);
  const chosen = products.filter((p) => sel.has(p.id));
  const batches = products.flatMap((p) => (p.batches ?? [])
    .filter((batch) => batch.archived_at === null)
    .map((batch) => ({ batch, product: p })));
  const chosenBatches = batches.filter(({ batch }) => batchSel.has(batch.id));
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Print product and batch labels (QR + Code128)</h3>
      <div className="max-h-48 overflow-auto rounded border bg-white p-2 print:hidden">
        {products.map((p) => (
          <label key={p.id} className="flex gap-2 py-1">
            <input type="checkbox" checked={sel.has(p.id)} onChange={() => { const n = new Set(sel); n.has(p.id) ? n.delete(p.id) : n.add(p.id); setSel(n); }} />
            {p.name} <span className="text-stone-500">{p.sku}</span>
          </label>
        ))}
      </div>
      <div className="max-h-48 overflow-auto rounded border bg-white p-2 print:hidden">
        {batches.map(({ batch, product }) => (
          <label key={batch.id} className="flex gap-2 py-1">
            <input
              type="checkbox"
              checked={batchSel.has(batch.id)}
              onChange={() => {
                const next = new Set(batchSel);
                next.has(batch.id) ? next.delete(batch.id) : next.add(batch.id);
                setBatchSel(next);
              }}
            />
            {product.name} · {batch.batch_code} <span className="text-stone-500">{batch.barcode}</span>
          </label>
        ))}
      </div>
      <Btn disabled={!chosen.length && !chosenBatches.length} onClick={() => window.print()} className="print:hidden">
        Print {chosen.length + chosenBatches.length} label(s)
      </Btn>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 print:grid-cols-4">
        {chosen.map((p) => <Label key={`product:${p.id}`} p={p} />)}
        {chosenBatches.map(({ batch, product }) => <BatchLabel key={`batch:${batch.id}`} batch={batch} product={product} />)}
      </div>
    </section>
  );
}

function Simple<T extends { id: string; name: string }>({ title, path, extra }: { title: string; path: string; extra?: (t: T) => string }) {
  const [items, setItems] = useState<T[]>([]);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(() => api<T[]>(path).then(setItems).catch((e) => setErr(e.message)), [path]);
  useEffect(() => { load(); }, [load]);
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {items.map((i) => (
        <div key={i.id} className="flex justify-between rounded bg-white p-2">
          <span>{i.name} {extra?.(i)}</span>
          <button className="text-red-700" onClick={async () => { try { await api(`${path}/${i.id}`, { method: 'DELETE' }); load(); } catch (e) { setErr((e as Error).message); } }}>Delete</button>
        </div>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${title.toLowerCase()}`} maxLength={80} />
        <Btn primary disabled={!name.trim()} onClick={async () => { try { await api(path, { method: 'POST', json: { name: name.trim() } }); setName(''); load(); } catch (e) { setErr((e as Error).message); } }}>Add</Btn>
      </div>
      {err && <Msg kind="err">{err}</Msg>}
    </section>
  );
}

function Locations({ focus, onFocused }: { focus?: boolean; onFocused?: () => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (focus && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const first = rootRef.current.querySelector('input,select,button') as HTMLElement | null;
      if (first) first.focus();
      if (onFocused) onFocused();
    }
  }, [focus, onFocused]);
  const [items, setItems] = useState<Location[]>([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<'bench' | 'tunnel' | 'shadehouse' | 'shop' | 'other'>('bench');
  const [err, setErr] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingKind, setEditingKind] = useState<Location['kind']>('bench');
  const [confirm, setConfirm] = useState<{ id: string; name: string; active: boolean } | null>(null);
  const load = useCallback(() => api<Location[]>(`/api/locations${activeOnly ? '?active=1' : ''}`).then(setItems).catch((e) => setErr(e.message)), [activeOnly]);
  useEffect(() => { load(); }, [load]);

  const startEdit = (loc: Location) => { setEditingId(loc.id); setEditingName(loc.name); setEditingKind(loc.kind); };
  const saveEdit = async (id: string) => {
    setErr('');
    try {
      await api(`/api/locations/${id}`, { method: 'PATCH', json: { name: editingName, kind: editingKind } });
      setEditingId(null);
      load();
    } catch (e) { setErr((e as Error).message); }
  };
  const create = async () => {
    setErr('');
    try {
      await api('/api/locations', { method: 'POST', json: { name: newName.trim(), kind: newKind } });
      setNewName(''); setNewKind('bench'); load();
    } catch (e) { setErr((e as Error).message); }
  };
  const toggleActive = async (id: string, currentlyActive: boolean) => {
    setErr('');
    try {
      if (currentlyActive) {
        // soft-delete
        await api(`/api/locations/${id}`, { method: 'DELETE' });
      } else {
        // reactivate via PATCH
        await api(`/api/locations/${id}`, { method: 'PATCH', json: { active: true } });
      }
      setConfirm(null);
      load();
    } catch (e) { setErr((e as Error).message); setConfirm(null); }
  };

  return (
    <section ref={rootRef} className="space-y-2">
      {confirm && (
        <Modal title={confirm.active ? 'Deactivate location' : 'Reactivate location'} onCancel={() => setConfirm(null)} onConfirm={() => toggleActive(confirm.id, confirm.active)} confirmText={confirm.active ? 'Deactivate' : 'Reactivate'}>
          <p className="text-sm">Are you sure you want to {confirm.active ? 'deactivate' : 'reactivate'} the location <strong>{confirm.name}</strong>?</p>
          <p className="mt-2 text-xs text-stone-500">Deactivating hides the location from selection in transfers and scans but preserves historical stock history. If this location still has stock, consider transferring it before deactivating.</p>
        </Modal>
      )}
      <h3 className="font-semibold">Locations</h3>
      <p className="text-sm text-stone-600">Define places where stock is stored (bench, tunnel, shadehouse, shop, other). Locations can be deactivated to preserve history.</p>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /> Show active only</label>
        <span className="ml-auto text-xs text-stone-500">{items.length} shown</span>
      </div>

      {items.map((loc) => (
        <div key={loc.id} className="flex items-center justify-between rounded bg-white p-2">
          {editingId === loc.id ? (
            <div className="flex items-center gap-2 w-full">
              <input className={inputCls} value={editingName} onChange={(e) => setEditingName(e.target.value)} />
              <select className={inputCls} value={editingKind} onChange={(e) => setEditingKind(e.target.value as any)}>
                <option value="bench">Bench</option>
                <option value="tunnel">Tunnel</option>
                <option value="shadehouse">Shadehouse</option>
                <option value="shop">Shop</option>
                <option value="other">Other</option>
              </select>
              <div className="ml-auto flex gap-2">
                <button className="underline" onClick={() => saveEdit(loc.id)}>Save</button>
                <button className="underline" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <span>{loc.name} <span className="text-stone-500">· {loc.kind}{loc.active ? '' : ' · inactive'}</span></span>
              <div className="flex gap-2">
                <button className="underline" onClick={() => startEdit(loc)}>Edit</button>
                <button className="underline text-red-700" onClick={() => { if (loc.active) setConfirm({ id: loc.id, name: loc.name, active: !!loc.active }); else toggleActive(loc.id, !!loc.active); }}>{loc.active ? 'Deactivate' : 'Reactivate'}</button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={inputCls} placeholder="New location name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <select className={inputCls} value={newKind} onChange={(e) => setNewKind(e.target.value as any)}>
          <option value="bench">Bench</option>
          <option value="tunnel">Tunnel</option>
          <option value="shadehouse">Shadehouse</option>
          <option value="shop">Shop</option>
          <option value="other">Other</option>
        </select>
        <Btn primary disabled={!newName.trim()} onClick={create}>Add</Btn>
      </div>

      {err && <Msg kind="err">{err}</Msg>}
    </section>
  );
}



function CsvTools() {
  const [csv, setCsv] = useState('');
  const [res, setRes] = useState<{ create: number; update: number; errors: { row: number; message: string }[]; dryRun: boolean } | null>(null);
  const [err, setErr] = useState('');
  const run = async (commit: boolean) => {
    setErr('');
    try { setRes(await api('/api/import/products', { method: 'POST', json: { csv, commit } })); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">CSV import / export</h3>
      <a className="inline-block rounded-lg bg-stone-200 px-4 py-3" href="/api/export/products.csv" download>Export products CSV</a>
      <input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setCsv(await f.text()); setRes(null); } }} />
      <div className="flex flex-wrap gap-2">
        <Btn disabled={!csv} onClick={() => run(false)}>Preview</Btn>
        <Btn primary disabled={!res || res.errors.length > 0 || !res.dryRun} onClick={() => run(true)}>Commit import</Btn>
      </div>
      {res && (
        <Msg kind={res.errors.length ? 'err' : 'ok'}>
          {res.dryRun ? 'Preview' : 'Imported'}: {res.create} new, {res.update} updated, {res.errors.length} errors
          {res.errors.slice(0, 10).map((x) => <span key={x.row} className="block">Row {x.row}: {x.message}</span>)}
        </Msg>
      )}
      {err && <Msg kind="err">{err}</Msg>}
    </section>
  );
}

interface User { id: string; name: string; email: string | null; role: 'owner' | 'staff'; active: boolean }
function Users({ meId }: { meId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [f, setF] = useState({ email: '', name: '', role: 'staff' });
  const [err, setErr] = useState('');
  const load = useCallback(() => api<User[]>('/api/users').then(setUsers).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const patch = async (id: string, body: object) => { try { await api(`/api/users/${id}`, { method: 'PATCH', json: body }); load(); } catch (e) { setErr((e as Error).message); } };
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Staff</h3>
      {users.map((u) => (
        <div key={u.id} className="flex flex-col items-start justify-between gap-2 rounded bg-white p-2 text-sm sm:flex-row sm:items-center">
          <span className="min-w-0 break-words">{u.name || u.email} <span className="text-stone-500">{u.email} · {u.role}{u.active ? '' : ' · disabled'}</span></span>
          {u.id !== meId && (
            <span className="flex flex-wrap gap-x-2 gap-y-1">
              <button className="underline" onClick={() => patch(u.id, { role: u.role === 'owner' ? 'staff' : 'owner' })}>{u.role === 'owner' ? 'Make staff' : 'Make owner'}</button>
              <button className="underline" onClick={() => patch(u.id, { active: !u.active })}>{u.active ? 'Disable' : 'Enable'}</button>
            </span>
          )}
        </div>
      ))}
      <input className={inputCls} placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className={inputCls} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="staff">Staff</option><option value="owner">Owner</option></select>
      <Btn primary onClick={async () => { try { await api('/api/users', { method: 'POST', json: f }); setF({ email: '', name: '', role: 'staff' }); load(); } catch (e) { setErr((e as Error).message); } }}>Invite by email</Btn>
      {err && <Msg kind="err">{err}</Msg>}
    </section>
  );
}

function QueuedTransfers() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [locationsMap, setLocationsMap] = useState<Record<string, string>>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [lastDiscarded, setLastDiscarded] = useState<any | null>(null);
  const [lastDiscardedAll, setLastDiscardedAll] = useState<any[] | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const [showDiscardAll, setShowDiscardAll] = useState(false);

  const load = useCallback(() => listTransferQueue().then(setItems).catch((e) => setErr((e as Error).message)), []);
  useEffect(() => { load(); (async () => {
    try {
      const locs = await api<Location[]>('/api/locations');
      const map: Record<string, string> = {};
      for (const l of locs) map[l.id] = l.name;
      setLocationsMap(map);
    } catch {
      setLocationsMap({});
    }
  })(); }, [load]);

  const retryAll = async () => {
    setErr('');
    try { await flushTransferQueue(); load(); } catch (e) { setErr((e as Error).message); }
  };

  const retryOne = async (id: string) => {
    setErr('');
    setRetryingId(id);
    try {
      const res = await retryQueuedTransfer(id);
      if (!res.ok) throw new Error(res.error || 'Failed');
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRetryingId(null);
    }
  };

  const discard = async (id: string) => {
    setErr('');
    try {
      // fetch item before deleting to allow undo
      const list = await listTransferQueue();
      const it = list.find((x) => x.client_op_id === id) ?? null;
      await discardQueuedTransfer(id);
      setLastDiscarded(it);
      load();
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = window.setTimeout(() => setLastDiscarded(null), 8000);
    } catch (e) { setErr((e as Error).message); }
  };

  const undoLast = async () => {
    if (!lastDiscarded) return;
    try {
      await enqueueTransfer(lastDiscarded);
      setLastDiscarded(null);
      load();
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    } catch (e) { setErr((e as Error).message); }
  };

  const discardAll = async () => {
    setErr('');
    try {
      const list = await listTransferQueue();
      if (list.length === 0) return;
      setLastDiscardedAll(list);
      await clearTransferQueue();
      load();
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = window.setTimeout(() => setLastDiscardedAll(null), 8000);
    } catch (e) { setErr((e as Error).message); }
  };

  const undoDiscardAll = async () => {
    if (!lastDiscardedAll) return;
    try {
      for (const item of lastDiscardedAll) await enqueueTransfer(item);
      setLastDiscardedAll(null);
      load();
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    } catch (e) { setErr((e as Error).message); }
  };

  useEffect(() => { load(); return () => { if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current); }; }, [load]);

  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Queued transfers</h3>
      <p className="text-sm text-stone-600">Transfers queued while offline. Items are retried automatically when the app reconnects; you can retry or discard here.</p>
      {lastDiscarded && (
        <div className="rounded bg-amber-50 p-2 text-sm">
          Discarded {lastDiscarded.product_name} · {lastDiscarded.qty}. <button className="underline" onClick={undoLast}>Undo</button>
        </div>
      )}
      {lastDiscardedAll && (
        <div className="rounded bg-amber-50 p-2 text-sm">
          Discarded all queued transfers. <button className="underline" onClick={undoDiscardAll}>Undo</button>
        </div>
      )}
      {items.length === 0 ? <div className="rounded bg-white p-3 text-sm text-stone-500">No queued transfers</div> : (
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.client_op_id} className="flex items-center justify-between rounded bg-white p-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{t.product_name} · {t.qty}</div>
                <div className="text-xs text-stone-500">{t.from_location_id ? locationsMap[t.from_location_id] ?? t.from_location_id : 'Unassigned'} → {t.to_location_id ? locationsMap[t.to_location_id] ?? t.to_location_id : 'Unassigned'} · {new Date(t.queued_at).toLocaleString()}</div>
                {t.error && <div className="text-xs text-red-700">Error: {t.error}</div>}
              </div>
              <div className="flex gap-2">
                <button className="underline" onClick={() => discard(t.client_op_id)}>Discard</button>
                <button className="underline" disabled={retryingId === t.client_op_id} onClick={() => retryOne(t.client_op_id)}>
                  {retryingId === t.client_op_id ? 'Retrying…' : 'Retry'}
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button className="rounded-lg border px-3 py-2 text-sm" onClick={load}>Refresh</button>
            <button className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white" onClick={retryAll}>Retry all</button>
            <button className="rounded-lg border px-3 py-2 text-sm text-red-700" onClick={() => setShowDiscardAll(true)}>Discard all</button>
          </div>
          {showDiscardAll && (
            <Modal title="Discard all queued transfers" onCancel={() => setShowDiscardAll(false)} onConfirm={() => { discardAll(); setShowDiscardAll(false); }} confirmText="Discard all" cancelText="Cancel">
              <p className="text-sm">Discarding all queued transfers will permanently remove them. Do you want to continue?</p>
            </Modal>
          )}
          {err && <Msg kind="err">{err}</Msg>}
        </div>
      )}
    </section>
  );
}

function PriceHistory() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const load = useCallback(() => api<any[]>('/api/movements?reason=sale&limit=50').then(setItems).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Recent price history (sales)</h3>
      <p className="text-sm text-stone-600">Sale movements with snapshotted unit price and line total.</p>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {items.length === 0 && <p className="text-xs text-stone-500">No sale history yet.</p>}
      <div className="max-h-48 overflow-auto rounded border bg-white p-2">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-stone-200"><th className="p-1 text-left">Product</th><th className="p-1 text-right">Qty</th><th className="p-1 text-right">Unit price</th><th className="p-1 text-right">Line total</th><th className="p-1 text-left">At</th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-b border-stone-100">
                <td className="p-1">{m.products?.name ?? m.product_id}</td>
                <td className="p-1 text-right">{Math.abs(m.delta)}</td>
                <td className="p-1 text-right">{m.unit_price == null ? '—' : new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(m.unit_price)}</td>
                <td className="p-1 text-right">{m.line_total == null ? '—' : new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(m.line_total)}</td>
                <td className="p-1 text-stone-500">{new Date(m.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ManageView({ meId, focusSection, onFocused }: { meId: string; focusSection?: string | null; onFocused?: () => void }) {
  return (
    <div className="space-y-6">
      <Simple<Category> title="Categories" path="/api/categories" />
      <Locations focus={focusSection === 'locations'} onFocused={onFocused} />
      <PotSizesEditor focus={focusSection === 'pot-sizes'} onFocused={onFocused} />
      <GradesEditor focus={focusSection === 'grades'} onFocused={onFocused} />
      <PriceBookTable />
      <PriceHistory />
          <QueuedTransfers />
          <CsvTools />
          <Labels />
          <Users meId={meId} />
    </div>
  );
}
