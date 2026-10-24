import { describe, expect, it } from 'vitest';
import { resolvePrice } from './pricing';

const product = { id: 'prod-1', price: 10 };
const rows = [
  { product_id: 'prod-1', pot_size_id: 'size-60', unit_price: 10, active: true, pot_size_name: '60mm Ellebag' },
  { product_id: 'prod-1', pot_size_id: 'size-80', unit_price: 15, active: true, pot_size_name: '80mm Ellebag' },
];
const breaks = [
  { product_id: 'prod-1', min_qty: 1, discount_pct: 0 },
  { product_id: 'prod-1', min_qty: 10, discount_pct: 10 },
  { product_id: 'prod-1', min_qty: 50, discount_pct: 20 },
];

describe('resolvePrice', () => {
  it('qty defaults to 1 and returns book price', () => {
    const r = resolvePrice({ product, priceRows: rows, breaks, batch: { pot_size_id: 'size-60', grade_id: null, price_override: null, grade_adjustment_pct: 0 }, qty: 1 });
    expect(r.unit_price).toBe(10);
    expect(r.line_total).toBe(10);
    expect(r.source).toBe('book');
    expect(r.discount_pct).toBe(0);
  });

  it('override beats book and ignores grade adjustment', () => {
    const r = resolvePrice({
      product,
      priceRows: rows,
      breaks,
      batch: { pot_size_id: 'size-60', grade_id: 'grade-premium', price_override: 5, grade_adjustment_pct: 30 },
      qty: 1,
    });
    expect(r.unit_price).toBe(5);
    expect(r.source).toBe('override');
    expect(r.grade_adjustment_pct).toBe(0);
    expect(r.base_price).toBe(5);
  });

  it('grade uplift applies to book price', () => {
    const r = resolvePrice({
      product,
      priceRows: rows,
      breaks,
      batch: { pot_size_id: 'size-60', grade_id: 'grade-premium', price_override: null, grade_adjustment_pct: 30 },
      qty: 1,
    });
    expect(r.unit_price).toBe(13);
    expect(r.source).toBe('book');
    expect(r.grade_adjustment_pct).toBe(30);
  });

  it('grade reduction applies to book price', () => {
    const r = resolvePrice({
      product,
      priceRows: rows,
      breaks,
      batch: { pot_size_id: 'size-60', grade_id: 'grade-economy', price_override: null, grade_adjustment_pct: -20 },
      qty: 1,
    });
    expect(r.unit_price).toBe(8);
  });

  it('break applies at threshold only', () => {
    const below = resolvePrice({ product, priceRows: rows, breaks, qty: 9 });
    expect(below.unit_price).toBe(10);
    expect(below.discount_pct).toBe(0);

    const at = resolvePrice({ product, priceRows: rows, breaks, qty: 10 });
    expect(at.unit_price).toBe(9);
    expect(at.discount_pct).toBe(10);
    expect(at.line_total).toBe(90);

    const top = resolvePrice({ product, priceRows: rows, breaks, qty: 50 });
    expect(top.unit_price).toBe(8);
    expect(top.discount_pct).toBe(20);
  });

  it('breaks pick the greatest min_qty <= qty', () => {
    const r = resolvePrice({ product, priceRows: rows, breaks, qty: 49 });
    expect(r.discount_pct).toBe(10);
    const r2 = resolvePrice({ product, priceRows: rows, breaks, qty: 50 });
    expect(r2.discount_pct).toBe(20);
  });

  it('null when no price', () => {
    const r = resolvePrice({ product: { id: 'prod-1' }, priceRows: [], breaks: [], qty: 1 });
    expect(r.unit_price).toBeNull();
    expect(r.line_total).toBeNull();
    expect(r.source).toBe('none');
  });

  it('legacy product price fallback', () => {
    const r = resolvePrice({ product, priceRows: [], breaks: [], qty: 3 });
    expect(r.unit_price).toBe(10);
    expect(r.line_total).toBe(30);
    expect(r.source).toBe('legacy');
  });

  it('rounds to 2 dp', () => {
    const r = resolvePrice({
      product: { id: 'prod-1', price: 10 },
      priceRows: [],
      breaks: [{ product_id: 'prod-1', min_qty: 3, discount_pct: 33 }],
      qty: 3,
    });
    expect(r.unit_price).toBeCloseTo(6.7, 1);
    expect(r.line_total).toBeCloseTo(20.1, 1);
  });

  it('uses effective pot size from batch then product', () => {
    const r = resolvePrice({
      product: { id: 'prod-1', price: 10, pot_size_id: 'size-80' },
      priceRows: rows,
      breaks: [],
      batch: { pot_size_id: 'size-60', grade_id: null, price_override: null, grade_adjustment_pct: 0 },
      qty: 1,
    });
    expect(r.unit_price).toBe(10);
    expect(r.pot_size_id).toBe('size-60');

    const r2 = resolvePrice({
      product: { id: 'prod-1', price: 10, pot_size_id: 'size-80' },
      priceRows: [{ product_id: 'prod-1', pot_size_id: 'size-80', unit_price: 15, active: true, pot_size_name: '80mm' }],
      breaks: [],
      batch: undefined,
      qty: 1,
    });
    expect(r2.unit_price).toBe(15);
    expect(r2.pot_size_id).toBe('size-80');
  });
});
