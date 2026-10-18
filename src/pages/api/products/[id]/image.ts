import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, requireOwner } from '../../../../lib/api';

export const prerender = false;

const MAX_BYTES = 5 * 1024 * 1024;
const idSchema = z.string().uuid();

function sniff(b: Uint8Array): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

// Redirects to a short-lived signed URL so the bucket can stay private.
export const GET: APIRoute = async ({ locals, params }) => {
  if (!idSchema.safeParse(params.id).success) return fail('Invalid id');
  const { data: p } = await locals.supabase.from('products').select('image_path').eq('id', params.id!).maybeSingle();
  if (!p?.image_path) return fail('No image', 404);
  const { data, error } = await locals.supabase.storage.from('product-images').createSignedUrl(p.image_path, 120);
  if (error || !data) return fail('No image', 404);
  return new Response(null, { status: 302, headers: { Location: data.signedUrl, 'Cache-Control': 'private, max-age=60' } });
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const id = ctx.params.id!;
  if (!idSchema.safeParse(id).success) return fail('Invalid id');

  const form = await ctx.request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return fail('file is required');
  if (file.size === 0 || file.size > MAX_BYTES) return fail('Image must be under 5MB');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return fail('Only JPEG, PNG or WebP images are allowed');

  const sb = ctx.locals.supabase;
  const { data: product } = await sb.from('products').select('image_path').eq('id', id).maybeSingle();
  if (!product) return fail('Not found', 404);

  const path = `products/${id}/${crypto.randomUUID()}.${type.ext}`;
  const { error } = await sb.storage.from('product-images').upload(path, bytes, { contentType: type.mime });
  if (error) return dbError(error);
  const { error: uErr } = await sb.from('products').update({ image_path: path }).eq('id', id);
  if (uErr) return dbError(uErr);
  if (product.image_path) await sb.storage.from('product-images').remove([product.image_path]);
  return json({ image_path: path }, 201);
};

export const DELETE: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const id = ctx.params.id!;
  if (!idSchema.safeParse(id).success) return fail('Invalid id');
  const sb = ctx.locals.supabase;
  const { data: product } = await sb.from('products').select('image_path').eq('id', id).maybeSingle();
  if (product?.image_path) {
    await sb.storage.from('product-images').remove([product.image_path]);
    await sb.from('products').update({ image_path: null }).eq('id', id);
  }
  return json({ ok: true });
};
