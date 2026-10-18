import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, json, parseQuery } from '../../../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  const q = parseQuery(
    url.searchParams,
    z.object({ product_id: z.uuid().optional() }),
  );
  if ('error' in q) return q.error;

  let query = locals.supabase.from('stock_levels').select('*, products(sku,name), batches(batch_code,potted_on)').gt('qty', 0).limit(1000);
  if (q.data.product_id) query = query.eq('product_id', q.data.product_id);
  const { data, error } = await query;
  return error ? dbError(error) : json(data);
};
