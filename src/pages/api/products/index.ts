import type { APIRoute } from 'astro';
import { dbError, fail, json, parsePaging, parseBody, requireOwner, sanitizeSearch } from '../../../lib/api';
import { productSchema } from '../../../lib/validation';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  const { limit, offset } = parsePaging(url.searchParams);
  const q = sanitizeSearch(url.searchParams.get('q') ?? '');
  const category = url.searchParams.get('category');
  const includeInactive = url.searchParams.get('inactive') === '1';

  let query = locals.supabase
    .from('products')
    .select('*, product_barcodes(barcode,type), batches(id,batch_code,potted_on,barcode,archived_at), stock_levels(batch_id,location_id,qty)', { count: 'exact' })
    .order('name')
    .range(offset, offset + limit - 1);
  if (!includeInactive) query = query.eq('active', true);
  if (category) query = query.eq('category_id', category);
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,botanical_name.ilike.%${q}%,public_description.ilike.%${q}%`);

  const { data, error, count } = await query;
  if (error) return dbError(error);
  const items = (data ?? []).map(({ stock_levels, ...p }) => {
    const levels = stock_levels as { batch_id: string | null; location_id: string | null; qty: number }[];
    const batches = p.batches as {
      id: string;
      batch_code: string;
      potted_on: string | null;
      barcode: string;
      archived_at: string | null;
    }[];
    return {
      ...p,
      stock_levels: levels,
      batches: batches.map((batch) => ({
        ...batch,
        qty: levels.filter((level) => level.batch_id === batch.id).reduce((total, level) => total + level.qty, 0),
      })),
      total_qty: levels.reduce((n, s) => n + s.qty, 0),
    };
  });
  return json({ items, total: count ?? items.length });
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, productSchema);
  if ('error' in body) return body.error;

  const { barcodes, ...fields } = body.data;
  const { data: product, error } = await ctx.locals.supabase.from('products').insert(fields).select().single();
  if (error) return dbError(error);

  if (barcodes?.length) {
    const { error: bErr } = await ctx.locals.supabase
      .from('product_barcodes')
      .insert(barcodes.map((b) => ({ ...b, product_id: product.id })));
    if (bErr) {
      await ctx.locals.supabase.from('products').delete().eq('id', product.id);
      return bErr.code === '23505' ? fail('A barcode is already assigned to another product', 409) : dbError(bErr);
    }
  }
  return json(product, 201);
};
