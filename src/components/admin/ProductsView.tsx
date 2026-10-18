import { useCallback, useEffect, useState } from 'react';
import { api, type Category, type Product } from '../../lib/client/api';
import Scanner from './Scanner';
import { Btn, Field, Msg, Section, inputCls } from './ui';

const blank = { sku: '', name: '', botanical_name: '', pot_size: '', price: '', reorder_level: '20', public_description: '', public_image_url: '', public_image_alt: '', notes: '', category_id: '' };
const priceFormat = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });

function ProductForm({ product, categories, onDone }: { product: Product | null; categories: Category[]; onDone: () => void }) {
  const [f, setF] = useState(() =>
    product
      ? {
          sku: product.sku,
          name: product.name,
          botanical_name: product.botanical_name ?? '',
          pot_size: product.pot_size ?? '',
          price: product.price?.toString() ?? '',
          reorder_level: String(product.reorder_level),
          public_description: product.public_description ?? '',
          public_image_url: product.public_image_url ?? '',
          public_image_alt: product.public_image_alt ?? '',
          notes: product.notes ?? '',
          category_id: product.category_id ?? '',
        }
      : blank,
  );
  const [barcodes, setBarcodes] = useState<string[]>(product?.product_barcodes?.map((b) => b.barcode) ?? []);
  const [newCode, setNewCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [batches, setBatches] = useState<NonNullable<Product['batches']>>([]);
  const [newBatch, setNewBatch] = useState('');
  const [newBatchDate, setNewBatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [stockLevels, setStockLevels] = useState<NonNullable<Product['stock_levels']>>([]);
  const [stockBatchId, setStockBatchId] = useState('');
  const [stockCount, setStockCount] = useState('');
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockMsg, setStockMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!product) return;
    setStockLoading(true);
    Promise.all([
      api<NonNullable<Product['batches']>>(`/api/batches?product_id=${product.id}`),
      api<Product>(`/api/products/${product.id}`),
    ])
      .then(([productBatches, details]) => {
        setBatches(productBatches);
        setStockLevels(details.stock_levels ?? []);
        setStockBatchId((current) =>
          current === '' || productBatches.some((batch) => batch.id === current) ? current : '',
        );
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setStockLoading(false));
  }, [product]);

  const currentStock = stockLevels
    .filter((level) => level.batch_id === (stockBatchId || null))
    .reduce((total, level) => total + level.qty, 0);

  useEffect(() => {
    setStockCount(String(currentStock));
  }, [currentStock]);

  const saveStockCount = async () => {
    if (!product || !/^\d+$/.test(stockCount) || Number(stockCount) > 1_000_000) return;
    setStockSaving(true);
    setStockMsg(null);
    try {
      await api('/api/stock/count', {
        method: 'POST',
        json: {
          client_op_id: crypto.randomUUID(),
          product_id: product.id,
          batch_id: stockBatchId || null,
          counted_qty: Number(stockCount),
          note: `Manual on-hand count for batch ${batches.find((batch) => batch.id === stockBatchId)?.batch_code ?? 'unassigned'}`,
        },
      });
      const details = await api<Product>(`/api/products/${product.id}`);
      setStockLevels(details.stock_levels ?? []);
      setStockMsg({ kind: 'ok', text: `On-hand stock set to ${stockCount}` });
    } catch (e) {
      setStockMsg({ kind: 'err', text: (e as Error).message });
    } finally {
      setStockSaving(false);
    }
  };

  const addCode = (c: string) => {
    const code = c.trim();
    if (code && !barcodes.includes(code)) setBarcodes([...barcodes, code]);
    setNewCode('');
  };

  const save = async () => {
    setErr('');
    const payload = {
      sku: f.sku,
      name: f.name,
      botanical_name: f.botanical_name || null,
      pot_size: f.pot_size || null,
      price: f.price === '' ? null : Number(f.price),
      reorder_level: Number(f.reorder_level) || 0,
      public_description: f.public_description,
      public_image_url: f.public_image_url || null,
      public_image_alt: f.public_image_alt,
      notes: f.notes || null,
      category_id: f.category_id || null,
      barcodes: barcodes.map((barcode) => ({ barcode, type: /^\d{8,13}$/.test(barcode) ? 'EAN' : barcode.startsWith('WN:') ? 'QR' : 'CODE128' })),
    };
    try {
      if (product) await api(`/api/products/${product.id}`, { method: 'PATCH', json: payload });
      else await api('/api/products', { method: 'POST', json: payload });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file || !product) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api(`/api/products/${product.id}/image`, { method: 'POST', body: fd });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const addBatch = async () => {
    if (!product || !newBatch.trim()) return;
    try {
      const b = await api<NonNullable<Product['batches']>[number]>('/api/batches', {
        method: 'POST',
        json: { product_id: product.id, batch_code: newBatch.trim(), potted_on: newBatchDate || null },
      });
      setBatches([b, ...batches]);
      setStockBatchId(b.id);
      setNewBatch('');
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onDone} className="rounded-lg px-2 py-1 text-sm text-stone-600 hover:bg-stone-200" aria-label="Back to products">← Products</button>
        <h2 className="min-w-0 truncate text-lg font-semibold text-[#2f4a37]">{product ? product.name : 'New product'}</h2>
      </div>
      <Section title="Basics" hint="What this plant is and how it is sold.">
      <Field label="SKU"><input className={inputCls} value={f.sku} onChange={set('sku')} maxLength={64} /></Field>
      <Field label="Name"><input className={inputCls} value={f.name} onChange={set('name')} maxLength={200} /></Field>
      <Field label="Botanical name"><input className={inputCls} value={f.botanical_name} onChange={set('botanical_name')} /></Field>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="Pot size"><input className={inputCls} value={f.pot_size} onChange={set('pot_size')} /></Field>
        <Field label="Price"><input className={inputCls} inputMode="decimal" value={f.price} onChange={set('price')} /></Field>
        <Field label="Low stock"><input className={inputCls} inputMode="numeric" value={f.reorder_level} onChange={set('reorder_level')} /><span className="mt-1 block text-xs text-stone-500">Show a low-stock alert at or below this quantity.</span></Field>
        <Field label="Category">
          <select className={inputCls} value={f.category_id} onChange={set('category_id')} required>
            <option value="">Choose a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      {categories.length === 0 && <Msg kind="err">Create a category in Setup before adding a product.</Msg>}
      </Section>
      <Section title="Website listing" hint="Shown on the public site.">
      <Field label="Website description"><textarea className={inputCls} value={f.public_description} onChange={set('public_description')} maxLength={3000} /></Field>
      <Field label="Website image URL"><input className={inputCls} type="url" value={f.public_image_url} onChange={set('public_image_url')} /></Field>
      <Field label="Website image description"><input className={inputCls} value={f.public_image_alt} onChange={set('public_image_alt')} maxLength={300} /></Field>
      </Section>
      <Section title="Internal notes">
      <Field label="Notes"><textarea className={inputCls} value={f.notes} onChange={set('notes')} maxLength={2000} /></Field>
      </Section>

      <Section title="Barcodes" hint="Scan or type codes that identify this product.">
        {barcodes.length === 0 && <p className="text-sm text-stone-500">No barcodes yet.</p>}
        {barcodes.map((b) => (
          <div key={b} className="flex items-center justify-between rounded bg-stone-100 px-3 py-2">
            <code className="break-all">{b}</code>
            <button className="text-red-700" onClick={() => setBarcodes(barcodes.filter((x) => x !== b))}>Remove</button>
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className={inputCls} value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Enter or scan barcode" />
          <Btn onClick={() => addCode(newCode)}>Add</Btn>
          <Btn onClick={() => setScanning(!scanning)}>{scanning ? 'Close scanner' : 'Scan'}</Btn>
        </div>
        {scanning && <Scanner onScan={(c) => { addCode(c); setScanning(false); }} />}
      </Section>

      {product && (
        <>
          <Section title="On-hand stock" hint="Set the counted quantity for one plant batch. Counts are recorded as audited adjustments.">
            {stockLoading ? (
              <p className="text-sm text-stone-500">Loading stock levels…</p>
            ) : (
              <>
                <Field label="Batch / plant age">
                  <select className={inputCls} value={stockBatchId} onChange={(e) => setStockBatchId(e.target.value)}>
                    <option value="">Unassigned batch</option>
                    {batches.filter((batch) => batch.archived_at === null).map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batch_code}{batch.potted_on ? ` · potted ${batch.potted_on}` : ' · date not set'}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="text-sm">Current on hand in this batch: <b>{currentStock}</b></p>
                <Field label="Counted on hand">
                  <input
                    className={inputCls}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1_000_000}
                    value={stockCount}
                    onChange={(e) => setStockCount(e.target.value)}
                  />
                </Field>
                <Btn
                  primary
                  disabled={stockSaving || !/^\d+$/.test(stockCount) || Number(stockCount) > 1_000_000 || Number(stockCount) === currentStock}
                  onClick={saveStockCount}
                >
                  {stockSaving ? 'Updating stock…' : 'Update on-hand stock'}
                </Btn>
              </>
            )}
            {stockMsg && <Msg kind={stockMsg.kind}>{stockMsg.text}</Msg>}
          </Section>
          <Section title="Photo" hint="JPEG, PNG or WebP, max 5MB. Uploading saves immediately.">
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => upload(e.target.files?.[0])} />
          </Section>
          <Section title="Batches (plant age)" hint="Track groups of plants potted at the same time.">
            <div className="space-y-2">{batches.map((b) => (
              <div key={b.id} className="rounded bg-stone-100 px-3 py-2 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <span className="min-w-0 break-words font-medium">{b.batch_code}{b.potted_on ? ` · potted ${b.potted_on}` : ''}</span>
                  <span className={b.archived_at ? 'text-stone-500' : 'text-green-800'}>{b.archived_at ? 'Archived' : 'Active · ' + (b.qty ?? stockLevels.filter((level) => level.batch_id === b.id).reduce((total, level) => total + level.qty, 0)) + ' on hand'}</span>
                </div>
                <code className="mt-1 block break-all text-stone-600">{b.barcode}</code>
                {!b.archived_at && (b.qty ?? stockLevels.filter((level) => level.batch_id === b.id).reduce((total, level) => total + level.qty, 0)) === 0 && (
                  <button
                    className="mt-2 text-sm text-red-700 underline"
                    onClick={async () => {
                      if (!confirm(`Archive batch ${b.batch_code}? This is only available when its stock is zero.`)) return;
                      try {
                        const result = await api<{ archived_at: string }>(`/api/batches/${b.id}`, { method: 'PATCH' });
                        setBatches((current) => current.map((batch) => batch.id === b.id ? { ...batch, archived_at: result.archived_at } : batch));
                        if (stockBatchId === b.id) setStockBatchId('');
                      } catch (e) {
                        setErr((e as Error).message);
                      }
                    }}
                  >
                    Archive batch
                  </button>
                )}
              </div>
            ))}</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className={inputCls} value={newBatch} onChange={(e) => setNewBatch(e.target.value)} placeholder="Batch / age (e.g. Autumn 2026)" maxLength={64} />
              <input className={inputCls} type="date" aria-label="Batch potting date" value={newBatchDate} onChange={(e) => setNewBatchDate(e.target.value)} />
              <Btn onClick={addBatch}>Add batch</Btn>
            </div>
          </Section>
        </>
      )}

      {err && <Msg kind="err">{err}</Msg>}
      {product && (
        <Btn className="w-full text-red-700" onClick={async () => { if (confirm('Archive this product?')) { await api(`/api/products/${product.id}`, { method: 'DELETE' }); onDone(); } }}>
          Archive product
        </Btn>
      )}
      <div className="sticky bottom-20 z-10 -mx-1 grid grid-cols-2 gap-2 rounded-2xl border border-[#e6ebe3] bg-white/95 p-2 shadow-lg backdrop-blur lg:bottom-4">
        <Btn onClick={onDone}>Cancel</Btn>
        <Btn primary disabled={categories.length === 0 || !f.category_id || !f.sku.trim() || !f.name.trim()} onClick={save}>Save product</Btn>
      </div>
    </div>
  );
}

export default function ProductsView({ role }: { role: 'owner' | 'staff' }) {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [categoryId, setCategoryId] = useState('');

  const load = useCallback(async () => {
    try {
      setErr('');
      const r = await api<{ items: Product[] }>(`/api/products?limit=100&q=${encodeURIComponent(q)}`);
      setItems(r.items);
      setCategories(await api<Category[]>('/api/categories'));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  if (editing && role === 'owner') {
    return <ProductForm product={editing === 'new' ? null : editing} categories={categories} onDone={() => { setEditing(null); load(); }} />;
  }

  const isLow = (p: Product) => p.reorder_level > 0 && (p.total_qty ?? 0) <= p.reorder_level;
  const visible = items.filter((p) => (filter === 'all' || isLow(p)) && (!categoryId || p.category_id === categoryId));
  const lowCount = items.filter(isLow).length;
  const filtered = Boolean(q) || filter === 'low' || Boolean(categoryId);
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-sm transition ${active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={inputCls} type="search" aria-label="Search products" placeholder="Search name, SKU, botanical…" value={q} onChange={(e) => setQ(e.target.value)} />
        {role === 'owner' && <Btn primary className="shrink-0" onClick={() => setEditing('new')}>+ Add product</Btn>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={chip(filter === 'all')} onClick={() => setFilter('all')}>All</button>
        <button type="button" className={chip(filter === 'low')} onClick={() => setFilter('low')}>Low stock{lowCount > 0 ? ` (${lowCount})` : ''}</button>
        {categories.length > 0 && (
          <select className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm" aria-label="Filter by category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <span className="ml-auto text-xs text-stone-500" aria-live="polite">{visible.length} product{visible.length === 1 ? '' : 's'}</span>
      </div>
      {role !== 'owner' && <p className="text-xs text-stone-500">View only — ask an owner to edit products.</p>}
      {err && <Msg kind="err">{err}</Msg>}
      <ul className="space-y-2">
        {visible.map((p) => {
          const imageSrc = p.image_path ? `/api/products/${p.id}/image` : p.public_image_url;
          return (
            <li key={p.id}>
              <button className="flex w-full items-center gap-3 rounded-xl border border-[#e6ebe3] bg-white p-3 text-left transition enabled:hover:border-green-600 enabled:hover:shadow-sm" onClick={() => setEditing(p)} disabled={role !== 'owner'}>
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={p.public_image_alt}
                    loading="lazy"
                    className="h-14 w-14 rounded object-cover"
                  />
                ) : <div className="h-14 w-14 rounded bg-stone-200" />}
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{p.name}</p>
                  <p className="break-words text-sm text-stone-600">
                    {p.sku}{p.pot_size ? ` · ${p.pot_size}` : ''}
                    {p.category_id && ` · ${categories.find((category) => category.id === p.category_id)?.name ?? 'Category'}`}
                  </p>
                  {p.public_description && <p className="mt-1 line-clamp-2 text-xs text-stone-500">{p.public_description}</p>}
                </div>
                <span className="text-right">
                  <span className="block text-sm font-medium">{p.price === null ? 'Price unset' : priceFormat.format(p.price)}</span>
                  <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm ${isLow(p) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{p.total_qty ?? 0}</span>
                </span>
              </button>
            </li>
          );
        })}
        {loading && <li className="text-stone-500">Loading products…</li>}
        {!loading && visible.length === 0 && (
          <li className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
            {filtered ? 'No products match your filters.' : 'No products yet.'}
            {filtered && <button type="button" className="ml-2 underline" onClick={() => { setQ(''); setFilter('all'); setCategoryId(''); }}>Clear filters</button>}
          </li>
        )}
      </ul>
    </div>
  );
}
