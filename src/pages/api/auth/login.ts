import type { APIRoute } from 'astro';
import { fail, json, parseBody } from '../../../lib/api';
import { rateLimit } from '../../../lib/rateLimit';
import { loginSchema } from '../../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000)) return fail('Too many attempts. Try again later.', 429);

  const body = await parseBody(request, loginSchema);
  if ('error' in body) return body.error;

  const { error } = await locals.supabase.auth.signInWithPassword(body.data);
  if (error) return fail('Invalid email or password', 401);
  return json({ ok: true });
};
