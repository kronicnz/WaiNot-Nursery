import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody } from '../../../../lib/api';

export const prerender = false;
export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!z.uuid().safeParse(params.id).success) return fail('Invalid task id');
  const body = await parseBody(request, z.object({ client_op_id: z.uuid() }));
  if ('error' in body) return body.error;
  const { data, error } = await locals.supabase.rpc('complete_care_task', { p_id: params.id, p_client_op_id: body.data.client_op_id });
  return error ? dbError(error) : json({ next_due: data });
};
