import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/client/api';
import { Btn, Field, inputCls } from '../ui';

interface PotSize { id: string; name: string }
interface PriceRow { id: string; pot_size_id: string; unit_price: number; active: boolean; pot_sizes?: { name: string } | null }
interface PriceBreak { id: string; min_qty: number; discount_pct: number }

export interface ProductPricingPanelProps {
  productId: string;
  potSizes: PotSize[];
}

export default function ProductPricingPanel({ productId, potSizes }: ProductPricingPanelProps) {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [breaks, setBreaks] = useState<PriceBreak[]>([]);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    Promise.all([
      api<PriceRow[]>(`/api/pricing/price-rows?product_id=${productId}`),
      api<PriceBreak[]>(`/api/pricing/breaks?product_id=${productId}`),
    ]).then(([rs, bs]) => { setRows(rs); setBreaks(bs); }).catch((e) => setErr((e as Error).message));
  }, [productId]);
  useEffect(() => { load(); }, [load]);

  const saveRow = async (row: PriceRow) => {
    try {
      await api(`/api/pricing/price-rows`, { method: 'PUT', json: { product_id: productId, pot_size_id: row.pot_size_id, unit_price: row.unit_price, active: row.active } });
      load();
    } catch (e) { setErr((e as Error).message); }
  };
  const deleteRow = async (id: string) => {
    try {
      await api(`/api/pricing/price-rows/${id}`, { method: 'DELETE' });
      load();
    } catch (e) { setErr((e as Error).message); }
  };
  const addRow = async () => {
    try {
      await api(`/api/pricing/price-rows`, { method: 'PUT', json: { product_id: productId, pot_size_id: potSizes[0]?.id ?? '', unit_price: 0, active: true } });
      load();
    } catch (e) { setErr((e as Error).message); }
  };

  const saveBreak = async (b: PriceBreak) => {
    try {
      await api(`/api/pricing/breaks`, { method: 'POST', json: { product_id: productId, min_qty: b.min_qty, discount_pct: b.discount_pct } });
      load();
    } catch (e) { setErr((e as Error).message); }
  };
  const deleteBreak = async (id: string) => {
    try {
      await api(`/api/pricing/breaks/${id}`, { method: 'DELETE' });
      load();
    } catch (e) { setErr((e as Error).message); }
  };
  const addBreak = async () => {
    try {
      await api(`/api/pricing/breaks`, { method: 'POST', json: { product_id: productId, min_qty: 1, discount_pct: 0 } });
      load();
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-[#2f4a37]">Pricing (pot size × price)</h3>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {potSizes.length === 0 && <p className="text-sm text-stone-500">Add pot sizes in Setup &gt; Pricing first.</p>}
      <div className="rounded bg-white border border-[#e6ebe3] p-3 space-y-2">
        {rows.length === 0 && <p className="text-xs text-stone-500">No price rows yet. Add one below.</p>}
        {rows.map((row) => {
          const size = potSizes.find((s) => s.id === row.pot_size_id);
          return (
            <div key={row.id} className="flex items-center gap-2">
              <select className={inputCls} value={row.pot_size_id} onChange={(e) => { const n = { ...row, pot_size_id: e.target.value }; setRows(rows.map((r) => r.id === row.id ? n : r)); saveRow(n); }}>
                <option value="">Unassigned</option>
                {potSizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Field label="Price"><input className={`w-32 ${inputCls}`} type="number" inputMode="decimal" step="0.01" min={0} value={String(row.unit_price)} onChange={(e) => { const n = { ...row, unit_price: Number(e.target.value) }; setRows(rows.map((r) => r.id === row.id ? n : r)); saveRow(n); }} /></Field>
              <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={row.active} onChange={(e) => { const n = { ...row, active: e.target.checked }; setRows(rows.map((r) => r.id === row.id ? n : r)); saveRow(n); }} /> Active</label>
              <span className="text-xs text-stone-500">{size ? size.name : ''}</span>
              <button className="text-red-700 underline text-xs" onClick={() => deleteRow(row.id)}>Remove</button>
            </div>
          );
        })}
        <div className="flex items-center gap-2 pt-1">
          <Btn onClick={addRow}>Add price row</Btn>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-[#2f4a37] mt-4">Quantity breaks</h3>
      <div className="rounded bg-white border border-[#e6ebe3] p-3 space-y-2">
        {breaks.length === 0 && <p className="text-xs text-stone-500">No quantity breaks yet.</p>}
        {breaks.map((b) => (
          <div key={b.id} className="flex items-center gap-2">
            <Field label="Min qty"><input className={`w-24 ${inputCls}`} type="number" inputMode="numeric" min={1} value={String(b.min_qty)} onChange={(e) => { const n = { ...b, min_qty: Number(e.target.value) }; setBreaks(breaks.map((x) => x.id === b.id ? n : x)); saveBreak(n); }} /></Field>
            <Field label="Discount %"><input className={`w-24 ${inputCls}`} type="number" inputMode="decimal" step="0.01" min={0} max={99.99} value={String(b.discount_pct)} onChange={(e) => { const n = { ...b, discount_pct: Number(e.target.value) }; setBreaks(breaks.map((x) => x.id === b.id ? n : x)); saveBreak(n); }} /></Field>
            <button className="text-red-700 underline text-xs" onClick={() => deleteBreak(b.id)}>Remove</button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Btn onClick={addBreak}>Add break</Btn>
          <span className="ml-auto text-xs text-stone-500">Break applies when qty ≥ min qty. Highest matching tier wins.</span>
        </div>
      </div>
    </section>
  );
}
