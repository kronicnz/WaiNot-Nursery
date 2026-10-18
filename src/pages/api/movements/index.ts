import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, json, parsePaging, parseQuery } from '../../../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  const q = parseQuery(
    url.searchParams,
    z.object({
      product_id: z.string().uuid().optional(),
      reason: z.enum(['receive', 'sale', 'adjust', 'transfer', 'loss', 'stocktake']).optional(),
    }),
  );
  if ('error' in q) return q.error;
  const { limit, offset } = parsePaging(url.searchParams);

  let query = locals.supabase
    .from('stock_movements')
    .select('*, products(sku,name), batches(batch_code)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (q.data.product_id) query = query.eq('product_id', q.data.product_id);
  if (q.data.reason) query = query.eq('reason', q.data.reason);
  const { data, error, count } = await query;
  return error ? dbError(error) : json({ items: data, total: count });
};
