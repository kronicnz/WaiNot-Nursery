import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, requireOwner } from '../../../../lib/api';

export const prerender = false;

const idParam = z.uuid();

export const DELETE: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const id = ctx.params.id!;
  if (!idParam.safeParse(id).success) return fail('Invalid id');
  const { data, error } = await ctx.locals.supabase.from('product_prices').delete().eq('id', id).select();
  if (error) return dbError(error);
  return json({ ok: true, deleted: (data ?? []).length });
};
