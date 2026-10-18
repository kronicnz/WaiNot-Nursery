import type { APIRoute } from 'astro';
import { dbError, fail, json, parseBody, requireOwner } from '../../../../lib/api';
import { locationPatchSchema } from '../../../../lib/validation';
import { z } from 'zod';

export const prerender = false;

export const GET: APIRoute = async ({ locals, params }) => {
  if (!z.uuid().safeParse(params.id).success) return fail('Invalid id');
  const { data, error } = await locals.supabase.from('locations').select('*').eq('id', params.id!).maybeSingle();
  return error ? dbError(error) : data ? json(data) : fail('Not found', 404);
};

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  if (!z.uuid().safeParse(ctx.params.id).success) return fail('Invalid id');
  const body = await parseBody(ctx.request, locationPatchSchema);
  if ('error' in body) return body.error;
  const { data, error } = await ctx.locals.supabase
    .from('locations')
    .update(body.data)
    .eq('id', ctx.params.id!)
    .select()
    .maybeSingle();
  if (error) return dbError(error);
  return data ? json(data) : fail('Not found', 404);
};

// Soft-deactivate: stock history (stock_levels / stock_movements) references locations,
// so a hard delete would violate foreign keys. Toggling active=false hides it from selects.
export const DELETE: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  if (!z.uuid().safeParse(ctx.params.id).success) return fail('Invalid id');
  const { data, error } = await ctx.locals.supabase
    .from('locations')
    .update({ active: false })
    .eq('id', ctx.params.id!)
    .select()
    .maybeSingle();
  if (error) return dbError(error);
  return data ? json({ ok: true, active: false }) : fail('Not found', 404);
};