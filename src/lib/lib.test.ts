import { describe, expect, it } from 'vitest';
import { barcodeCandidates } from './barcode';
import { parseCsv, toCsv } from './csv';
import { movementSchema, priceRowSchema, productSchema, stockCountSchema, transferSchema } from './validation';

describe('csv', () => {
  it('round-trips quotes, commas and newlines', () => {
    const rows = [['a', 'b,c', 'd"e', 'line\nbreak']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it('neutralises formula injection', () => {
    expect(toCsv([['=cmd()', 5, '-3']])).toBe("'=cmd(),5,'-3");
  });
  it('handles BOM and CRLF', () => {
    expect(parseCsv('\uFEFFsku,name\r\nA1,Fern\r\n')).toEqual([['sku', 'name'], ['A1', 'Fern']]);
  });
});

describe('barcodeCandidates', () => {
  it('maps UPC-A and EAN-13 with a leading zero', () => {
    expect(barcodeCandidates('036000291452')).toContain('0036000291452');
    expect(barcodeCandidates('0036000291452')).toContain('036000291452');
    expect(barcodeCandidates('abc')).toEqual(['abc']);
  });
});

describe('validation', () => {
  const base = { product_id: crypto.randomUUID(), client_op_id: 'op-12345678' };
  it('rejects zero or fractional deltas and bad reasons', () => {
    expect(movementSchema.safeParse({ ...base, delta: 0, reason: 'sale' }).success).toBe(false);
    expect(movementSchema.safeParse({ ...base, delta: 1.5, reason: 'sale' }).success).toBe(false);
    expect(movementSchema.safeParse({ ...base, delta: -1, reason: 'transfer' }).success).toBe(false);
    expect(movementSchema.safeParse({ ...base, delta: -1, reason: 'sale' }).success).toBe(true);
  });
  it('rejects negative price', () => {
    expect(priceRowSchema.safeParse({ product_id: crypto.randomUUID(), pot_size_id: crypto.randomUUID(), unit_price: -1 }).success).toBe(false);
    expect(priceRowSchema.safeParse({ product_id: crypto.randomUUID(), pot_size_id: crypto.randomUUID(), unit_price: 0 }).success).toBe(true);
  });
  it('requires a category for a product', () => {
    expect(productSchema.safeParse({ sku: 'A', name: 'B' }).success).toBe(false);
    expect(productSchema.safeParse({ sku: 'A', name: 'B', category_id: crypto.randomUUID() }).success).toBe(true);
  });
  it('accepts zero stock counts and rejects invalid counts', () => {
    const count = { ...base, counted_qty: 0 };
    expect(stockCountSchema.safeParse(count).success).toBe(true);
    expect(stockCountSchema.safeParse({ ...count, counted_qty: -1 }).success).toBe(false);
    expect(stockCountSchema.safeParse({ ...count, counted_qty: 1.5 }).success).toBe(false);
  });
  it('accepts unassigned locations but rejects transfers to the same location', () => {
    const location = crypto.randomUUID();
    const transfer = { ...base, from_location_id: null, to_location_id: location, qty: 1 };
    expect(transferSchema.safeParse(transfer).success).toBe(true);
    expect(transferSchema.safeParse({ ...transfer, from_location_id: location }).success).toBe(false);
    expect(transferSchema.safeParse({ ...transfer, to_location_id: null }).success).toBe(false);
    expect(movementSchema.safeParse({ ...base, delta: -1, reason: 'sale', location_id: location }).success).toBe(true);
    expect(movementSchema.safeParse({ ...base, delta: -1, reason: 'sale', location_id: 'bad' }).success).toBe(false);
  });
});
