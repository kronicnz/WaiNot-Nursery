import type { APIRoute } from 'astro';
import { dbError, json } from '../../../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase.from('low_stock').select('*').order('total_qty').limit(500);
  return error ? dbError(error) : json(data);
};
