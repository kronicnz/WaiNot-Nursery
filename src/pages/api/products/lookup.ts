import type { APIRoute } from 'astro';
import { dbError, fail, json, parseQuery } from '../../../lib/api';
import { z } from 'zod';
import { barcodeCandidates } from '../../../lib/barcode';
import type { Product } from '../../../lib/client/api';

export const prerender = false;

function activeBatches(product: Product): Product {
  return {
    ...product,
    batches: product.batches?.filter((batch) => batch.archived_at === null),
  };
}

function firstProduct(value: Product | Product[] | null | undefined): Product | null {
  if (Array.isArray(value)) return value[0] ? activeBatches(value[0]) : null;
  return value ? activeBatches(value) : null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const q = parseQuery(url.searchParams, z.object({ barcode: z.string().trim().min(1).max(128) }));
  if ('error' in q) return q.error;

  const select = '*, stock_levels(batch_id, location_id, qty), batches(id,batch_code,potted_on,barcode,archived_at), product_barcodes(barcode,type)';
  const { data, error } = await locals.supabase
    .from('product_barcodes')
    .select(`barcode, products!inner(${select})`)
    .in('barcode', barcodeCandidates(q.data.barcode))
    .limit(1);
  if (error) return dbError(error);
  if (data?.length) {
    const product = firstProduct(data[0].products as Product | Product[]);
    return product ? json(product) : fail('Product for barcode not found', 404);
  }

  const { data: batch, error: batchError } = await locals.supabase
    .from('batches')
    .select(`id, products!inner(${select})`)
    .in('barcode', barcodeCandidates(q.data.barcode))
    .is('archived_at', null)
    .limit(1)
    .maybeSingle();
  if (batchError) return dbError(batchError);
  if (batch) {
    const product = firstProduct(batch.products as Product | Product[]);
    if (!product) return fail('Product for batch not found', 404);
    return json({
      ...product,
      scanned_batch_id: batch.id,
    });
  }

  // Generated QR labels encode "WN:<sku>".
  if (q.data.barcode.startsWith('WN:')) {
    const { data: bySku, error: sErr } = await locals.supabase
      .from('products')
      .select(select)
      .eq('sku', q.data.barcode.slice(3))
      .maybeSingle();
    if (sErr) return dbError(sErr);
    if (bySku) return json(activeBatches(bySku as Product));
  }
  return fail('Unknown barcode', 404);
};
