import type { APIRoute } from 'astro';
import { json } from '../../../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) =>
  json({ id: locals.user!.id, email: locals.user!.email, role: locals.role });
