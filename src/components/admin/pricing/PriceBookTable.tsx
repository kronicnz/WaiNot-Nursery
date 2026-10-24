import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/client/api';
import { Btn, Msg, inputCls } from '../ui';

interface PotSize { id: string; code: string; name: string; sort_order: number; active: boolean }
interface Product { id: string; sku: string; name: string; pot_size_id: string | null }
interface PriceRow { id: string; product_id: string; pot_size_id: string; unit_price: number; active: boolean }

export default function PriceBookTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [potSizes, setPotSizes] = useState<PotSize[]>([]);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    Promise.all([
      api<Product[]>('/api/products?limit=1000'),
      api<PotSize[]>('/api/pricing/pot-sizes'),
      api<PriceRow[]>('/api/pricing/price-rows'),
    ]).then(([ps, ss, rs]) => {
      setProducts(ps);
      setPotSizes(ss);
      setRows(rs);
    }).catch((e) => setErr((e as Error).message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sizes = potSizes.filter((s) => s.active).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const visible = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()));

  const rowFor = (productId: string, potSizeId: string) => rows.find((r) => r.product_id === productId && r.pot_size_id === potSizeId);

  const saveCell = async (productId: string, potSizeId: string, value: string) => {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) return;
    setSaving((prev) => new Set([...prev, `${productId}:${potSizeId}`]));
    try {
      const existing = rowFor(productId, potSizeId);
      if (existing) {
        await api(`/api/pricing/price-rows/${existing.id}`, { method: 'PUT', json: { product_id: productId, pot_size_id: potSizeId, unit_price: price, active: true } });
      } else {
        await api(`/api/pricing/price-rows`, { method: 'PUT', json: { product_id: productId, pot_size_id: potSizeId, unit_price: price, active: true } });
      }
      load();
    } catch (e) { setErr((e as Error).message); } finally {
      setSaving((prev) => { const n = new Set(prev); n.delete(`${productId}:${potSizeId}`); return n; });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Filter products…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Btn onClick={load}>Refresh</Btn>
      </div>
      {err && <Msg kind="err">{err}</Msg>}
      <div className="rounded border border-[#e6ebe3] bg-white overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-[#f5f7f3]">
              <th className="p-3 font-medium text-stone-700">SKU</th>
              <th className="p-3 font-medium text-stone-700">Product</th>
              {sizes.map((s) => (
                <th key={s.id} className="p-3 font-medium text-stone-700 text-right">{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td className="p-4 text-stone-500 text-center" colSpan={2 + sizes.length}>No matching products.</td></tr>
            ) : (
              visible.map((p) => {
                return (
                  <tr key={p.id} className="border-b divide-y divide-stone-200">
                    <td className="p-3 font-medium">{p.sku}</td>
                    <td className="p-3">{p.name}{p.pot_size_id ? ` (default)` : ''}</td>
                    {sizes.map((s) => {
                      const row = rowFor(p.id, s.id);
                      return (
                        <td key={s.id} className="p-2 text-right">
                          <input
                            className="w-24 border-b border-transparent focus:border-green-600 focus:bg-green-50/50 p-0.5 text-right text-sm"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min={0}
                            value={row ? String(row.unit_price) : ''}
                            disabled={saving.has(`${p.id}:${s.id}`)}
                            onChange={(e) => saveCell(p.id, s.id, e.target.value)}
                            title={row ? `Active: ${row.active}` : 'No price set'}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {visible.length > 0 && (
        <p className="text-xs text-stone-500">Inline price entry per product × pot size. Changes save immediately. Breaks edited per product in the product form.</p>
      )}
    </div>
  );
}
