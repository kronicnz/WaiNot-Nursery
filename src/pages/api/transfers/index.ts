import type { APIRoute } from 'astro';
import { dbError, fail, json, parseBody } from '../../../lib/api';
import { rateLimit } from '../../../lib/rateLimit';
import { transferSchema } from '../../../lib/validation';

export const prerender = false;

// POST: move stock between two active locations. Idempotent via client_op_id.
export const POST: APIRoute = async ({ request, locals }) => {
  if (!rateLimit(`trf:${locals.user!.id}`, 120, 60_000)) return fail('Rate limit exceeded', 429);
  const body = await parseBody(request, transferSchema);
  if ('error' in body) return body.error;
  const d = body.data;
  const { error } = await locals.supabase.rpc('transfer_stock', {
    p_product: d.product_id,
    p_from: d.from_location_id,
    p_to: d.to_location_id,
    p_batch: d.batch_id ?? null,
    p_qty: d.qty,
    p_note: d.note ?? null,
    p_client_op_id: d.client_op_id,
  });
  return error ? dbError(error) : json({ ok: true }, 201);
};