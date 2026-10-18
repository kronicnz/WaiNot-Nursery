import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Category, type Location, type Product } from '../../lib/client/api';
import { Msg } from './ui';

interface Low { product_id: string; sku: string; name: string; reorder_level: number; total_qty: number }
interface Mov {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
  note: string | null;
  products: { name: string; sku: string };
  batches: { batch_code: string } | null;
  locations: { name: string } | null;
}
type WorkflowTab = 'manage' | 'products' | 'scan' | 'stocktake' | 'activity';
type BatchFilter = 'all' | 'low' | 'empty';

const numberFormat = new Intl.NumberFormat('en-NZ');

function Icon({ name, className = 'h-5 w-5' }: { name: 'leaf' | 'plant' | 'layers' | 'box' | 'arrow' | 'search' | 'refresh' | 'alert' | 'clock' | 'plus' | 'scan' | 'check' | 'transfer' | 'archive' | 'edit'; className?: string }) {
  const paths: Record<typeof name, ReactNode> = {
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M4 21c2-5 6-9 12-12" /></>,
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
    transfer: <><path d="M3 12h14" /><path d="m9 6-3 3 3 3" /><path d="M21 12H7" /><path d="m15 18 3-3-3-3" /></>,
    archive: <><path d="M4 4h16v6H4z" /><path d="M4 10v10h16V10" /><path d="M9 14h6" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
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
  onNavigate: (tab: WorkflowTab) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [low, setLow] = useState<Low[]>([]);
  const [moves, setMoves] = useState<Mov[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BatchFilter>('all');
  const [search, setSearch] = useState('');
  const [updatedAt, setUpdatedAt] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [categoryRows, productRows, lowRows, movementRows, locationRows] = await Promise.all([
        api<Category[]>('/api/categories'),
        api<{ items: Product[] }>('/api/products?limit=100'),
        api<Low[]>('/api/stock/low'),
        api<{ items: Mov[] }>('/api/movements?limit=8'),
        api<Location[]>('/api/locations?active=1'),
      ]);
      setCategories(categoryRows);
      setProducts(productRows.items);
      setLow(lowRows);
      setMoves(movementRows.items);
      setLocations(locationRows);
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
  const totalStock = products.reduce((total, product) => total + (product.total_qty ?? 0), 0);
  const lowBatchCount = activeBatches.filter((batch) => batch.qty > 0 && batch.reorder_level > 0 && batch.qty <= batch.reorder_level).length;
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
    const matchesFilter = filter === 'all' || (filter === 'empty' ? batch.qty === 0 : batch.qty > 0 && batch.reorder_level > 0 && batch.qty <= batch.reorder_level);
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${batch.product_name} ${batch.product_sku} ${batch.batch_code}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  const categoryCounts = categories.map((category) => ({
    ...category,
    count: products.filter((product) => product.category_id === category.id).length,
  })).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((category) => category.count));
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#6f7b70]">{new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1d3428] sm:text-4xl">{greeting}</h1>
          <p className="mt-2 text-sm text-[#69766d] sm:text-base">Here’s what’s happening across your nursery today.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-[#849087] sm:inline" aria-live="polite">Updated {updatedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}</span>
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

      <nav aria-label="Quick actions" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {([
          ['scan', 'Move stock', 'Scan in, out or adjust', 'scan', true],
          ['stocktake', 'Stocktake', 'Count and reconcile', 'check', false],
          ['products', 'Products', 'Plants, batches & labels', 'plant', false],
        ] as const).map(([tab, title, hint, icon, primary]) => (
          <button
            key={tab}
            type="button"
            onClick={() => onNavigate(tab)}
            className={`group flex items-center gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 ${primary ? 'border-[#2c5a3e] bg-[#2c5a3e] text-white hover:bg-[#244d34]' : 'border-[#e5e9e2] bg-white text-[#26392d] hover:border-[#c9d6c6]'}`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${primary ? 'bg-white/15' : 'bg-[#eef5ed] text-[#4d7952]'}`}><Icon name={icon} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{title}</span>
              <span className={`block truncate text-xs ${primary ? 'text-[#d3e3d4]' : 'text-[#7c887e]'}`}>{hint}</span>
            </span>
            <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        ))}
        <TransferCard role={role} />
      </nav>

      {err && (
        <Msg kind="err">
          <div>{err}</div>
          <div className="mt-2">
            <button type="button" className="underline" onClick={() => void load()}>Try again</button>
          </div>
        </Msg>
      )}

      <ReorderWorksheet products={products} low={low} onNavigate={onNavigate} />

      {!loading && role === 'owner' && nextStep && (
        <section className="relative isolate overflow-hidden rounded-[1.65rem] bg-[#1d3b2d] px-5 py-6 text-white shadow-[0_18px_50px_rgba(25,58,39,.15)] sm:px-8 sm:py-7">
          <div aria-hidden="true" className="absolute -right-14 -top-28 -z-10 h-80 w-80 rounded-full border-[48px] border-white/[0.045]" />
          <div aria-hidden="true" className="absolute right-24 -bottom-32 -z-10 h-64 w-64 rounded-full bg-[#789369]/20 blur-3xl" />
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(230px,320px)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-[#d6e5d6]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c2d6a9]" />
                YOUR NEXT STEP
              </div>
              <h2 className="mt-4 max-w-xl text-2xl font-semibold tracking-tight sm:text-[2rem]">{nextStep.title}</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#cfddd0]">{nextStep.description}</p>
              <button
                type="button"
                onClick={() => onNavigate(nextStep.tab)}
                className="group mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#e4ebd8] px-4 py-2.5 text-sm font-semibold text-[#254432] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
              >
                {nextStep.action}
                <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#e5eee3]">Getting started</p>
                <span className="text-sm font-semibold text-white">{completeSteps} <span className="font-normal text-[#bdcfc0]">of {workflow.length}</span></span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-[#c8d9a9] transition-all duration-700" style={{ width: `${(completeSteps / workflow.length) * 100}%` }} />
              </div>
              <ol className="mt-4 space-y-2.5">
                {workflow.map((step, index) => (
                  <li key={step.title} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.complete ? 'bg-[#c8d9a9] text-[#244330]' : 'border border-white/25 text-[#d3dfd2]'}`}>
                      {step.complete ? <Icon name="check" className="h-3.5 w-3.5" /> : <span className="text-[11px]">{index + 1}</span>}
                    </span>
                    <span className={step.complete ? 'text-[#d3dfd2]' : 'font-medium text-white'}>{step.title}</span>
                    {step.complete && <span className="ml-auto text-[11px] text-[#b9cbb9]">Done</span>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {!loading && role === 'staff' && nextStep && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#e6ddc4] bg-[#fbf7eb] p-4 text-sm text-[#695a34]">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Setup is still in progress. Ask an owner to finish <b>{nextStep.title.toLowerCase()}</b>; you can continue with scanning and stock counts.</p>
        </div>
      )}

      <section aria-label="Inventory summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon="plant" label="Plant varieties" value={loading ? '—' : numberFormat.format(products.length)} detail={`${numberFormat.format(categories.length)} categories`} tone="green" onClick={() => onNavigate('products')} />
        <Metric icon="layers" label="Active batches" value={loading ? '—' : numberFormat.format(activeBatches.length)} detail={`${numberFormat.format(zeroStockBatches.length)} ready to archive`} tone="sand" onClick={() => setFilter('all')} />
        <Metric icon="box" label="Units on hand" value={loading ? '—' : numberFormat.format(totalStock)} detail="Across active batches" tone="blue" onClick={() => onNavigate('stocktake')} />
        <Metric icon="alert" label="Needs attention" value={loading ? '—' : numberFormat.format(low.length + zeroStockBatches.length)} detail={`${low.length} low stock · ${zeroStockBatches.length} empty`} tone="rose" onClick={() => setFilter(low.length ? 'low' : 'empty')} />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)]">
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
              <div className="flex gap-1 rounded-xl bg-[#f4f6f2] p-1" role="group" aria-label="Filter batches">
                {([
                  ['all', 'All batches', activeBatches.length],
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
          <section className="rounded-2xl border border-[#e5e9e2] bg-white p-4 shadow-[0_4px_20px_rgba(29,52,40,.035)] sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#26392d]">Stock alerts</h2>
                <p className="mt-1 text-sm text-[#7c887e]">Items to take a closer look at</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${low.length + zeroStockBatches.length ? 'bg-[#fff2e6] text-[#9d572b]' : 'bg-[#edf5ec] text-[#47734d]'}`}>
                {low.length + zeroStockBatches.length ? `${low.length + zeroStockBatches.length} alerts` : 'All clear'}
              </span>
            </div>
            {low.length === 0 && zeroStockBatches.length === 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f2f7ef] p-3 text-sm text-[#54745a]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white"><Icon name="check" className="h-4 w-4" /></span>
                Stock levels look healthy.
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {low.slice(0, 4).map((product) => (
                  <li key={product.product_id} className="flex items-center gap-3 rounded-xl bg-[#fff8f1] p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#bb7541]"><Icon name="alert" className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#493b2f]">{product.name}</span>
                      <span className="text-xs text-[#8b7b6e]">{product.total_qty} on hand · reorder at {product.reorder_level}</span>
                    </span>
                  </li>
                ))}
                {zeroStockBatches.slice(0, 3).map((batch) => (
                  <li key={batch.id} className="flex items-center gap-3 rounded-xl bg-[#f8f5ed] p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#927d45]"><Icon name="box" className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#493f2d]">{batch.product_name}</span>
                      <span className="text-xs text-[#887f6b]">{batch.batch_code} · zero stock</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {role === 'owner' && zeroStockBatches.length > 0 && (
              <button type="button" onClick={() => onNavigate('products')} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#536a4f] hover:text-[#2d4b34]">
                Review empty batches <Icon name="arrow" className="h-4 w-4" />
              </button>
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

      <section className="overflow-hidden rounded-2xl border border-[#e5e9e2] bg-white shadow-[0_4px_20px_rgba(29,52,40,.035)]">
        <div className="flex items-center justify-between border-b border-[#edf0eb] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-[#26392d]">Recent activity</h2>
            <p className="mt-1 text-sm text-[#7c887e]">Latest changes to your stock</p>
          </div>
          <Icon name="clock" className="h-5 w-5 text-[#849487]" />
        </div>
        {moves.length ? (
          <ul className="divide-y divide-[#edf0eb]">
            {moves.slice(0, 5).map((movement) => (
              <li key={movement.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${movement.delta > 0 ? 'bg-[#edf5eb] text-[#4d8055]' : 'bg-[#fff2e9] text-[#b96a3a]'}`}>
                  <Icon name={movement.delta > 0 ? 'plus' : 'arrow'} className={`h-4 w-4 ${movement.delta < 0 ? 'rotate-180' : ''}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#34473a]">{movement.products.name}</span>
                  <span className="block truncate text-xs text-[#839087]">
                    {movement.batches?.batch_code ? `${movement.batches.batch_code} · ` : ''}{movement.reason}
                  </span>
                </span>
                <span className={`text-sm font-semibold ${movement.delta > 0 ? 'text-[#4c8054]' : 'text-[#b96a3a]'}`}>
                  {movement.delta > 0 ? '+' : ''}{numberFormat.format(movement.delta)}
                </span>
                <span className="hidden w-16 text-right text-xs text-[#909a91] sm:block">{relativeTime(movement.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-[#849087]">Stock movements will appear here as your team works.</div>
        )}
      </section>
    </div>
  );
}

function TransferCard({ role }: { role: 'owner' | 'staff' }) {
  return (
    <article className="rounded-2xl border border-[#e5e9e2] bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-[#26392d]">Transfer stock</h3>
      <p className="mt-1 text-xs text-[#7c887e]">Move units between locations.</p>
      <p className="mt-3 text-xs text-[#88938a]">Use the Scan tab to record transfers.</p>
    </article>
  );
}

function ReorderWorksheet({ products, low, onNavigate }: { products: any[]; low: any[]; onNavigate: (t: any) => void }) {
  if (!low.length) return null;
  return (
    <section className="rounded-2xl border border-[#e5e9e2] bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-[#26392d]">Reorder worksheet</h3>
      <ul className="mt-2 divide-y">
        {low.map((l: any) => (
          <li key={l.product_id} className="flex items-center justify-between py-2 text-sm">
            <span>{l.name}</span>
            <span className="text-xs text-[#7c887e]">Suggest {Math.max(0, (l.reorder_level ?? 0) - (l.total_qty ?? 0))}</span>
          </li>
        ))}
      </ul>
    </section>
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
    <button type="button" onClick={onClick} className="rounded-2xl border border-[#e5e9e2] bg-white p-4 text-left shadow-[0_4px_20px_rgba(29,52,40,.035)] transition hover:-translate-y-0.5 hover:border-[#c9d6c6] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[#7c887e] sm:text-sm">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#26392d] sm:text-[1.8rem]">{value}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${palette}`}>
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 truncate text-[11px] text-[#88938a] sm:text-xs">{detail}</p>
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
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-[#34473a] group-hover:text-[#23432f]">{batch.product_name}</span>
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>{status.label}</span>
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
