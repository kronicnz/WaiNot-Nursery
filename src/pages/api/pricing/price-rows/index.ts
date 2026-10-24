import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, parseQuery, requireOwner } from '../../../../lib/api';
import { priceRowSchema } from '../../../../lib/validation';

export const prerender = false;

const querySchema = z.object({ product_id: z.uuid().optional() });

export const GET: APIRoute = async ({ url, locals }) => {
  const q = parseQuery(url.searchParams, querySchema);
  if ('error' in q) return q.error;
  let query = locals.supabase.from('product_prices').select('*, pot_sizes(name)').order('pot_sizes(sort_order)');
  if (q.data.product_id) query = query.eq('product_id', q.data.product_id);
  const { data, error } = await query;
  return error ? dbError(error) : json(data);
};

export const PUT: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, priceRowSchema);
  if ('error' in body) return body.error;
  const { product_id, pot_size_id, ...fields } = body.data;
  const { data, error } = await ctx.locals.supabase
    .from('product_prices')
    .upsert({ product_id, pot_size_id, ...fields }, { onConflict: 'product_id,pot_size_id' })
    .select()
    .single();
  return error ? dbError(error) : json(data, 200);
};
