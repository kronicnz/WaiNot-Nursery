import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, parsePaging, parseQuery, requireOwner } from '../../../lib/api';
import { toCsv } from '../../../lib/csv';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const q = parseQuery(
    ctx.url.searchParams,
    z.object({
      product_id: z.uuid().optional(),
      batch_id: z.uuid().optional(),
      user_id: z.uuid().optional(),
      reason: z.enum(['receive', 'sale', 'adjust', 'transfer', 'loss', 'stocktake']).optional(),
      from: z.iso.date().optional(),
      to: z.iso.date().optional(),
    }),
  );
  if ('error' in q) return q.error;
  const { limit, offset } = parsePaging(ctx.url.searchParams, 5000);

  let query = ctx.locals.supabase
    .from('stock_movements')
    .select('*, products(sku,name), batches(batch_code), locations(name,kind), profiles(name,email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (q.data.product_id) query = query.eq('product_id', q.data.product_id);
  if (q.data.batch_id) query = query.eq('batch_id', q.data.batch_id);
  if (q.data.user_id) query = query.eq('user_id', q.data.user_id);
  if (q.data.reason) query = query.eq('reason', q.data.reason);
  if (q.data.from) query = query.gte('created_at', `${q.data.from}T00:00:00Z`);
  if (q.data.to) query = query.lte('created_at', `${q.data.to}T23:59:59Z`);
  const { data, error } = await query;
  if (error) return dbError(error);

  const rows: (string | number | boolean | null)[][] = [
    ['id', 'created_at', 'product_sku', 'product_name', 'batch_code', 'location', 'delta', 'reason', 'note', 'user', 'user_email', 'client_op_id'],
  ];
  for (const m of data as any[]) {
    rows.push([
      m.id,
      m.created_at,
      m.products?.sku ?? '',
      m.products?.name ?? '',
      m.batches?.batch_code ?? '',
      m.locations?.name ?? '',
      m.delta,
      m.reason,
      m.note ?? '',
      m.profiles?.name ?? '',
      m.profiles?.email ?? '',
      m.client_op_id,
    ]);
  }
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="movements-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
};