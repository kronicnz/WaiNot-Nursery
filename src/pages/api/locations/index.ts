import type { APIRoute } from 'astro';
import { dbError, fail, json, parseBody, parseQuery, requireOwner } from '../../../lib/api';
import { locationSchema, locationPatchSchema } from '../../../lib/validation';
import { z } from 'zod';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  const q = parseQuery(url.searchParams, z.object({ active: z.enum(['0', '1']).optional() }));
  if ('error' in q) return q.error;
  let query = locals.supabase.from('locations').select('*').order('name');
  if (q.data.active === '1') query = query.eq('active', true);
  else if (q.data.active === '0') query = query.eq('active', false);
  const { data, error } = await query;
  return error ? dbError(error) : json(data);
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, locationSchema);
  if ('error' in body) return body.error;
  const { data, error } = await ctx.locals.supabase.from('locations').insert(body.data).select().single();
  return error ? dbError(error) : json(data, 201);
};