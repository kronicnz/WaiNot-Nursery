import type { APIRoute } from 'astro';
import { dbError, json, parseBody, requireOwner } from '../../../lib/api';
import { categorySchema } from '../../../lib/validation';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase.from('categories').select('*').order('name');
  return error ? dbError(error) : json(data);
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, categorySchema);
  if ('error' in body) return body.error;
  const { data, error } = await ctx.locals.supabase.from('categories').insert(body.data).select().single();
  return error ? dbError(error) : json(data, 201);
};
