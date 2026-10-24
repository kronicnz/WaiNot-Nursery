export interface PriceRow {
  product_id: string;
  pot_size_id: string;
  unit_price: number;
  active: boolean;
  pot_size_name: string | null;
}

export interface BreakRow {
  product_id: string;
  min_qty: number;
  discount_pct: number;
}

export interface BatchContext {
  pot_size_id: string | null;
  grade_id: string | null;
  price_override: number | null;
  grade_adjustment_pct: number;
}

export interface PriceResolution {
  unit_price: number | null;
  line_total: number | null;
  base_price: number | null;
  grade_adjustment_pct: number;
  discount_pct: number;
  source: 'override' | 'book' | 'legacy' | 'none';
  pot_size_id: string | null;
  grade_id: string | null;
}

const round2 = (value: number | null): number | null => (value === null ? null : Math.round(value * 100) / 100);

export function resolvePrice(input: {
  product: { id: string; price?: number | null; pot_size_id?: string | null };
  priceRows: PriceRow[];
  breaks: BreakRow[];
  batch?: BatchContext;
  qty: number;
}): PriceResolution {
  const { product, priceRows, breaks, batch, qty } = input;
  const quantity = Math.max(1, Math.trunc(Number(qty) || 1));

  const effectivePotSizeId = batch?.pot_size_id ?? product.pot_size_id ?? null;
  const gradeAdjustmentPct = batch?.grade_adjustment_pct ?? 0;

  let basePrice: number | null = null;
  let source: PriceResolution['source'] = 'none';

  if (batch?.price_override != null && batch.price_override >= 0) {
    basePrice = batch.price_override;
    source = 'override';
  } else {
    const row = priceRows.find((r) => r.active && r.pot_size_id === effectivePotSizeId);
    if (row) {
      basePrice = row.unit_price;
      source = 'book';
    } else if (product.price != null && product.price >= 0) {
      basePrice = product.price;
      source = 'legacy';
    }
  }

  let gradeApplied = gradeAdjustmentPct;
  if (basePrice === null) {
    gradeApplied = 0;
  } else if (source === 'override') {
    gradeApplied = 0;
  }

  const adjusted = basePrice === null ? null : basePrice * (1 + gradeApplied / 100);

  let discountPct = 0;
  let effective = adjusted;
  if (adjusted != null) {
    const applicable = breaks
      .filter((b) => b.product_id === product.id && b.min_qty <= quantity)
      .sort((a, b) => b.min_qty - a.min_qty)[0];
    if (applicable) {
      discountPct = applicable.discount_pct;
      effective = adjusted * (1 - discountPct / 100);
    }
  }

  const unitPrice = round2(effective);
  const lineTotal = unitPrice === null ? null : round2(unitPrice * quantity);

  return {
    unit_price: unitPrice,
    line_total: lineTotal,
    base_price: basePrice === null ? null : round2(basePrice),
    grade_adjustment_pct: gradeApplied,
    discount_pct: discountPct,
    source: basePrice === null ? 'none' : source,
    pot_size_id: effectivePotSizeId,
    grade_id: batch?.grade_id ?? null,
  };
}
