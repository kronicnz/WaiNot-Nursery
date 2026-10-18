import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, requireOwner } from '../../../../lib/api';

export const prerender = false;

// PATCH with no body archives (zero-stock only, enforced by archive_batch RPC).
// PATCH with { unarchive: true } restores an archived batch.
export const PATCH: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  if (!z.uuid().safeParse(ctx.params.id).success) return fail('Invalid id');
  const unarchive = await parseBody(ctx.request, z.object({ unarchive: z.boolean().optional() }).optional());
  if ('error' in unarchive) return unarchive.error;
  if (unarchive.data?.unarchive) {
    const { data, error } = await ctx.locals.supabase.rpc('unarchive_batch', { p_id: ctx.params.id });
    return error ? dbError(error) : json({ archived_at: data });
  }
  const { data, error } = await ctx.locals.supabase.rpc('archive_batch', { p_id: ctx.params.id });
  return error ? dbError(error) : json({ archived_at: data });
};