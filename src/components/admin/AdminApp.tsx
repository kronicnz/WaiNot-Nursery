import { useEffect, useState } from 'react';
import { api, type Me } from '../../lib/client/api';
import { clearLocalData, flushQueue, listQueue } from '../../lib/client/offline';
import DashboardView from './DashboardView';
import ManageView from './ManageView';
import ActivityView from './ActivityView';
import ProductsView from './ProductsView';
import ScanView from './ScanView';
import StocktakeView from './StocktakeView';

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: 'home' },
  { id: 'activity', label: 'Activity', icon: 'clock' },
  { id: 'manage', label: 'Setup', icon: 'settings', owner: true },
  { id: 'products', label: 'Products', icon: 'plant' },
  { id: 'scan', label: 'Stock movement', icon: 'scan' },
  { id: 'stocktake', label: 'Stocktake', icon: 'count' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function NavIcon({ name }: { name: (typeof TABS)[number]['icon'] }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'home') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></svg>;
  if (name === 'settings') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1 1 1.8-1.8 3.1-2-.5a8 8 0 0 1-1.6.9l-.6 2.1h-3.6l-.6-2.1a8 8 0 0 1-1.6-.9l-2 .5-1.8-3.1 1.5-1.5a8 8 0 0 1 0-1.8l-1.5-1.5 1.8-3.1 2 .5a8 8 0 0 1 1.6-.9l.6-2.1h3.6l.6 2.1a8 8 0 0 1 1.6.9l2-.5 1.8 3.1-1.5 1.5c.1.6.1 1.2 0 1.8Z" /></svg>;
  if (name === 'plant') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M12 21v-9M12 12C5 12 4 7 4 4c5 0 8 2 8 8ZM12 15c0-5 3-8 8-8 0 5-2 8-8 8ZM6 21h12" /></svg>;
  if (name === 'scan') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" /></svg>;
  if (name === 'clock') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h4" /></svg>;
}

function SyncBanner({ online, pending, onSync }: { online: boolean; pending: number; onSync: () => Promise<void> }) {
  if (online && pending === 0) return null;
  return (
    <div className={`mb-5 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm sm:px-5 ${online ? 'border-[#e6ddc4] bg-[#fbf7eb] text-[#695a34]' : 'border-[#f3d4d4] bg-[#fff0f0] text-[#9a3b3b]'}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${online ? 'bg-[#f3ecbf]' : 'bg-[#f7cccc]'}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            {online ? <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2" /></> : <><circle cx="12" cy="12" r="9" /><path d="M3 3l18 18" /></>}
          </svg>
        </span>
        <span>
          <span className="block font-medium">{online ? 'Syncing…' : 'You are offline'}</span>
          <span className="block text-xs opacity-80">
            {pending > 0 ? `${pending} scan${pending === 1 ? '' : 's'} waiting to sync` : 'Connect to the network to sync'}
          </span>
        </span>
      </div>
      {online && pending > 0 && (
        <button type="button" onClick={onSync} className="inline-flex min-h-9 items-center rounded-lg bg-[#6b5a1f] px-3 text-xs font-semibold text-white">
          Sync now
        </button>
      )}
    </div>
  );
}

export default function AdminApp() {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    const initial = location.hash.slice(1);
    return TABS.some((candidate) => candidate.id === initial) ? initial as Tab : 'dashboard';
  });
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    api<Me>('/api/auth/me').then(setMe);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  useEffect(() => { location.hash = tab; }, [tab]);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (!alive) return;
      setOnline(navigator.onLine);
      try { setPending((await listQueue()).length); } catch { /* ignore */ }
    };
    const onOnline = () => { setOnline(true); refresh(); };
    const onOffline = () => { setOnline(false); refresh(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refresh();
    return () => { alive = false; window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const syncNow = async () => {
    if (!navigator.onLine) return;
    const r = await flushQueue();
    setPending(r.remaining);
  };

  if (!me) return <p className="p-6">Loading…</p>;
  const tabs = TABS.filter((t) => !('owner' in t) || me.role === 'owner');
  const pageTitle = TABS.find((item) => item.id === tab)?.label ?? 'Overview';

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    await clearLocalData();
    location.href = '/admin/login';
  };

  return (
    <div className="admin-app min-h-screen bg-[#f5f7f3] text-[#24372a]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#e6ebe3] bg-white px-4 pb-5 pt-6 lg:flex">
        <a href="/admin" className="flex items-center gap-3 px-2 text-[#254432] no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#eaf1e6] text-[#426a4a]">
            <NavIcon name="plant" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold tracking-tight">WaiNot Nursery</span>
            <span className="mt-0.5 block text-[11px] text-[#879287]">Stock workspace</span>
          </span>
        </a>
        <p className="mb-2 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#9aa49b]">WORKSPACE</p>
        <nav className="space-y-1" aria-label="Main navigation">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition ${tab === item.id ? 'bg-[#edf4eb] text-[#315b39]' : 'text-[#68766b] hover:bg-[#f6f8f5] hover:text-[#344a39]'}`}
            >
              <span className={`h-[18px] w-[18px] ${tab === item.id ? 'text-[#507956]' : 'text-[#89948a]'}`}><NavIcon name={item.icon} /></span>
              {item.label}
              {item.id === 'dashboard' && <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[10px] text-[#789079]">Home</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#f6f8f4] p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dce8d8] text-xs font-semibold uppercase text-[#416448]">{me.role.slice(0, 1)}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-[#405344]">{me.email}</span>
              <span className="mt-0.5 block text-[11px] capitalize text-[#879287]">{me.role} account</span>
            </span>
          </div>
          <button type="button" onClick={logout} className="mt-3 w-full rounded-lg border border-[#e2e8df] bg-white px-3 py-2 text-left text-xs font-medium text-[#647168] transition hover:border-[#cbd6c9] hover:text-[#354a39]">
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-[#e7ebe5] bg-white/90 px-4 backdrop-blur-md sm:px-7 lg:px-9">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#9aa49b]">Workspace</span>
            <span className="text-[#c2c9c2]">/</span>
            <span className="font-semibold text-[#394d3d]">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden rounded-full bg-[#eef5ec] px-2.5 py-1 text-[11px] font-medium capitalize text-[#4d7552] sm:inline-flex">{me.role} access</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8efe4] text-xs font-semibold uppercase text-[#416448] lg:hidden">{me.role.slice(0, 1)}</span>
            <button type="button" onClick={logout} className="text-xs font-medium text-[#718075] transition hover:text-[#304a37] lg:hidden">Sign out</button>
          </div>
        </header>
        <main className={`mx-auto px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-9 lg:pb-10 ${tab === 'dashboard' ? 'max-w-[1440px]' : 'max-w-4xl'}`}>
          <SyncBanner online={online} pending={pending} onSync={syncNow} />
          {tab === 'scan' && <ScanView role={me.role} />}
          {tab === 'products' && <ProductsView role={me.role} />}
          {tab === 'dashboard' && <DashboardView role={me.role} onNavigate={setTab} />}
          {tab === 'activity' && <ActivityView role={me.role} />}
          {tab === 'stocktake' && <StocktakeView role={me.role} />}
          {tab === 'manage' && me.role === 'owner' && <ManageView meId={me.id} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e5eae3] bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 shadow-[0_-8px_24px_rgba(32,53,38,.06)] backdrop-blur-md print:hidden lg:hidden" aria-label="Main navigation">
        <div className="mx-auto flex max-w-xl">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-medium transition ${tab === item.id ? 'text-[#3e7048]' : 'text-[#89948a]'}`}
            >
              <span className={`h-[19px] w-[19px] ${tab === item.id ? 'text-[#4c7b52]' : ''}`}><NavIcon name={item.icon} /></span>
              <span className="truncate">{item.label === 'Stock movement' ? 'Scan' : item.label === 'Stocktake' ? 'Count' : item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
