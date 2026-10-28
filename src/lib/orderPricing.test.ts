import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { orderPrice } from './orderPricing';

function clientWithGrade(grade: { adjustment_pct: number } | null) {
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const data: Record<string, unknown> = {
      '/rest/v1/products': [{ id: 'product', active: true, price: null, pot_size_id: 'pot' }],
      '/rest/v1/product_prices': [{ product_id: 'product', pot_size_id: 'pot', unit_price: 10, active: true }],
      '/rest/v1/price_breaks': [{ product_id: 'product', min_qty: 5, discount_pct: 10 }],
      '/rest/v1/batches': [{ product_id: 'product', archived_at: null, pot_size_id: 'pot', grade_id: 'grade', price_override: null, quality_grades: grade }],
    };
    if (!(url.pathname in data)) throw new Error(`Unexpected request: ${url.pathname}`);
    return new Response(JSON.stringify(data[url.pathname]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  return createClient('http://localhost:54321', 'test-key', { global: { fetch: fetcher }, auth: { persistSession: false } });
}

describe('order price lookup', () => {
  it('applies batch grade and quantity break to a price-book row', async () => {
    const result = await orderPrice(clientWithGrade({ adjustment_pct: 25 }), 'product', 'batch', 5);
    expect(result.error).toBeUndefined();
    expect(result.data?.unit_price).toBe(11.25);
    expect(result.data?.line_total).toBe(56.25);
  });

  it('reports an unavailable referenced grade instead of silently pricing it as standard', async () => {
    const result = await orderPrice(clientWithGrade(null), 'product', 'batch', 5);
    expect(result.error?.status).toBe(500);
  });
});
