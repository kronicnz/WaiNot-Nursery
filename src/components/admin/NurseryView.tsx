import { useCallback, useEffect, useState } from 'react';
import { api, type Location, type Product } from '../../lib/client/api';
import { Btn, Field, Msg, Section, inputCls } from './ui';

type Area = 'orders' | 'customers' | 'care';
interface Customer { id: string; name: string; email: string | null; phone: string | null; notes: string | null }
interface OrderLine {
  id: string; quantity: number; unit_price: number; line_total: number;
  products: { name: string; sku: string } | null; batches: { batch_code: string } | null; locations: { name: string } | null;
}
interface Order {
  id: string; status: 'open' | 'fulfilled' | 'cancelled'; created_at: string; notes: string | null;
  customers: Pick<Customer, 'name' | 'email' | 'phone'> | null; order_lines: OrderLine[];
}
interface CareTask {
  id: string; title: string; notes: string | null; due_on: string; repeat_days: number | null;
  batch_id: string | null; location_id: string | null; completed_at: string | null;
  batches: { batch_code: string; products: { name: string } | null } | null;
  locations: { name: string } | null;
  care_task_completions: { due_on: string; completed_at: string }[];
}
interface DraftLine { product_id: string; batch_id: string; location_id: string; quantity: string }
const emptyLine = (): DraftLine => ({ product_id: '', batch_id: '', location_id: '', quantity: '1' });
const emptyCustomer = () => ({ name: '', email: '', phone: '', notes: '' });
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const emptyTask = () => ({ title: '', notes: '', due_on: today(), repeat_days: '', batch_id: '', location_id: '' });
const money = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });

function LineQuote({ line }: { line: DraftLine }) {
  const [quote, setQuote] = useState<{ unit_price: number | null; line_total: number | null } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const quantity = Number(line.quantity);
    setQuote(null); setError('');
    if (!line.product_id || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ product_id: line.product_id, qty: String(quantity) });
    if (line.batch_id) params.set('batch_id', line.batch_id);
    api<{ unit_price: number | null; line_total: number | null }>(`/api/pricing/quote?${params}`, { signal: controller.signal })
      .then(setQuote).catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [line.product_id, line.batch_id, line.quantity]);
  if (error) return <p role="alert" className="text-sm text-red-700">Could not load price: {error}</p>;
  if (!quote) return null;
  return <p className="text-sm text-stone-600">{quote.unit_price === null || quote.line_total === null ? 'No price set for this plant.' :
    `${money.format(quote.unit_price)} each · ${money.format(quote.line_total)} total`}</p>;
}

async function loadProducts() {
  const first = await api<{ items: Product[]; total: number }>('/api/products?limit=100');
  const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.total / 100) - 1) },
    (_, i) => api<{ items: Product[] }>(`/api/products?limit=100&offset=${(i + 1) * 100}`)));
  return [first, ...pages].flatMap((page) => page.items);
}

export default function NurseryView({ focusSection }: { focusSection: string | null }) {
  const [area, setArea] = useState<Area>(focusSection === 'care' || focusSection === 'customers' ? focusSection : 'orders');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [message, setMessage] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customer, setCustomer] = useState(emptyCustomer);
  const [editingCustomer, setEditingCustomer] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [orderNotes, setOrderNotes] = useState('');
  const [task, setTask] = useState(emptyTask);
  const [editingTask, setEditingTask] = useState('');

  const load = useCallback(async () => {
    const [c, o, t, p, l] = await Promise.all([
      api<Customer[]>('/api/customers'), api<Order[]>('/api/orders'), api<CareTask[]>('/api/care-tasks'),
      loadProducts(), api<Location[]>('/api/locations?active=1'),
    ]);
    setCustomers(c); setOrders(o); setTasks(t); setProducts(p); setLocations(l);
  }, []);
  useEffect(() => { void load().catch((e: Error) => setMessage({ kind: 'err', text: e.message })); }, [load]);
  useEffect(() => { if (focusSection === 'orders' || focusSection === 'customers' || focusSection === 'care') setArea(focusSection); }, [focusSection]);

  const run = async (operation: () => Promise<void>, success: string) => {
    setBusy(true); setMessage(null);
    try { await operation(); await load(); setMessage({ kind: 'ok', text: success }); }
    catch (e) { setMessage({ kind: 'err', text: (e as Error).message }); }
    finally { setBusy(false); }
  };
  const saveCustomer = () => run(async () => {
    await api(editingCustomer ? `/api/customers/${editingCustomer}` : '/api/customers', {
      method: editingCustomer ? 'PATCH' : 'POST',
      json: { ...customer, email: customer.email.trim(), phone: customer.phone.trim(), notes: customer.notes.trim() },
    });
    setCustomer(emptyCustomer()); setEditingCustomer('');
  }, 'Customer saved.');
  const saveOrder = () => run(async () => {
    await api('/api/orders', { method: 'POST', json: {
      customer_id: customerId || null, notes: orderNotes.trim() || null,
      lines: lines.map((line) => ({
        product_id: line.product_id, batch_id: line.batch_id || null, location_id: line.location_id || null,
        quantity: Number(line.quantity),
      })),
    } });
    setLines([emptyLine()]); setCustomerId(''); setOrderNotes('');
  }, 'Order created. Stock is not reserved.');
  const saveTask = () => run(async () => {
    await api(editingTask ? `/api/care-tasks/${editingTask}` : '/api/care-tasks', {
      method: editingTask ? 'PATCH' : 'POST',
      json: { ...task, notes: task.notes.trim() || null, batch_id: task.batch_id || null,
        location_id: task.location_id || null, repeat_days: task.repeat_days ? Number(task.repeat_days) : null },
    });
    setTask(emptyTask()); setEditingTask('');
  }, 'Care task saved.');
  const changeLine = (index: number, patch: Partial<DraftLine>) =>
    setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const batches = products.flatMap((p) => (p.batches ?? []).filter((b) => !b.archived_at).map((b) => ({ ...b, productName: p.name })));

  return <div className="space-y-5">
    <p className="text-sm text-stone-600">Orders, customer details and shared care tasks require an internet connection.</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Nursery tools">
      {(['orders', 'customers', 'care'] as const).map((item) =>
        <Btn key={item} primary={area === item} onClick={() => { setArea(item); setMessage(null); }}>
          {item === 'care' ? 'Care tasks' : item[0].toUpperCase() + item.slice(1)}
        </Btn>)}
    </div>
    {message && <Msg kind={message.kind}>{message.text}</Msg>}
    {area === 'customers' && <>
      <Section title={editingCustomer ? 'Edit customer' : 'Add customer'}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><input className={inputCls} value={customer.name} maxLength={200} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></Field>
          <Field label="Email"><input className={inputCls} type="email" value={customer.email} maxLength={254} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></Field>
          <Field label="Phone"><input className={inputCls} type="tel" value={customer.phone} maxLength={80} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></Field>
          <Field label="Notes"><input className={inputCls} value={customer.notes} maxLength={2000} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} /></Field>
        </div>
        <div className="flex gap-2"><Btn primary disabled={busy || !customer.name.trim()} onClick={saveCustomer}>Save customer</Btn>
          {editingCustomer && <Btn onClick={() => { setCustomer(emptyCustomer()); setEditingCustomer(''); }}>Cancel</Btn>}</div>
      </Section>
      <Section title="Customers">
        {customers.length === 0 && <p className="text-sm text-stone-500">No customers yet.</p>}
        {customers.map((c) => <div key={c.id} className="flex flex-wrap items-start justify-between gap-2 border-t border-stone-100 py-3 text-sm">
          <div><strong>{c.name}</strong><div className="flex flex-wrap gap-3">
            {c.email && <a className="text-green-700 underline" href={`mailto:${encodeURIComponent(c.email)}`}>{c.email}</a>}
            {c.phone && <a className="text-green-700 underline" href={`tel:${encodeURIComponent(c.phone)}`}>{c.phone}</a>}
          </div>{c.notes && <p className="whitespace-pre-wrap text-stone-600">{c.notes}</p>}</div>
          <Btn onClick={() => { setEditingCustomer(c.id); setCustomer({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '' }); }}>Edit</Btn>
        </div>)}
      </Section>
    </>}
    {area === 'orders' && <>
      <Section title="New order" hint="Orders do not reserve stock. Prices are calculated from the price book when the order is created.">
        <Field label="Customer (optional)"><select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Walk-in / no customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></Field>
        {lines.map((line, index) => {
          const product = products.find((p) => p.id === line.product_id);
          return <div key={index} className="grid gap-2 rounded-xl bg-stone-50 p-3 sm:grid-cols-2">
            <Field label="Plant"><select className={inputCls} value={line.product_id} onChange={(e) => changeLine(index, { product_id: e.target.value, batch_id: '' })}>
              <option value="">Choose plant</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
            </select></Field>
            <Field label="Batch"><select className={inputCls} value={line.batch_id} onChange={(e) => changeLine(index, { batch_id: e.target.value })}>
              <option value="">Unassigned batch</option>{product?.batches?.filter((b) => !b.archived_at).map((b) => <option key={b.id} value={b.id}>{b.batch_code} · {b.qty ?? 0} on hand</option>)}
            </select></Field>
            <Field label="Stock location"><select className={inputCls} value={line.location_id} onChange={(e) => changeLine(index, { location_id: e.target.value })}>
              <option value="">Unassigned location</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></Field>
            <Field label="Quantity"><input className={inputCls} type="number" min="1" max="100000" value={line.quantity} onChange={(e) => changeLine(index, { quantity: e.target.value })} /></Field>
            {product && <p className="text-sm text-stone-600">Available in selected batch and location: {product.stock_levels?.filter((s) => s.batch_id === (line.batch_id || null) && s.location_id === (line.location_id || null)).reduce((sum, s) => sum + s.qty, 0) ?? 0}</p>}
            <LineQuote line={line} />
            {lines.length > 1 && <Btn onClick={() => setLines(lines.filter((_, i) => i !== index))}>Remove line</Btn>}
          </div>;
        })}
        <div className="flex gap-2"><Btn disabled={lines.length >= 100} onClick={() => setLines([...lines, emptyLine()])}>Add line</Btn></div>
        <Field label="Order notes"><textarea className={inputCls} value={orderNotes} maxLength={2000} onChange={(e) => setOrderNotes(e.target.value)} /></Field>
        <Btn primary disabled={busy || lines.some((l) => !l.product_id || !Number.isInteger(Number(l.quantity)) || Number(l.quantity) < 1)} onClick={saveOrder}>Create order</Btn>
      </Section>
      <Section title="Orders">
        {orders.length === 0 && <p className="text-sm text-stone-500">No orders yet.</p>}
        {orders.map((order) => <article key={order.id} className="space-y-2 border-t border-stone-100 py-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><strong>{order.customers?.name ?? 'Walk-in'} · <span className="capitalize">{order.status}</span></strong><span>{new Date(order.created_at).toLocaleDateString('en-NZ')}</span></div>
          {order.order_lines.map((line) => <div key={line.id}>{line.quantity} × {line.products?.name ?? 'Plant'} · {line.batches?.batch_code ?? 'Unassigned batch'} · {line.locations?.name ?? 'Unassigned location'} · {money.format(Number(line.line_total))}</div>)}
          <p className="font-semibold">Total {money.format(order.order_lines.reduce((sum, line) => sum + Number(line.line_total), 0))}</p>
          {order.notes && <p className="whitespace-pre-wrap">{order.notes}</p>}
          {order.status === 'open' && <div className="flex flex-wrap gap-2">
            <Btn primary disabled={busy} onClick={() => { if (window.confirm('Fulfil this order and deduct the selected stock?')) void run(() => api(`/api/orders/${order.id}/fulfill`, { method: 'POST' }).then(() => undefined), 'Order fulfilled.'); }}>Fulfil</Btn>
            <Btn disabled={busy} onClick={() => { if (window.confirm('Cancel this order?')) void run(() => api(`/api/orders/${order.id}/cancel`, { method: 'POST' }).then(() => undefined), 'Order cancelled.'); }}>Cancel order</Btn>
          </div>}
        </article>)}
      </Section>
    </>}
    {area === 'care' && <>
      <Section title={editingTask ? 'Edit care task' : 'New care task'} hint="Reminders appear here and on the dashboard. No email notifications are sent.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Task"><input className={inputCls} value={task.title} maxLength={200} onChange={(e) => setTask({ ...task, title: e.target.value })} /></Field>
          <Field label="Due date"><input className={inputCls} type="date" value={task.due_on} onChange={(e) => setTask({ ...task, due_on: e.target.value })} /></Field>
          <Field label="Repeat every (days; optional)"><input className={inputCls} type="number" min="1" max="3650" value={task.repeat_days} onChange={(e) => setTask({ ...task, repeat_days: e.target.value })} /></Field>
          <Field label="Location (optional)"><select className={inputCls} value={task.location_id} onChange={(e) => setTask({ ...task, location_id: e.target.value })}>
            <option value="">None</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select></Field>
          <Field label="Batch (optional)"><select className={inputCls} value={task.batch_id} onChange={(e) => setTask({ ...task, batch_id: e.target.value })}>
            <option value="">None</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.productName} · {b.batch_code}</option>)}
          </select></Field>
          <Field label="Notes"><input className={inputCls} value={task.notes} maxLength={2000} onChange={(e) => setTask({ ...task, notes: e.target.value })} /></Field>
        </div>
        <div className="flex gap-2"><Btn primary disabled={busy || !task.title.trim() || !task.due_on} onClick={saveTask}>Save task</Btn>
          {editingTask && <Btn onClick={() => { setEditingTask(''); setTask(emptyTask()); }}>Cancel</Btn>}</div>
      </Section>
      <Section title="Care tasks">
        {tasks.length === 0 && <p className="text-sm text-stone-500">No care tasks yet.</p>}
        {tasks.map((t) => <article key={t.id} className="space-y-2 border-t border-stone-100 py-3 text-sm">
          <div><strong>{t.title}</strong> · {t.completed_at ? 'Completed' : t.due_on < today() ? 'Overdue' : t.due_on === today() ? 'Due today' : 'Due'} {t.due_on}
            {t.repeat_days && ` · every ${t.repeat_days} days`}</div>
          {(t.batches || t.locations) && <p>{t.batches ? `${t.batches.products?.name ?? 'Plant'} · ${t.batches.batch_code}` : ''}{t.batches && t.locations ? ' · ' : ''}{t.locations?.name}</p>}
          {t.notes && <p className="whitespace-pre-wrap">{t.notes}</p>}
          {t.care_task_completions.length > 0 && <details><summary>Completion history ({t.care_task_completions.length})</summary>
            <ul>{t.care_task_completions.map((c, i) => <li key={`${c.completed_at}-${i}`}>Due {c.due_on} · completed {new Date(c.completed_at).toLocaleString('en-NZ')}</li>)}</ul>
          </details>}
          {!t.completed_at && <div className="flex gap-2">
            <Btn primary disabled={busy} onClick={() => void run(() => api(`/api/care-tasks/${t.id}/complete`, { method: 'POST', json: { client_op_id: crypto.randomUUID() } }).then(() => undefined), 'Task completed.')}>Complete</Btn>
            <Btn onClick={() => { setEditingTask(t.id); setTask({ title: t.title, notes: t.notes ?? '', due_on: t.due_on, repeat_days: t.repeat_days?.toString() ?? '', batch_id: t.batch_id ?? '', location_id: t.location_id ?? '' }); }}>Edit</Btn>
          </div>}
        </article>)}
      </Section>
    </>}
  </div>;
}
