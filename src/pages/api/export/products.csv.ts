import type { APIRoute } from 'astro';
import { dbError } from '../../../lib/api';
import { toCsv } from '../../../lib/csv';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase
    .from('products')
    .select('sku,name,botanical_name,pot_size,price,reorder_level,public_description,public_image_url,public_image_alt,active,categories(name),product_barcodes(barcode),stock_levels(qty)')
    .order('sku')
    .limit(10000);
  if (error) return dbError(error);

  const rows: (string | number | boolean | null)[][] = [
    ['sku', 'name', 'botanical_name', 'category', 'pot_size', 'price', 'reorder_level', 'public_description', 'public_image_url', 'public_image_alt', 'barcode', 'total_qty', 'active'],
  ];
  for (const p of data as any[]) {
    rows.push([
      p.sku, p.name, p.botanical_name, p.categories?.name ?? '', p.pot_size, p.price, p.reorder_level,
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
