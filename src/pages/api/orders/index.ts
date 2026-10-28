import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody } from '../../../lib/api';
import { orderPrice } from '../../../lib/orderPricing';

export const prerender = false;
const schema = z.object({
  customer_id: z.uuid().nullable(),
  notes: z.string().trim().max(2000).nullable(),
  lines: z.array(z.object({
    product_id: z.uuid(), batch_id: z.uuid().nullable(), location_id: z.uuid().nullable(),
    quantity: z.number().int().min(1).max(100000),
  })).min(1).max(100),
});

export const GET: APIRoute = async ({ locals }) => {
  const { data, error } = await locals.supabase.from('orders')
    .select('*, customers(name,email,phone), order_lines(*, products(name,sku), batches(batch_code), locations(name))')
    .order('created_at', { ascending: false }).limit(200);
  return error ? dbError(error) : json(data);
};

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await parseBody(request, schema);
  if ('error' in body) return body.error;
  const lines = [];
  for (const line of body.data.lines) {
    const result = await orderPrice(locals.supabase, line.product_id, line.batch_id, line.quantity);
    if (result.error) return result.error;
    if (result.data.unit_price === null) return fail('Set a price for every order line before creating the order', 400);
    if (result.data.line_total === null || result.data.line_total >= 10_000_000_000) return fail('Order line total is too large', 400);
    lines.push({ ...line, unit_price: result.data.unit_price });
  }
  const { data, error } = await locals.supabase.rpc('create_nursery_order', {
    p_customer: body.data.customer_id, p_notes: body.data.notes, p_lines: lines,
  });
  return error ? dbError(error) : json({ id: data }, 201);
};
