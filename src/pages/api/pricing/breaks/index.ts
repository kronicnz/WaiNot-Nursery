import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, parseQuery, requireOwner } from '../../../../lib/api';
import { priceBreakSchema } from '../../../../lib/validation';

export const prerender = false;

const querySchema = z.object({ product_id: z.uuid().optional() });

export const GET: APIRoute = async ({ url, locals }) => {
  const q = parseQuery(url.searchParams, querySchema);
  if ('error' in q) return q.error;
  let query = locals.supabase.from('price_breaks').select('*').order('min_qty');
  if (q.data.product_id) query = query.eq('product_id', q.data.product_id);
  const { data, error } = await query;
  return error ? dbError(error) : json(data);
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, priceBreakSchema);
  if ('error' in body) return body.error;
  const { data, error } = await ctx.locals.supabase.from('price_breaks').insert(body.data).select().single();
  return error ? dbError(error) : json(data, 201);
};
