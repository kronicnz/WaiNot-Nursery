import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, json, parseQuery } from '../../lib/api';

export const prerender = false;
export const GET: APIRoute = async ({ locals, url }) => {
  const query = parseQuery(url.searchParams, z.object({ today: z.iso.date() }));
  if ('error' in query) return query.error;
  const [orders, tasks] = await Promise.all([
    locals.supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    locals.supabase.from('care_tasks').select('id', { count: 'exact', head: true }).is('completed_at', null).lte('due_on', query.data.today),
  ]);
  if (orders.error) return dbError(orders.error);
  if (tasks.error) return dbError(tasks.error);
  return json({ open_orders: orders.count, due_tasks: tasks.count });
};
