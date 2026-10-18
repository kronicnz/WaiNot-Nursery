import type { APIRoute } from 'astro';
import { dbError, fail, json, parseBody, requireOwner } from '../../../lib/api';
import { createAdminClient } from '../../../lib/supabase/server';
import { userInviteSchema } from '../../../lib/validation';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const { data: profiles, error } = await ctx.locals.supabase.from('profiles').select('*').order('created_at');
  if (error) return dbError(error);
  const { data: users } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
  const emails = new Map((users?.users ?? []).map((u) => [u.id, u.email]));
  return json(profiles.map((p) => ({ ...p, email: emails.get(p.id) ?? null })));
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, userInviteSchema);
  if ('error' in body) return body.error;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(body.data.email, { data: { name: body.data.name } });
  if (error || !data.user) return fail('Could not invite user', 400);
  const { error: pErr } = await ctx.locals.supabase
    .from('profiles')
    .update({ role: body.data.role, name: body.data.name })
    .eq('id', data.user.id);
  if (pErr) return dbError(pErr);
  return json({ id: data.user.id }, 201);
};
