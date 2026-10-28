import { z } from 'zod';

const uuid = z.uuid();
const email = z.string().trim().max(254).pipe(z.email());
const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

export const loginSchema = z.object({ email, password: z.string().min(1).max(200) });

export const productSchema = z.object({
  sku: text(64),
  name: text(200),
  botanical_name: optText(200),
  category_id: uuid,
  pot_size_id: uuid.nullable().optional(),
  reorder_level: z.number().int().min(0).max(1_000_000).default(20),
  public_description: z.string().trim().max(3000).optional(),
  public_image_url: z.string().trim().max(2000).pipe(z.url()).nullable().optional(),
  public_image_alt: z.string().trim().max(300).optional(),
  notes: optText(2000),
  active: z.boolean().default(true),
  barcodes: z
    .array(z.object({ barcode: text(128), type: z.enum(['EAN', 'CODE128', 'QR', 'OTHER']).default('EAN') }))
    .max(20)
    .optional(),
});
export const productPatchSchema = productSchema.partial();

export const categorySchema = z.object({ name: text(80) });
export const movementSchema = z.object({
  product_id: uuid,
  batch_id: uuid.nullable().optional(),
  location_id: uuid.nullable().optional(),
  delta: z.number().int().min(-100000).max(100000).refine((n) => n !== 0, 'delta must be non-zero'),
  reason: z.enum(['receive', 'sale', 'adjust', 'loss']),
  note: z.string().trim().max(500).optional().nullable(),
  client_op_id: z.string().min(8).max(80),
  unit_price: z.number().min(0).max(100000).optional().nullable(),
  line_total: z.number().min(0).max(100000000).optional().nullable(),
});
export const movementBatchSchema = z.object({ movements: z.array(movementSchema).min(1).max(200) });

export const stockCountSchema = z.object({
  product_id: uuid,
  batch_id: uuid.nullable().optional(),
  counted_qty: z.number().int().min(0).max(1_000_000),
  note: z.string().trim().max(500).optional().nullable(),
  client_op_id: z.string().min(8).max(60),
});

export const batchSchema = z.object({
  product_id: uuid,
  batch_code: text(64),
  potted_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  pot_size_id: uuid.nullable().optional(),
  grade_id: uuid.nullable().optional(),
  price_override: z.number().min(0).max(100000).nullable().optional(),
  notes: optText(500),
});

export const potSizeSchema = z.object({
  code: text(40),
  name: text(80),
  diameter_mm: z.number().int().min(1).optional().nullable(),
  volume_l: z.number().min(0).max(9999.99).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});
export const potSizePatchSchema = potSizeSchema.partial();

export const gradeSchema = z.object({
  code: text(40),
  name: text(80),
  adjustment_pct: z.number().min(-100).max(500).default(0),
  sort_order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});
export const gradePatchSchema = gradeSchema.partial();

export const priceRowSchema = z.object({
  product_id: uuid,
  pot_size_id: uuid,
  unit_price: z.number().min(0).max(100000),
  active: z.boolean().default(true),
});
export const priceRowPatchSchema = priceRowSchema.partial().omit({ product_id: true, pot_size_id: true });

export const priceBreakSchema = z.object({
  product_id: uuid,
  min_qty: z.number().int().min(1).max(100000),
  discount_pct: z.number().min(0).max(99.99),
});
export const priceBreakPatchSchema = priceBreakSchema.partial().omit({ product_id: true, min_qty: true });

export const stocktakeSchema = z.object({});
export const stocktakeLineSchema = z.object({
  product_id: uuid,
  batch_id: uuid.nullable().optional(),
  counted_qty: z.number().int().min(0).max(1_000_000),
});

export const locationSchema = z.object({
  name: text(80),
  kind: z.enum(['bench', 'tunnel', 'shadehouse', 'shop', 'other']).default('bench'),
  active: z.boolean().default(true),
});
export const locationPatchSchema = locationSchema.partial();

export const transferSchema = z.object({
  product_id: uuid,
  batch_id: uuid.nullable().optional(),
  from_location_id: uuid.nullable(),
  to_location_id: uuid.nullable(),
  qty: z.number().int().min(1).max(1_000_000),
  note: z.string().trim().max(500).optional().nullable(),
  client_op_id: z.string().min(8).max(80),
}).refine((d) => d.from_location_id !== d.to_location_id, { message: 'Locations must differ', path: ['to_location_id'] });

export const userInviteSchema = z.object({
  email,
  name: text(100),
  role: z.enum(['owner', 'staff']).default('staff'),
});
export const userPatchSchema = z.object({ role: z.enum(['owner', 'staff']).optional(), active: z.boolean().optional() });

export const barcodeQuerySchema = z.string().trim().min(1).max(128);
