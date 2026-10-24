import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, requireOwner } from '../../../../lib/api';
import { gradePatchSchema } from '../../../../lib/validation';

export const prerender = false;

const idParam = z.uuid();

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const id = ctx.params.id!;
  if (!idParam.safeParse(id).success) return fail('Invalid id');
  const body = await parseBody(ctx.request, gradePatchSchema);
  if ('error' in body) return body.error;
  const { data, error } = await ctx.locals.supabase.from('quality_grades').update(body.data).eq('id', id).select().single();
  if (error) return dbError(error);
  return data ? json(data) : fail('Not found', 404);
};

export const DELETE: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const id = ctx.params.id!;
  if (!idParam.safeParse(id).success) return fail('Invalid id');
  const { data, error } = await ctx.locals.supabase.from('quality_grades').update({ active: false }).eq('id', id).select().single();
  if (error) return dbError(error);
  return data ? json({ ok: true }) : fail('Not found', 404);
};
