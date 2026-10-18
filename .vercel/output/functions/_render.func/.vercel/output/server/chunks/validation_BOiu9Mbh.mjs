import { z } from "zod";
//#region src/lib/validation.ts
var uuid = z.string().uuid();
var text = (max) => z.string().trim().min(1).max(max);
var optText = (max) => z.string().trim().max(max).optional().nullable().transform((v) => v ? v : null);
var loginSchema = z.object({
	email: z.string().trim().email().max(254),
	password: z.string().min(1).max(200)
});
var productSchema = z.object({
	sku: text(64),
	name: text(200),
	botanical_name: optText(200),
	category_id: uuid,
	pot_size: optText(40),
	price: z.number().min(0).max(1e5).nullable().optional(),
	reorder_level: z.number().int().min(0).max(1e6).default(20),
	public_description: z.string().trim().max(3e3).optional(),
	public_image_url: z.string().trim().url().max(2e3).nullable().optional(),
	public_image_alt: z.string().trim().max(300).optional(),
	notes: optText(2e3),
	active: z.boolean().default(true),
	barcodes: z.array(z.object({
		barcode: text(128),
		type: z.enum([
			"EAN",
			"CODE128",
			"QR",
			"OTHER"
		]).default("EAN")
	})).max(20).optional()
});
var productPatchSchema = productSchema.partial();
var categorySchema = z.object({ name: text(80) });
var movementSchema = z.object({
	product_id: uuid,
	batch_id: uuid.nullable().optional(),
	delta: z.number().int().min(-1e5).max(1e5).refine((n) => n !== 0, "delta must be non-zero"),
	reason: z.enum([
		"receive",
		"sale",
		"adjust",
		"loss"
	]),
	note: z.string().trim().max(500).optional().nullable(),
	client_op_id: z.string().min(8).max(80)
});
var movementBatchSchema = z.object({ movements: z.array(movementSchema).min(1).max(200) });
var stockCountSchema = z.object({
	product_id: uuid,
	batch_id: uuid.nullable().optional(),
	counted_qty: z.number().int().min(0).max(1e6),
	note: z.string().trim().max(500).optional().nullable(),
	client_op_id: z.string().min(8).max(60)
});
var batchSchema = z.object({
	product_id: uuid,
	batch_code: text(64),
	potted_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
	notes: optText(500)
});
var stocktakeSchema = z.object({});
var stocktakeLineSchema = z.object({
	product_id: uuid,
	batch_id: uuid.nullable().optional(),
	counted_qty: z.number().int().min(0).max(1e6)
});
var userInviteSchema = z.object({
	email: z.string().trim().email().max(254),
	name: text(100),
	role: z.enum(["owner", "staff"]).default("staff")
});
var userPatchSchema = z.object({
	role: z.enum(["owner", "staff"]).optional(),
	active: z.boolean().optional()
});
z.string().trim().min(1).max(128);
//#endregion
export { movementSchema as a, stockCountSchema as c, userInviteSchema as d, userPatchSchema as f, movementBatchSchema as i, stocktakeLineSchema as l, categorySchema as n, productPatchSchema as o, loginSchema as r, productSchema as s, batchSchema as t, stocktakeSchema as u };
