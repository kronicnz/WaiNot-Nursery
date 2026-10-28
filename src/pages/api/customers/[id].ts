import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody } from '../../../lib/api';
import { customerSchema } from './index';

export const prerender = false;
export const PATCH: APIRoute = async ({ request, locals, params }) => {
  if (!z.uuid().safeParse(params.id).success) return fail('Invalid customer id');
  const body = await parseBody(request, customerSchema);
  if ('error' in body) return body.error;
  const { data, error } = await locals.supabase.from('customers').update(body.data).eq('id', params.id).select().maybeSingle();
  return error ? dbError(error) : data ? json(data) : fail('Customer not found', 404);
};
