import type { APIRoute } from 'astro';
import { dbError } from '../../../lib/api';
import { toCsv } from '../../../lib/csv';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase
    .from('public_catalog_price_list')
    .select('*')
    .order('category_sort_order')
    .order('sort_order')
    .order('pot_size')
    .order('min_qty')
    .limit(10000);
  if (error) return dbError(error);

  const rows: (string | number | boolean | null)[][] = [
    ['sku', 'name', 'category', 'pot_size', 'min_qty', 'discount_pct', 'unit_price'],
  ];
  for (const r of data as any[]) {
    rows.push([r.sku, r.name, r.category, r.pot_size, r.min_qty, r.discount_pct, r.unit_price]);
  }
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="price-list.csv"',
      'Cache-Control': 'no-store',
    },
  });
};
