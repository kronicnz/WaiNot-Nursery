import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, json, parseBody } from '../../../lib/api';

export const prerender = false;
export const careTaskSchema = z.object({
  title: z.string().trim().min(1).max(200), notes: z.string().trim().max(2000).nullable(),
  due_on: z.iso.date(), repeat_days: z.number().int().min(1).max(3650).nullable(),
  batch_id: z.uuid().nullable(), location_id: z.uuid().nullable(),
});
export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase.from('care_tasks')
    .select('*, batches(batch_code, products(name)), locations(name), care_task_completions(due_on, completed_at)')
    .order('due_on').limit(500);
  return error ? dbError(error) : json(data);
};
export const POST: APIRoute = async ({ request, locals }) => {
  const body = await parseBody(request, careTaskSchema);
  if ('error' in body) return body.error;
  const { data, error } = await locals.supabase.from('care_tasks')
    .insert({ ...body.data, created_by: locals.user!.id }).select().single();
  return error ? dbError(error) : json(data, 201);
};
