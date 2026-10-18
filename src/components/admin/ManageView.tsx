import { useCallback, useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { api, type Category, type Product } from '../../lib/client/api';
import { Btn, Msg, inputCls } from './ui';

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
      <div className="grid grid-cols-3 gap-2 print:grid-cols-4">
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
      <div className="flex gap-2">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${title.toLowerCase()}`} maxLength={80} />
        <Btn primary disabled={!name.trim()} onClick={async () => { try { await api(path, { method: 'POST', json: { name: name.trim() } }); setName(''); load(); } catch (e) { setErr((e as Error).message); } }}>Add</Btn>
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
      <div className="flex gap-2">
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
        <div key={u.id} className="flex items-center justify-between gap-2 rounded bg-white p-2 text-sm">
          <span>{u.name || u.email} <span className="text-stone-500">{u.email} · {u.role}{u.active ? '' : ' · disabled'}</span></span>
          {u.id !== meId && (
            <span className="flex gap-2">
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

export default function ManageView({ meId }: { meId: string }) {
  return (
    <div className="space-y-6">
      <Simple<Category> title="Categories" path="/api/categories" />
      <CsvTools />
      <Labels />
      <Users meId={meId} />
    </div>
  );
}
