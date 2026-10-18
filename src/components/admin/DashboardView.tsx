import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Category, type Movement, type Product } from '../../lib/client/api';
import { Msg } from './ui';

interface Low { product_id: string; sku: string; name: string; reorder_level: number; total_qty: number }
type WorkflowTab = 'manage' | 'products' | 'scan' | 'stocktake' | 'activity';
type BatchFilter = 'all' | 'attention' | 'low' | 'empty';

const numberFormat = new Intl.NumberFormat('en-NZ');

function Icon({ name, className = 'h-5 w-5' }: { name: 'plant' | 'layers' | 'box' | 'arrow' | 'search' | 'refresh' | 'alert' | 'clock' | 'plus' | 'scan' | 'check'; className?: string }) {
  const paths: Record<typeof name, ReactNode> = {
    plant: <><path d="M12 21v-9" /><path d="M12 12C5 12 4 7 4 4c5 0 8 2 8 8Z" /><path d="M12 15c0-5 3-8 8-8 0 5-2 8-8 8Z" /><path d="M6 21h12" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2" /></>,
    alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    scan: <><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" /><path d="M7 12h10" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const mins = Math.floor(elapsed / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

export default function DashboardView({
  role,
  onNavigate,
}: {
  role: 'owner' | 'staff';
  onNavigate: (target: WorkflowTab) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [low, setLow] = useState<Low[]>([]);
  const [moves, setMoves] = useState<Movement[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BatchFilter>('all');
  const [search, setSearch] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [categoryRows, firstProductPage, lowRows, movementRows] = await Promise.all([
        api<Category[]>('/api/categories'),
        api<{ items: Product[]; total: number }>('/api/products?limit=100'),
        api<Low[]>('/api/stock/low'),
        api<{ items: Movement[] }>('/api/movements?limit=8'),
      ]);
      const productPages = await Promise.all(
        Array.from(
          { length: Math.max(0, Math.ceil(firstProductPage.total / 100) - 1) },
          (_, index) => api<{ items: Product[] }>(`/api/products?limit=100&offset=${(index + 1) * 100}`),
        ),
      );
      setCategories(categoryRows);
      setProducts([firstProductPage, ...productPages].flatMap((page) => page.items));
      setLow(lowRows);
      setMoves(movementRows.items);
      setUpdatedAt(new Date());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeBatches = useMemo(() => products.flatMap((product) =>
    (product.batches ?? [])
      .filter((batch) => batch.archived_at === null)
      .map((batch) => ({
        ...batch,
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        category_id: product.category_id,
        reorder_level: product.reorder_level,
        qty: batch.qty ?? 0,
      })),
  ), [products]);
  const zeroStockBatches = activeBatches.filter((batch) => batch.qty === 0);
  const emptyBatchProductIds = new Set(zeroStockBatches.map((batch) => batch.product_id));
  const outOfStockProducts = low.filter((product) => product.total_qty === 0 && !emptyBatchProductIds.has(product.product_id));
  const lowStockProducts = low.filter((product) => product.total_qty > 0);
  const totalStock = products.reduce((total, product) => total + (product.total_qty ?? 0), 0);
  const lowBatchCount = activeBatches.filter((batch) => batch.qty > 0 && batch.reorder_level > 0 && batch.qty <= batch.reorder_level).length;
  const activeProductCount = products.filter((product) => product.active).length;
  const hasProducts = products.length > 0;
  const allProductsHaveBatches = hasProducts && products.every((product) =>
    product.batches?.some((batch) => batch.archived_at === null),
  );
  const workflow: {
    title: string;
    description: string;
    complete: boolean;
    tab: WorkflowTab;
    action: string;
    icon: 'layers' | 'plant' | 'box' | 'scan';
  }[] = [
    { title: 'Organize categories', description: 'Group your range so products are easy to manage.', complete: categories.length > 0, tab: 'manage', action: 'Set up categories', icon: 'layers' },
    { title: 'Add your plants', description: 'Create products and place them in a category.', complete: hasProducts, tab: 'products', action: 'Add a product', icon: 'plant' },
    { title: 'Set up batches', description: 'Track growing groups separately and print batch labels.', complete: allProductsHaveBatches, tab: 'products', action: 'Manage batches', icon: 'box' },
    { title: 'Record stock', description: 'Enter an on-hand count or scan stock in by batch.', complete: totalStock > 0, tab: 'scan', action: 'Record stock', icon: 'scan' },
  ];
  const completeSteps = workflow.filter((step) => step.complete).length;
  const nextStep = workflow.find((step) => !step.complete);
  const filteredBatches = activeBatches.filter((batch) => {
    const isLow = batch.qty > 0 && batch.reorder_level > 0 && batch.qty <= batch.reorder_level;
    const matchesFilter = filter === 'all'
      || (filter === 'attention' && (batch.qty === 0 || isLow))
      || (filter === 'empty' && batch.qty === 0)
      || (filter === 'low' && isLow);
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${batch.product_name} ${batch.product_sku} ${batch.batch_code}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  const categoryCounts = categories.map((category) => ({
    ...category,
    count: products.filter((product) => product.category_id === category.id).length,
  })).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((category) => category.count));
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#6f7b70]">{new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1d3428]">Dashboard</h1>
          <p className="mt-2 text-sm text-[#69766d] sm:text-base">Your nursery stock position and the items that need attention.</p>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && <span className="hidden text-xs text-[#849087] sm:inline" aria-live="polite">Updated {updatedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}</span>}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce4d9] bg-white px-3 text-sm font-medium text-[#3c5745] shadow-sm transition hover:border-[#b8c9b9] hover:bg-[#f7faf5] disabled:opacity-60"
          >
            <Icon name="refresh" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {([
          ['scan', 'Move stock', 'Scan in, out or adjust', 'scan'],
          ['stocktake', 'Stocktake', 'Count and reconcile', 'check'],
          ['products', 'Products', 'Plants, batches & labels', 'plant'],
        ] as const).map(([tab, title, hint, icon]) => (
          <button
            key={tab}
            type="button"
            onClick={() => onNavigate(tab)}
            className={`group flex min-h-12 items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2c5a3e] ${tab === 'scan' ? 'col-span-2 border-[#2c5a3e] bg-[#2c5a3e] text-white shadow-sm hover:bg-[#244d34] sm:col-span-1' : 'border-[#dce4d9] bg-white text-[#36543e] hover:border-[#b8c9b9] hover:bg-[#f7faf5]'}`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tab === 'scan' ? 'bg-white/15' : 'bg-[#edf4eb]'}`}><Icon name={icon} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{title}</span>
              <span className={`block truncate text-xs ${tab === 'scan' ? 'text-[#d3e3d4]' : 'text-[#77867a]'}`}>{hint}</span>
            </span>
            <Icon name="arrow" className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${tab === 'scan' ? 'text-white' : 'text-[#829185]'}`} />
          </button>
        ))}
      </nav>

      {err && (
        <Msg kind="err">
          <span className="block">{err}</span>
          <span className="block mt-2">
            <button type="button" className="underline" onClick={() => void load()}>Try again</button>
          </span>
        </Msg>
      )}

      <section aria-label="Inventory summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon="box" label="Units on hand" value={loading || err ? '—' : numberFormat.format(totalStock)} detail="Across active products" tone="blue" onClick={() => onNavigate('stocktake')} />
        <Metric icon="alert" label="Low-stock products" value={loading || err ? '—' : numberFormat.format(lowStockProducts.length)} detail="Positive stock at or below reorder" tone="rose" onClick={() => onNavigate('products')} />
        <Metric icon="layers" label="Empty batches" value={loading || err ? '—' : numberFormat.format(zeroStockBatches.length)} detail="Active batches with no stock" tone="sand" onClick={() => { setFilter('empty'); setSearch(''); }} />
        <Metric icon="plant" label="Active products" value={loading || err ? '—' : numberFormat.format(activeProductCount)} detail={`${numberFormat.format(categories.length)} categories`} tone="green" onClick={() => onNavigate('products')} />
      </section>

      <section aria-labelledby="stock-exceptions-title" className="rounded-2xl border border-[#e5e9e2] bg-white shadow-[0_4px_20px_rgba(29,52,40,.035)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0eb] px-4 py-4 sm:px-5">
          <div>
            <h2 id="stock-exceptions-title" className="text-base font-semibold text-[#26392d]">Stock exceptions</h2>
            <p className="mt-1 text-sm text-[#7c887e]">Low-stock products and empty active batches</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lowStockProducts.length + outOfStockProducts.length + zeroStockBatches.length ? 'bg-[#fff2e6] text-[#8a4b21]' : 'bg-[#edf5ec] text-[#3e6945]'}`}>
            {loading ? 'Checking stock' : lowStockProducts.length + outOfStockProducts.length + zeroStockBatches.length ? `${lowStockProducts.length + outOfStockProducts.length + zeroStockBatches.length} need review` : 'All clear'}
          </span>
        </div>
        {loading ? (
          <div className="space-y-2 p-4 sm:p-5" role="status" aria-label="Loading stock exceptions">
            <div className="h-16 animate-pulse rounded-xl bg-[#f3f5f1]" />
            <div className="h-16 animate-pulse rounded-xl bg-[#f3f5f1]" />
          </div>
        ) : err ? (
          <p className="px-4 py-6 text-sm text-[#8b3e35] sm:px-5">Stock exceptions are unavailable. Refresh the dashboard to try again.</p>
        ) : lowStockProducts.length === 0 && outOfStockProducts.length === 0 && zeroStockBatches.length === 0 ? (
          <div className="m-4 flex items-center gap-3 rounded-xl bg-[#f2f7ef] p-4 text-sm text-[#456b4b] sm:m-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white"><Icon name="check" className="h-4 w-4" /></span>
            No low-stock products or empty active batches.
          </div>
        ) : (
          <ul className="grid min-w-0 grid-cols-1 gap-2 p-4 sm:grid-cols-2 sm:p-5">
            {zeroStockBatches.slice(0, 4).map((batch) => (
              <li key={batch.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onNavigate('products')}
                  aria-label={`Inspect empty batch ${batch.batch_code} for ${batch.product_name}`}
                  className="flex min-h-16 min-w-0 w-full items-center gap-3 rounded-xl border border-[#f0ddda] bg-[#fff8f6] p-3 text-left transition hover:border-[#e7c4be] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64b3f]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#a64b3f]"><Icon name="box" className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#493b37]">{batch.product_name}</span>
                    <span className="block truncate text-xs text-[#806d67]">{batch.batch_code} · {batch.product_sku} · 0 on hand</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#f7e6e3] px-2 py-1 text-[11px] font-semibold text-[#873e35]">Empty</span>
                </button>
              </li>
            ))}
            {outOfStockProducts.slice(0, 4).map((product) => (
              <li key={product.product_id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onNavigate('products')}
                  aria-label={`Inspect out-of-stock product ${product.name}, SKU ${product.sku}`}
                  className="flex min-h-16 min-w-0 w-full items-center gap-3 rounded-xl border border-[#f0ddda] bg-[#fff8f6] p-3 text-left transition hover:border-[#e7c4be] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64b3f]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#a64b3f]"><Icon name="alert" className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#493b37]">{product.name}</span>
                    <span className="block truncate text-xs text-[#806d67]">{product.sku} · 0 on hand · reorder at {numberFormat.format(product.reorder_level)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#f7e6e3] px-2 py-1 text-[11px] font-semibold text-[#873e35]">Out of stock</span>
                </button>
              </li>
            ))}
            {lowStockProducts.slice(0, 4).map((product) => (
              <li key={product.product_id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onNavigate('products')}
                  aria-label={`Inspect low-stock product ${product.name}, SKU ${product.sku}`}
                  className="flex min-h-16 min-w-0 w-full items-center gap-3 rounded-xl border border-[#f0e3ce] bg-[#fffaf2] p-3 text-left transition hover:border-[#e3c99f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#94601f]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#94601f]"><Icon name="alert" className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#493f32]">{product.name}</span>
                    <span className="block truncate text-xs text-[#806f5d]">{product.sku} · {numberFormat.format(product.total_qty)} on hand · reorder at {numberFormat.format(product.reorder_level)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#f5ead6] px-2 py-1 text-[11px] font-semibold text-[#76501c]">Low stock</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!loading && (lowStockProducts.length > 4 || outOfStockProducts.length > 4 || zeroStockBatches.length > 4) && (
          <div className="border-t border-[#edf0eb] px-4 py-3 text-right sm:px-5">
            <button type="button" onClick={() => onNavigate('products')} className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-[#41634b] hover:text-[#1e3e2b]">
              Review all exceptions <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e5e9e2] bg-white shadow-[0_4px_20px_rgba(29,52,40,.035)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0eb] px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-[#26392d]">Batch inventory</h2>
              <p className="mt-1 text-sm text-[#7c887e]">Stock grouped by growing batch</p>
            </div>
            <button type="button" onClick={() => onNavigate('products')} className="inline-flex items-center gap-1 text-sm font-medium text-[#41634b] transition hover:text-[#1e3e2b]">
              All products <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1 rounded-xl bg-[#f4f6f2] p-1" role="group" aria-label="Filter batches">
                {([
                  ['all', 'All batches', activeBatches.length],
                  ['attention', 'Attention', lowBatchCount + zeroStockBatches.length],
                  ['low', 'Low stock', lowBatchCount],
                  ['empty', 'Empty', zeroStockBatches.length],
                ] as const).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${filter === key ? 'bg-white text-[#284432] shadow-sm' : 'text-[#768176] hover:text-[#354a39]'}`}
                  >
                    {label}<span className="ml-1.5 text-[11px] opacity-65">{count}</span>
                  </button>
                ))}
              </div>
              <label className="relative block sm:w-52">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#879188]" />
                <input
                  className="h-10 w-full rounded-xl border border-[#e3e8e1] bg-white pl-9 pr-3 text-sm text-[#26392d] placeholder:text-[#9aa39b] focus:border-[#8ca38d] focus:outline-none focus:ring-2 focus:ring-[#dce8d9]"
                  placeholder="Search batches"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search batches"
                />
              </label>
            </div>

            {loading ? (
              <div className="space-y-2" aria-label="Loading batch inventory">
                {[0, 1, 2].map((item) => <div key={item} className="h-[76px] animate-pulse rounded-xl bg-[#f3f5f1]" />)}
              </div>
            ) : err ? (
              <p className="rounded-xl bg-[#fff5f3] px-4 py-6 text-center text-sm text-[#8b3e35]">Inventory preview is unavailable. Refresh the dashboard to try again.</p>
            ) : filteredBatches.length > 0 ? (
              <div className="divide-y divide-[#edf0eb]">
                {filteredBatches.slice(0, 8).map((batch) => (
                  <BatchRow key={batch.id} batch={batch} onClick={() => onNavigate('products')} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#dce4d9] px-4 py-8 text-center">
                <Icon name="box" className="mx-auto h-7 w-7 text-[#9eaa9e]" />
                <p className="mt-2 text-sm font-medium text-[#526454]">{activeBatches.length === 0 ? 'No active batches yet' : 'No batches match this view'}</p>
                <p className="mt-1 text-xs text-[#849087]">{activeBatches.length === 0 ? 'Create a batch from a product to start tracking stock.' : 'Try a different filter or search term.'}</p>
              </div>
            )}
            {filteredBatches.length > 8 && (
              <button type="button" onClick={() => onNavigate('products')} className="w-full rounded-xl border border-[#e3e8e1] py-2.5 text-sm font-medium text-[#4c6652] transition hover:bg-[#f7faf5]">
                View all {filteredBatches.length} batches
              </button>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section aria-labelledby="recent-activity-title" className="overflow-hidden rounded-2xl border border-[#e5e9e2] bg-white shadow-[0_4px_20px_rgba(29,52,40,.035)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0eb] px-4 py-4 sm:px-5">
              <div>
                <h2 id="recent-activity-title" className="text-base font-semibold text-[#26392d]">Recent activity</h2>
                <p className="mt-1 text-sm text-[#7c887e]">Latest changes to your stock</p>
              </div>
              <button type="button" onClick={() => onNavigate('activity')} className="inline-flex min-h-9 shrink-0 items-center gap-1 text-sm font-medium text-[#41634b] hover:text-[#1e3e2b]">
                View history <Icon name="arrow" className="h-4 w-4" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-2 p-4 sm:p-5" role="status" aria-label="Loading recent activity">
                {[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-[#f3f5f1]" />)}
              </div>
            ) : err ? (
              <p className="px-4 py-6 text-sm text-[#8b3e35] sm:px-5">Recent activity is unavailable. Refresh the dashboard to try again.</p>
            ) : moves.length ? (
              <ul className="divide-y divide-[#edf0eb]">
                {moves.slice(0, 5).map((movement) => (
                  <li key={movement.id} className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${movement.delta > 0 ? 'bg-[#edf5eb] text-[#3d6944]' : 'bg-[#fff2e9] text-[#9c5337]'}`}>
                      <Icon name={movement.delta > 0 ? 'plus' : 'arrow'} className={`h-4 w-4 ${movement.delta < 0 ? 'rotate-180' : ''}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#34473a]">{movement.products?.name ?? 'Product unavailable'}</span>
                      <span className="block truncate text-xs text-[#758177]">
                        {movement.batches?.batch_code ? `${movement.batches.batch_code} · ` : ''}{movement.reason}
                        {movement.locations?.name ? ` · ${movement.locations.name}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`block text-sm font-semibold ${movement.delta > 0 ? 'text-[#3d6944]' : 'text-[#9c5337]'}`} aria-label={`${movement.delta > 0 ? 'Added' : 'Removed'} ${Math.abs(movement.delta)} units`}>
                        {movement.delta > 0 ? '+' : ''}{numberFormat.format(movement.delta)}
                      </span>
                      <time className="block text-[11px] text-[#758177]" dateTime={movement.created_at} title={new Date(movement.created_at).toLocaleString('en-NZ')}>
                        {relativeTime(movement.created_at)}
                      </time>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-[#758177] sm:px-5">Stock movements will appear here as your team works.</p>
            )}
          </section>

          <section className="rounded-2xl border border-[#e5e9e2] bg-white p-4 shadow-[0_4px_20px_rgba(29,52,40,.035)] sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#26392d]">Plant range</h2>
                <p className="mt-1 text-sm text-[#7c887e]">Varieties by category</p>
              </div>
              <Icon name="layers" className="h-5 w-5 text-[#7c927e]" />
            </div>
            {categoryCounts.length ? (
              <ul className="mt-4 space-y-3">
                {categoryCounts.map((category) => (
                  <li key={category.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-xs">
                      <span className="truncate font-medium text-[#536254]">{category.name}</span>
                      <span className="shrink-0 text-[#7c887e]">{category.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eff2ed]">
                      <div className="h-full rounded-full bg-[#779474] transition-all duration-700" style={{ width: `${Math.max(5, (category.count / maxCategoryCount) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[#849087]">Your category breakdown will appear here.</p>
            )}
          </section>
        </div>
      </div>

      {!loading && nextStep && role === 'owner' && (
        <section aria-labelledby="setup-title" className="rounded-2xl border border-[#dce5d8] bg-[#f1f6ee] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="setup-title" className="text-base font-semibold text-[#294532]">Getting started</h2>
              <p className="mt-1 text-sm text-[#637567]">{completeSteps} of {workflow.length} setup steps complete</p>
            </div>
            <button type="button" onClick={() => onNavigate(nextStep.tab)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#2f6845] px-3 py-2 text-sm font-semibold text-white hover:bg-[#24583a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6845]">
              {nextStep.action}<Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {workflow.map((step) => (
              <li key={step.title} className="flex min-w-0 items-center gap-2 text-sm">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${step.complete ? 'bg-[#d8e8d4] text-[#315c3a]' : 'border border-[#bac9b7] text-[#657868]'}`}>
                  {step.complete ? <Icon name="check" className="h-3 w-3" /> : <span className="text-[10px]">•</span>}
                </span>
                <span className={`truncate ${step.complete ? 'text-[#647567]' : 'font-medium text-[#34483a]'}`}>{step.title}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!loading && nextStep && role === 'staff' && (
        <p className="rounded-xl border border-[#e6ddc4] bg-[#fbf7eb] p-3 text-sm text-[#695a34]">
          Setup is in progress. Ask an owner to finish {nextStep.title.toLowerCase()}; stock movement and stocktake are available.
        </p>
      )}
    </div>
  );
}


function Metric({
  icon,
  label,
  value,
  detail,
  tone,
  onClick,
}: {
  onClick: () => void;
  icon: 'plant' | 'layers' | 'box' | 'alert';
  label: string;
  value: string;
  detail: string;
  tone: 'green' | 'sand' | 'blue' | 'rose';
}) {
  const palette = {
    green: 'bg-[#eef5ed] text-[#4d7952]',
    sand: 'bg-[#f6f1e7] text-[#9a7d43]',
    blue: 'bg-[#edf3f5] text-[#527b85]',
    rose: 'bg-[#f8efec] text-[#aa6851]',
  }[tone];
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-[#e5e9e2] bg-white p-4 text-left shadow-[0_4px_20px_rgba(29,52,40,.035)] transition hover:-translate-y-0.5 hover:border-[#c9d6c6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6845] sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium leading-4 text-[#667469] sm:text-sm">{label}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight text-[#26392d] sm:text-[1.8rem]">{value}</p>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${palette}`}>
            <Icon name={icon} className="h-[18px] w-[18px]" />
          </span>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-[#69786d] sm:text-xs">{detail}</p>
    </button>
  );
}

function BatchRow({
  batch,
  onClick,
}: {
  batch: {
    id: string;
    batch_code: string;
    potted_on: string | null;
    product_id: string;
    product_name: string;
    product_sku: string;
    category_id: string;
    reorder_level: number;
    qty: number;
  };
  onClick: () => void;
}) {
  const percent = batch.reorder_level > 0 ? Math.min(100, (batch.qty / batch.reorder_level) * 100) : batch.qty > 0 ? 100 : 0;
  const status = batch.qty === 0
    ? { label: 'Empty', cls: 'bg-[#f8f2e4] text-[#927a3c]', bar: 'bg-[#c8ae6a]' }
    : batch.reorder_level > 0 && batch.qty <= batch.reorder_level
      ? { label: 'Low stock', cls: 'bg-[#fff2e8] text-[#a7663c]', bar: 'bg-[#d9935b]' }
      : { label: 'In stock', cls: 'bg-[#edf5ec] text-[#4e7751]', bar: 'bg-[#799875]' };

  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 py-3 text-left transition hover:bg-[#fbfcfa] sm:gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f4ed] text-[#627e63]">
        <Icon name="plant" className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-[#34473a] group-hover:text-[#23432f]">{batch.product_name}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>{status.label}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-[#879188]">{batch.batch_code} <span className="text-[#b1b9b2]">·</span> {batch.product_sku}</span>
        <span className="mt-2 block h-1 max-w-48 overflow-hidden rounded-full bg-[#eff2ed]">
          <span className={`block h-full rounded-full transition-all ${status.bar}`} style={{ width: `${percent}%` }} />
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg font-semibold leading-tight text-[#34473a]">{numberFormat.format(batch.qty)}</span>
        <span className="text-[10px] text-[#879188]">on hand</span>
      </span>
      <Icon name="arrow" className="h-4 w-4 shrink-0 text-[#b1bbb1] transition group-hover:translate-x-0.5 group-hover:text-[#607963]" />
    </button>
  );
}
