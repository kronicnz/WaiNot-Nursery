import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody } from '../../../../lib/api';
import { stocktakeLineSchema } from '../../../../lib/validation';

export const prerender = false;

export const PUT: APIRoute = async ({ request, locals, params }) => {
  if (!z.string().uuid().safeParse(params.id).success) return fail('Invalid id');
  const body = await parseBody(request, stocktakeLineSchema);
  if ('error' in body) return body.error;
  if (body.data.batch_id) {
    const { data: batch, error: batchError } = await locals.supabase
      .from('batches')
      .select('id')
      .eq('id', body.data.batch_id)
      .eq('product_id', body.data.product_id)
      .is('archived_at', null)
      .maybeSingle();
    if (batchError) return dbError(batchError);
    if (!batch) return fail('Batch is archived or does not belong to this product', 409);
  }
  const { data, error } = await locals.supabase
    .from('stocktake_lines')
    .upsert({ stocktake_id: params.id!, ...body.data, batch_id: body.data.batch_id ?? null }, { onConflict: 'stocktake_id,product_id,batch_id' })
    .select()
    .single();
  return error ? dbError(error) : json(data);
};
