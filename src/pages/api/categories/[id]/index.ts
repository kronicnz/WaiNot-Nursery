import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, requireOwner } from '../../../../lib/api';
import { categorySchema } from '../../../../lib/validation';

export const prerender = false;

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  if (!z.uuid().safeParse(ctx.params.id).success) return fail('Invalid id');
  const body = await parseBody(ctx.request, categorySchema);
  if ('error' in body) return body.error;
  const { data, error } = await ctx.locals.supabase.from('categories').update(body.data).eq('id', ctx.params.id!).select().maybeSingle();
  if (error) return dbError(error);
  return data ? json(data) : fail('Not found', 404);
};

export const DELETE: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  if (!z.uuid().safeParse(ctx.params.id).success) return fail('Invalid id');
  const sb = ctx.locals.supabase;
  const { count, error: countError } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', ctx.params.id!);
  if (countError) return dbError(countError);
  if (count) return fail('Reassign products before deleting this category', 409);
  const { error } = await sb.from('categories').delete().eq('id', ctx.params.id!);
  return error ? dbError(error) : json({ ok: true });
};
