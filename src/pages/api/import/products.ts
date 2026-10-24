import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbError, fail, json, parseBody, requireOwner } from '../../../lib/api';
import { parseCsv } from '../../../lib/csv';
import { productSchema } from '../../../lib/validation';

export const prerender = false;

const bodySchema = z.object({ csv: z.string().max(2_000_000), commit: z.boolean().default(false) });

// Owner-only. With commit=false this is a dry run returning what would change.
export const POST: APIRoute = async (ctx) => {
  const denied = requireOwner(ctx);
  if (denied) return denied;
  const body = await parseBody(ctx.request, bodySchema);
  if ('error' in body) return body.error;

  const rows = parseCsv(body.data.csv);
  if (rows.length < 2) return fail('CSV has no data rows');
  if (rows.length > 2001) return fail('Maximum 2000 rows per import');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  for (const required of ['sku', 'name', 'category']) if (!header.includes(required)) return fail(`Missing column: ${required}`);
  const col = (r: string[], n: string) => (r[header.indexOf(n)] ?? '').trim();

  const sb = ctx.locals.supabase;
  const { data: existing, error: exErr } = await sb.from('products').select('id, sku, pot_size_id').limit(20000);
  if (exErr) return dbError(exErr);
  const bySku = new Map((existing ?? []).map((p) => [p.sku, { id: p.id as string, pot_size_id: p.pot_size_id }]));
  const { data: cats, error: cErr } = await sb.from('categories').select('id, name');
  if (cErr) return dbError(cErr);
  const catByName = new Map((cats ?? []).map((c) => [c.name.toLowerCase(), c.id as string]));

  // Resolve pot size name/code → id.
  const { data: sizes, error: sErr } = await sb.from('pot_sizes').select('id, code, name').eq('active', true);
  if (sErr) return dbError(sErr);
  const sizeByCode = new Map((sizes ?? []).map((s: { id: string; code: string; name: string }) => [s.code.toLowerCase(), s.id]));
  const sizeByName = new Map((sizes ?? []).map((s: { id: string; code: string; name: string }) => [s.name.toLowerCase(), s.id]));
  const resolveSize = (v: string) => {
    if (!v) return null;
    return sizeByCode.get(v.toLowerCase()) ?? sizeByName.get(v.toLowerCase()) ?? null;
  };

  const errors: { row: number; message: string }[] = [];
  const valid: { fields: z.infer<typeof productSchema>; category: string; barcodes: string[]; pot_size_id: string | null; price: number | null }[] = [];
  const seen = new Set<string>();

  rows.slice(1).forEach((r, i) => {
    const price = col(r, 'price');
    const reorder = col(r, 'reorder_level');
    const category = col(r, 'category');
    const potSize = col(r, 'pot_size');
    const potSizeId = resolveSize(potSize);
    if (potSize !== '' && !potSizeId) return void errors.push({ row: i + 2, message: `pot_size: unknown size "${potSize}"` });
    if (!category) return void errors.push({ row: i + 2, message: 'category: required' });
    const parsed = productSchema.safeParse({
      sku: col(r, 'sku'),
      name: col(r, 'name'),
      category_id: catByName.get(category.toLowerCase()) ?? '00000000-0000-0000-0000-000000000000',
      pot_size_id: potSizeId ?? undefined,
      botanical_name: col(r, 'botanical_name'),
      reorder_level: reorder === '' ? 20 : Number(reorder),
      ...(header.includes('public_description') ? { public_description: col(r, 'public_description') } : {}),
      ...(header.includes('public_image_url') ? { public_image_url: col(r, 'public_image_url') || null } : {}),
      ...(header.includes('public_image_alt') ? { public_image_alt: col(r, 'public_image_alt') } : {}),
    });
    if (!parsed.success) return void errors.push({ row: i + 2, message: parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ') });
    if (seen.has(parsed.data.sku)) return void errors.push({ row: i + 2, message: 'Duplicate sku in file' });
    seen.add(parsed.data.sku);
    valid.push({
      fields: parsed.data,
      category,
      barcodes: col(r, 'barcode').split(';').map((b) => b.trim()).filter(Boolean),
      pot_size_id: potSizeId,
      price: price === '' ? null : Number(price),
    });
  });

  const toCreate = valid.filter((v) => !bySku.has(v.fields.sku)).length;
  const summary = { create: toCreate, update: valid.length - toCreate, errors };
  if (!body.data.commit) return json({ dryRun: true, ...summary });
  if (errors.length) return fail('Fix errors before committing', 400, summary);

  for (const v of valid) {
    let category_id: string | null = null;
    if (v.category) {
      const key = v.category.toLowerCase();
      if (!catByName.has(key)) {
        const { data, error } = await sb.from('categories').insert({ name: v.category }).select('id').single();
        if (error) return dbError(error);
        catByName.set(key, data.id);
      }
      category_id = catByName.get(key)!;
    }
    const { barcodes: _b, ...fields } = v.fields;
    const row = { ...fields, category_id };
    // Use the resolved pot_size_id as the product's default size.
    if (v.pot_size_id != null) row.pot_size_id = v.pot_size_id;
    const id = bySku.get(v.fields.sku);
    let productId = id ? id.id : null;
    if (id) {
      const { error } = await sb.from('products').update(row).eq('id', id.id);
      if (error) return dbError(error);
    } else {
      const { data, error } = await sb.from('products').insert(row).select('id').single();
      if (error) return dbError(error);
      productId = data.id;
    }
    // Write the default-size price row from the legacy price column.
    if (productId && v.price != null && Number.isFinite(v.price) && v.pot_size_id) {
      await sb.from('product_prices')
        .upsert({ product_id: productId, pot_size_id: v.pot_size_id, unit_price: v.price, active: true }, { onConflict: 'product_id,pot_size_id' });
    }
    if (v.barcodes.length) {
      const { error } = await sb
        .from('product_barcodes')
        .upsert(v.barcodes.map((barcode) => ({ barcode, product_id: productId! })), { onConflict: 'barcode' });
      if (error) return dbError(error);
    }
  }
  return json({ dryRun: false, ...summary });
};
