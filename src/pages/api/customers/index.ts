import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, json, parseBody } from '../../../lib/api';

export const prerender = false;
export const customerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.union([z.email().max(254), z.literal('')]).nullable().transform((v) => v || null),
  phone: z.string().trim().max(80).nullable().transform((v) => v || null),
  notes: z.string().trim().max(2000).nullable().transform((v) => v || null),
});

export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase.from('customers').select('*').is('archived_at', null).order('name').limit(1000);
  return error ? dbError(error) : json(data);
};

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await parseBody(request, customerSchema);
  if ('error' in body) return body.error;
  const { data, error } = await locals.supabase.from('customers').insert(body.data).select().single();
  return error ? dbError(error) : json(data, 201);
};
