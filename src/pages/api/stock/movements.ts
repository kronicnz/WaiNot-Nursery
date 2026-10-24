import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json } from '../../../lib/api';
import { movementBatchSchema, movementSchema } from '../../../lib/validation';
import { rateLimit } from '../../../lib/rateLimit';
import { resolvePrice } from '../../../lib/pricing';

export const prerender = false;

// Accepts one movement or { movements: [...] } (offline sync). Each op is idempotent by client_op_id.
// For sales, unit_price and line_total are snapshotted server-side (source of truth); client hints are ignored.
export const POST: APIRoute = async ({ request, locals }) => {
  if (!rateLimit(`mov:${locals.user!.id}`, 300, 60_000)) return fail('Rate limit exceeded', 429);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }
  const isBatch = typeof raw === 'object' && raw !== null && 'movements' in raw;
  const parsed = isBatch ? movementBatchSchema.safeParse(raw) : movementSchema.safeParse(raw);
  if (!parsed.success) return fail('Validation failed', 400, z.flattenError<unknown>(parsed.error));

  const list = isBatch ? (parsed.data as { movements: unknown[] }).movements : [parsed.data];
  const results = [];
  for (const m of list as ReturnType<typeof movementSchema.parse>[]) {
    let pUnitPrice: number | null = null;
    let pLineTotal: number | null = null;
    if (m.reason === 'sale') {
      const resolution = await resolveMovementPrice(locals, m.product_id, m.batch_id ?? null, Math.abs(m.delta));
      pUnitPrice = resolution.unit_price;
      pLineTotal = resolution.line_total;
    }
    const { data, error } = await locals.supabase.rpc('apply_stock_movement', {
      p_product: m.product_id,
      p_batch: m.batch_id ?? null,
      p_delta: m.delta,
      p_reason: m.reason,
      p_note: m.note ?? null,
      p_client_op_id: m.client_op_id,
      p_unit_price: pUnitPrice,
      p_line_total: pLineTotal,
    });
    if (!isBatch) return error ? dbError(error) : json(data, 201);
    const status = error ? dbError(error).status : 200;
    results.push({ client_op_id: m.client_op_id, ok: !error, status, error: error ? (status === 500 ? 'Server error' : error.message) : undefined });
  }
  return json({ results });
};

async function resolveMovementPrice(locals: { supabase: any }, productId: string, batchId: string | null, qty: number) {
  const { data: product } = await locals.supabase.from('products').select('id, price, pot_size_id').eq('id', productId).maybeSingle();
  if (!product) return { unit_price: null, line_total: null };

  const { data: priceRows } = await locals.supabase
    .from('product_prices')
    .select('*, pot_sizes(name)')
    .eq('product_id', productId)
    .eq('active', true) as { data: { product_id: string; pot_size_id: string; unit_price: number; active: boolean; pot_sizes: { name: string } | null }[]; error: any };

  const { data: breaks } = await locals.supabase.from('price_breaks').select('*').eq('product_id', productId) as { data: { product_id: string; min_qty: number; discount_pct: number }[]; error: any };

  let batchContext;
  if (batchId) {
    const { data: batch } = await locals.supabase
      .from('batches')
      .select('pot_size_id, grade_id, price_override, quality_grades(adjustment_pct)')
      .eq('id', batchId)
      .maybeSingle();
    if (batch) {
      batchContext = {
        pot_size_id: batch.pot_size_id,
        grade_id: batch.grade_id,
        price_override: batch.price_override == null ? null : Number(batch.price_override),
        grade_adjustment_pct: batch.quality_grades?.[0]?.adjustment_pct == null ? 0 : Number(batch.quality_grades[0].adjustment_pct),
      };
    }
  }

  return resolvePrice({
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
}
