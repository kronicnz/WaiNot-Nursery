import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, requireOwner } from '../../../../lib/api';
import { productPatchSchema } from '../../../../lib/validation';

export const prerender = false;

const idSchema = z.string().uuid();

export const GET: APIRoute = async ({ locals, params }) => {
  if (!idSchema.safeParse(params.id).success) return fail('Invalid id');
  const { data, error } = await locals.supabase
    .from('products')
    .select('*, product_barcodes(barcode,type), batches(*), stock_levels(id,batch_id,qty)')
    .eq('id', params.id!)
    .maybeSingle();
  if (error) return dbError(error);
  return data ? json(data) : fail('Not found', 404);
};

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const id = ctx.params.id!;
  if (!idSchema.safeParse(id).success) return fail('Invalid id');
  const body = await parseBody(ctx.request, productPatchSchema);
  if ('error' in body) return body.error;

  const { barcodes, ...fields } = body.data;
  const sb = ctx.locals.supabase;
  if (Object.keys(fields).length) {
    const { error } = await sb.from('products').update(fields).eq('id', id);
    if (error) return dbError(error);
  }
  if (barcodes) {
    const { error: dErr } = await sb.from('product_barcodes').delete().eq('product_id', id);
    if (dErr) return dbError(dErr);
    if (barcodes.length) {
      const { error } = await sb.from('product_barcodes').insert(barcodes.map((b) => ({ ...b, product_id: id })));
      if (error) return error.code === '23505' ? fail('A barcode is already assigned to another product', 409) : dbError(error);
    }
  }
  const { data, error } = await sb.from('products').select('*, product_barcodes(barcode,type)').eq('id', id).maybeSingle();
  if (error) return dbError(error);
  return data ? json(data) : fail('Not found', 404);
};

// Soft delete so stock history stays intact.
export const DELETE: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const id = ctx.params.id!;
  if (!idSchema.safeParse(id).success) return fail('Invalid id');
  const { error } = await ctx.locals.supabase.from('products').update({ active: false }).eq('id', id);
  if (error) return dbError(error);
  return json({ ok: true });
};
