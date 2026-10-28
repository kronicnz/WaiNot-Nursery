import type { APIRoute } from 'astro';
import { z } from 'zod';
import { fail, json } from '../../../lib/api';
import { orderPrice } from '../../../lib/orderPricing';

export const prerender = false;

const querySchema = z.object({
  product_id: z.uuid(),
  batch_id: z.uuid().optional(),
  qty: z.string().optional().transform((v) => (v == null ? 1 : Number(v))).refine((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 100000, { message: 'qty must be an integer 1-100000' }),
});

export const GET: APIRoute = async ({ url, locals }) => {
  const q = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) return fail('Invalid query', 400, z.flattenError(q.error));
  const { product_id, batch_id, qty } = q.data;

  const result = await orderPrice(locals.supabase, product_id, batch_id ?? null, qty);
  return result.error ?? json(result.data);
};
