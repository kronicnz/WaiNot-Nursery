import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, requireOwner } from '../../../../lib/api';

export const prerender = false;

const unarchiveSchema = z.object({ unarchive: z.boolean().optional() });

// PATCH with no body archives (zero-stock only, enforced by archive_batch RPC).
// PATCH with { unarchive: true } restores an archived batch.
// PATCH with batch fields (pot_size_id, grade_id, price_override) updates them.
export const PATCH: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  if (!z.uuid().safeParse(ctx.params.id).success) return fail('Invalid id');

  let raw: unknown;
  try {
    raw = await ctx.request.json();
  } catch {
    raw = null;
  }

  const unarchive = unarchiveSchema.safeParse(raw ?? {});
  if (unarchive.success && unarchive.data.unarchive === true) {
    const { data, error } = await ctx.locals.supabase.rpc('unarchive_batch', { p_id: ctx.params.id });
    return error ? dbError(error) : json({ archived_at: data });
  }

  const updateSchema = z.object({
    pot_size_id: z.uuid().nullable().optional(),
    grade_id: z.uuid().nullable().optional(),
    price_override: z.number().min(0).max(100000).nullable().optional(),
  });
  const fields = updateSchema.safeParse(raw ?? {});
  if (!fields.success) {
    const { data, error } = await ctx.locals.supabase.rpc('archive_batch', { p_id: ctx.params.id });
    return error ? dbError(error) : json({ archived_at: data });
  }
  const updateData = fields.data;
  const present = Object.keys(updateData).filter((k) => updateData[k as keyof typeof updateData] !== undefined);
  if (present.length === 0) {
    const { data, error } = await ctx.locals.supabase.rpc('archive_batch', { p_id: ctx.params.id });
    return error ? dbError(error) : json({ archived_at: data });
  }
  const { data, error } = await ctx.locals.supabase.from('batches').update(updateData).eq('id', ctx.params.id).select().single();
  if (error) return dbError(error);
  return data ? json(data) : fail('Not found', 404);
};
