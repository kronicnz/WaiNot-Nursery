import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, requireOwner } from '../../../../lib/api';
import { potSizeSchema, potSizePatchSchema } from '../../../../lib/validation';

export const prerender = false;

const idParam = z.uuid();

export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase
    .from('pot_sizes')
    .select('*')
    .order('sort_order')
    .order('name');
  return error ? dbError(error) : json(data);
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, potSizeSchema);
  if ('error' in body) return body.error;
  const { data, error } = await ctx.locals.supabase.from('pot_sizes').insert(body.data).select().single();
  return error ? dbError(error) : json(data, 201);
};
