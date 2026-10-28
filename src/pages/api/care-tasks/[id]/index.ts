import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody } from '../../../../lib/api';
import { careTaskSchema } from '../index';

export const prerender = false;
export const PATCH: APIRoute = async ({ request, locals, params }) => {
  if (!z.uuid().safeParse(params.id).success) return fail('Invalid task id');
  const body = await parseBody(request, careTaskSchema);
  if ('error' in body) return body.error;
  const { data, error } = await locals.supabase.from('care_tasks').update(body.data)
    .eq('id', params.id).is('completed_at', null).select().maybeSingle();
  return error ? dbError(error) : data ? json(data) : fail('Open task not found', 404);
};
