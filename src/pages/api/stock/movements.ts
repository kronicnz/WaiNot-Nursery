import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json } from '../../../lib/api';
import { movementBatchSchema, movementSchema } from '../../../lib/validation';
import { rateLimit } from '../../../lib/rateLimit';
import { orderPrice } from '../../../lib/orderPricing';

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
      const resolution = await orderPrice(locals.supabase, m.product_id, m.batch_id ?? null, Math.abs(m.delta));
      if (resolution.error) {
        if (!isBatch) return resolution.error;
        const detail: { error: string } = await resolution.error.json();
        results.push({ client_op_id: m.client_op_id, ok: false, status: resolution.error.status, error: detail.error });
        continue;
      }
      pUnitPrice = resolution.data.unit_price;
      pLineTotal = resolution.data.line_total;
    }
    const { data, error } = await locals.supabase.rpc('apply_stock_movement', {
      p_product: m.product_id,
      p_batch: m.batch_id ?? null,
      p_location: m.location_id ?? null,
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
