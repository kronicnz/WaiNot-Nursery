import type { APIRoute } from 'astro';
import { json } from '../../../lib/api';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  await locals.supabase.auth.signOut();
  return json({ ok: true });
};
