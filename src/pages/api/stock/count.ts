import type { APIRoute } from 'astro';
import { dbError, fail, json, parseBody, requireOwner } from '../../../lib/api';
import { rateLimit } from '../../../lib/rateLimit';
import { stockCountSchema } from '../../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const { request, locals } = ctx;
  if (!rateLimit(`stock-count:${locals.user!.id}`, 100, 60_000)) return fail('Rate limit exceeded', 429);
  const body = await parseBody(request, stockCountSchema);
  if ('error' in body) return body.error;

  const { data, error } = await locals.supabase.rpc('set_batch_stock_count', {
    p_product: body.data.product_id,
    p_batch: body.data.batch_id ?? null,
    p_count: body.data.counted_qty,
    p_note: body.data.note ?? null,
    p_client_op_id: body.data.client_op_id,
  });
  return error ? dbError(error) : json({ adjustments: data });
};
