import type { APIRoute } from 'astro';
import { dbError } from '../../../lib/api';
import { toCsv } from '../../../lib/csv';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const sb = locals.supabase;
  const { data: products, error: pErr } = await sb
    .from('products')
    .select('sku,name,botanical_name,pot_size_id,reorder_level,public_description,public_image_url,public_image_alt,active,categories(name),product_barcodes(barcode),stock_levels(qty)')
    .order('sku')
    .limit(10000);
  if (pErr) return dbError(pErr);

  const { data: sizes, error: sErr } = await sb.from('pot_sizes').select('id, name').eq('active', true);
  if (sErr) return dbError(sErr);
  const sizeById = new Map((sizes ?? []).map((s: { id: string; name: string }) => [s.id, s.name]));

  const { data: prices, error: prErr } = await sb.from('product_prices').select('product_id, pot_size_id, unit_price').eq('active', true);
  if (prErr) return dbError(prErr);
  const priceByKey = new Map((prices ?? []).map((p: { product_id: string; pot_size_id: string; unit_price: number }) => [`${p.product_id}|${p.pot_size_id}`, p.unit_price]));

  const rows: (string | number | boolean | null)[][] = [
    ['sku', 'name', 'botanical_name', 'category', 'pot_size', 'price', 'reorder_level', 'public_description', 'public_image_url', 'public_image_alt', 'barcode', 'total_qty', 'active'],
  ];
  for (const p of products as any[]) {
    const potSizeId = p.pot_size_id;
    rows.push([
      p.sku, p.name, p.botanical_name, p.categories?.name ?? '', sizeById.get(potSizeId) ?? '',
      potSizeId != null ? priceByKey.get(`${p.id}|${potSizeId}`) ?? null : null,
      p.reorder_level,
      p.public_description, p.public_image_url, p.public_image_alt,
      (p.product_barcodes ?? []).map((b: { barcode: string }) => b.barcode).join(';'),
      (p.stock_levels ?? []).reduce((n: number, s: { qty: number }) => n + s.qty, 0),
      p.active,
    ]);
  }
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="products.csv"',
      'Cache-Control': 'no-store',
    },
  });
};
