import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, requireOwner } from '../../../../lib/api';
import { gradeSchema } from '../../../../lib/validation';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase.from('quality_grades').select('*').order('sort_order').order('name');
  return error ? dbError(error) : json(data);
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, gradeSchema);
  if ('error' in body) return body.error;
  const { data, error } = await ctx.locals.supabase.from('quality_grades').insert(body.data).select().single();
  return error ? dbError(error) : json(data, 201);
};
