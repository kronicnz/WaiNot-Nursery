import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json } from '../../../lib/api';
import { resolvePrice } from '../../../lib/pricing';

export const prerender = false;

const querySchema = z.object({
  product_id: z.uuid(),
  batch_id: z.uuid().optional(),
  qty: z.string().optional().transform((v) => (v == null ? 1 : Number(v))).refine((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 100000, { message: 'qty must be an integer 1-100000' }),
});

export const GET: APIRoute = async ({ url, locals }) => {
  const q = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) return fail('Invalid query', 400, z.flattenError(q.error));
  const { product_id, batch_id, qty } = q.data;

  const { data: product, error: pErr } = await locals.supabase
    .from('products')
    .select('id, price, pot_size_id')
    .eq('id', product_id)
    .maybeSingle();
  if (pErr) return dbError(pErr);
  if (!product) return fail('Product not found', 404);

  const { data: priceRows, error: rErr } = await locals.supabase
    .from('product_prices')
    .select('*, pot_sizes(name)')
    .eq('product_id', product_id)
    .eq('active', true);
  if (rErr) return dbError(rErr);

  const { data: breaks, error: bErr } = await locals.supabase.from('price_breaks').select('*').eq('product_id', product_id);
  if (bErr) return dbError(bErr);

  let batchContext;
  if (batch_id) {
    const { data: batch, error: batErr } = await locals.supabase
      .from('batches')
      .select('pot_size_id, grade_id, price_override, quality_grades(adjustment_pct)')
      .eq('id', batch_id)
      .maybeSingle();
    if (batErr) return dbError(batErr);
    if (batch) {
      batchContext = {
        pot_size_id: batch.pot_size_id,
        grade_id: batch.grade_id,
        price_override: batch.price_override == null ? null : Number(batch.price_override),
        grade_adjustment_pct: batch.quality_grades?.[0]?.adjustment_pct == null ? 0 : Number(batch.quality_grades[0].adjustment_pct),
      };
    }
  }

  const resolution = resolvePrice({
    product: {
      id: product.id,
      price: product.price == null ? null : Number(product.price),
      pot_size_id: product.pot_size_id,
    },
    priceRows: (priceRows ?? []).map((row) => ({
      product_id: row.product_id,
      pot_size_id: row.pot_size_id,
      unit_price: Number(row.unit_price),
      active: row.active,
      pot_size_name: row.pot_sizes?.name ?? null,
    })),
    breaks: (breaks ?? []).map((b) => ({
      product_id: b.product_id,
      min_qty: b.min_qty,
      discount_pct: Number(b.discount_pct),
    })),
    batch: batchContext,
    qty,
  });

  return json(resolution);
};
