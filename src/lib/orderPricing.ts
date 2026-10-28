import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { dbError, fail } from './api';
import { resolvePrice } from './pricing';

export async function orderPrice(supabase: SupabaseClient, productId: string, batchId: string | null, quantity: number) {
  const { data: product, error: productError } = await supabase.from('products')
    .select('id, price, pot_size_id, active').eq('id', productId).maybeSingle();
  if (productError) return { error: dbError(productError) };
  if (!product?.active) return { error: fail('Product not found or inactive', 400) };
  const { data: prices, error: priceError } = await supabase.from('product_prices')
    .select('product_id, pot_size_id, unit_price, active').eq('product_id', productId).eq('active', true);
  if (priceError) return { error: dbError(priceError) };
  const { data: breaks, error: breakError } = await supabase.from('price_breaks')
    .select('product_id, min_qty, discount_pct').eq('product_id', productId);
  if (breakError) return { error: dbError(breakError) };

  let batchContext;
  if (batchId) {
    const { data: batch, error: batchError } = await supabase.from('batches')
      .select('product_id, archived_at, pot_size_id, grade_id, price_override, quality_grades(adjustment_pct)')
      .eq('id', batchId).maybeSingle();
    if (batchError) return { error: dbError(batchError) };
    if (!batch || batch.product_id !== productId || batch.archived_at !== null) {
      return { error: fail('Batch is archived or does not belong to product', 400) };
    }
    const grade = z.object({ adjustment_pct: z.union([z.number(), z.string()]) }).nullable().safeParse(
      Array.isArray(batch.quality_grades) ? batch.quality_grades[0] ?? null : batch.quality_grades,
    );
    if (!grade.success || (batch.grade_id && !grade.data)) return { error: fail('Invalid batch grade data', 500) };
    batchContext = {
      pot_size_id: batch.pot_size_id,
      grade_id: batch.grade_id,
      price_override: batch.price_override == null ? null : Number(batch.price_override),
      grade_adjustment_pct: grade.data ? Number(grade.data.adjustment_pct) : 0,
    };
  }
  const result = resolvePrice({
    product: { id: product.id, price: product.price == null ? null : Number(product.price), pot_size_id: product.pot_size_id },
    priceRows: (prices ?? []).map((row) => ({
      product_id: row.product_id, pot_size_id: row.pot_size_id, unit_price: Number(row.unit_price),
      active: row.active, pot_size_name: null,
    })),
    breaks: (breaks ?? []).map((row) => ({
      product_id: row.product_id, min_qty: row.min_qty, discount_pct: Number(row.discount_pct),
    })),
    batch: batchContext,
    qty: quantity,
  });
  return { data: result };
}
