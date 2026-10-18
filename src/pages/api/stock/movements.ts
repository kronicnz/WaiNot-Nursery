import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json } from '../../../lib/api';
import { movementBatchSchema, movementSchema } from '../../../lib/validation';
import { rateLimit } from '../../../lib/rateLimit';

export const prerender = false;

// Accepts one movement or { movements: [...] } (offline sync). Each op is idempotent by client_op_id.
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
    const { data, error } = await locals.supabase.rpc('apply_stock_movement', {
      p_product: m.product_id,
      p_batch: m.batch_id ?? null,
      p_delta: m.delta,
      p_reason: m.reason,
      p_note: m.note ?? null,
      p_client_op_id: m.client_op_id,
    });
    if (!isBatch) return error ? dbError(error) : json(data, 201);
    const status = error ? dbError(error).status : 200;
    results.push({ client_op_id: m.client_op_id, ok: !error, status, error: error ? (status === 500 ? 'Server error' : error.message) : undefined });
  }
  return json({ results });
};
