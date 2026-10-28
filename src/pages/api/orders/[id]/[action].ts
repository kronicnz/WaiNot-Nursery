import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json } from '../../../../lib/api';

export const prerender = false;
export const POST: APIRoute = async ({ locals, params }) => {
  if (!z.uuid().safeParse(params.id).success) return fail('Invalid order id');
  if (params.action !== 'fulfill' && params.action !== 'cancel') return fail('Unknown order action', 404);
  const { data, error } = await locals.supabase.rpc(
    params.action === 'fulfill' ? 'fulfill_nursery_order' : 'cancel_nursery_order', { p_id: params.id },
  );
  return error ? dbError(error) : json({ status: data });
};
