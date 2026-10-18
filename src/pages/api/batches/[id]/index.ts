import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, requireOwner } from '../../../../lib/api';

export const prerender = false;

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  if (!z.string().uuid().safeParse(ctx.params.id).success) return fail('Invalid id');
  const { data, error } = await ctx.locals.supabase.rpc('archive_batch', { p_id: ctx.params.id });
  return error ? dbError(error) : json({ archived_at: data });
};
