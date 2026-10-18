import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json } from '../../../../lib/api';

export const prerender = false;

// Returns the stocktake, its counted lines, and the expected (system) quantities for comparison.
export const GET: APIRoute = async ({ locals, params }) => {
  if (!z.uuid().safeParse(params.id).success) return fail('Invalid id');
  const sb = locals.supabase;
  const { data: st, error } = await sb.from('stocktakes').select('*').eq('id', params.id!).maybeSingle();
  if (error) return dbError(error);
  if (!st) return fail('Not found', 404);

  const [lines, levels] = await Promise.all([
    sb.from('stocktake_lines').select('*, products(sku,name), batches(batch_code,potted_on)').eq('stocktake_id', st.id),
    sb.from('stock_levels').select('product_id, batch_id, qty'),
  ]);
  if (lines.error) return dbError(lines.error);
  if (levels.error) return dbError(levels.error);
  return json({ ...st, lines: lines.data, expected: levels.data });
};
