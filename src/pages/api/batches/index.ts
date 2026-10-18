import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, requireOwner } from '../../../lib/api';
import { batchSchema } from '../../../lib/validation';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  const productId = url.searchParams.get('product_id');
  if (!z.uuid().safeParse(productId).success) return fail('product_id is required');
  const { data, error } = await locals.supabase
    .from('batches')
    .select('*')
    .eq('product_id', productId!)
    .order('potted_on', { ascending: false });
  return error ? dbError(error) : json(data);
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, batchSchema);
  if ('error' in body) return body.error;
  const { data, error } = await ctx.locals.supabase.from('batches').insert(body.data).select().single();
  return error ? dbError(error) : json(data, 201);
};
