import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, requireOwner } from '../../../../lib/api';
import { userPatchSchema } from '../../../../lib/validation';

export const prerender = false;

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const id = ctx.params.id!;
  if (!z.string().uuid().safeParse(id).success) return fail('Invalid id');
  const body = await parseBody(ctx.request, userPatchSchema);
  if ('error' in body) return body.error;
  if (id === ctx.locals.user!.id && (body.data.role === 'staff' || body.data.active === false)) {
    return fail('You cannot demote or deactivate yourself', 400);
  }
  const { data, error } = await ctx.locals.supabase.from('profiles').update(body.data).eq('id', id).select().maybeSingle();
  if (error) return dbError(error);
  return data ? json(data) : fail('Not found', 404);
};
