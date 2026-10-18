import type { APIRoute } from 'astro';
import { dbError, json, parseBody } from '../../../lib/api';
import { stocktakeSchema } from '../../../lib/validation';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase
    .from('stocktakes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  return error ? dbError(error) : json(data);
};

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await parseBody(request, stocktakeSchema);
  if ('error' in body) return body.error;
  const { data, error } = await locals.supabase
    .from('stocktakes')
    .insert({ created_by: locals.user!.id })
    .select()
    .single();
  return error ? dbError(error) : json(data, 201);
};
