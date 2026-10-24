# Nursery Price Book Upgrade Plan

## Goal

Replace the single `products.price` column with a price book that supports the axes a nursery actually prices on: **species × pot size × quality grade × quantity break**, with per-batch (lot) overrides for clearance. Keep one TypeScript module as the single source of price math (unit-tested), used by the public site, admin UI and sale capture. Add a live public price list page that replaces the published PDF.

## Decisions (resolved)

1. **Scope**: Price book only. No quote/order builder. Sales still recorded as `stock_movements` (reason='sale'), but now with a snapshotted price.
2. **Price-bearing attributes**: a product-level `product_prices` book keyed on (product, pot_size). Each production `batch` carries its own `pot_size_id`, `grade_id` and optional `price_override` (clearance). Price resolves from the book using the batch's size/grade, with override taking precedence.
3. **Quantity breaks**: percentage discounts per product (`price_breaks`: min_qty, discount_pct).
4. **Quality grade**: global grade multiplier (`quality_grades.adjustment_pct` applied to the base price). Three seeded grades: Standard (0%), Premium (+30%), Economy (-20%). Editable.
5. **Seasonality**: current price only, plus a `price_history` change log (no dated versions).
6. **Pot sizes**: reference table (`pot_sizes`). Mostly 60mm standard; sizes are editable.
7. **Public display**: plant card keeps a single price (default size, standard grade) with the size label; new `/price-list` page lists every species × size × price plus tiers.
8. **Sale capture**: snapshot `unit_price` + `line_total` onto `stock_movements` for `reason='sale'`.
9. **GST**: prices remain GST-inclusive (as today). Keep the "incl. GST per plant" label.
10. **Freight/delivery pricing**: out of scope (still "Request a quote" for project supply).

## Context (codebase)

- Stack: Astro 7 + React 19 admin app, Supabase Postgres (migrations under `supabase/migrations/`), Zod validation, Vitest.
- Current price: `products.price numeric(10,2)` (stock_schema.sql:58); `products.pot_size text` (stock_schema.sql:57).
- Admin: `ProductsView.tsx` (ProductForm), `ManageView.tsx` (Setup tab), `ScanView.tsx` (sales record qty).
- Public: `src/lib/publicCatalog.ts`, `src/pages/index.astro` (card price line at index.astro:118), `src/layouts/Layout.astro` (nav).
- CSV: `src/pages/api/import/products.ts`, `src/pages/api/export/products.csv.ts`.
- Tests: `src/lib/lib.test.ts` (vitest). Price math must live in TS to be testable (no PG in CI).

## Schema (new migration `supabase/migrations/20261022000000_pricing_price_book.sql`)

### Reference tables

```sql
create table public.pot_sizes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  diameter_mm integer check (diameter_mm is null or diameter_mm > 0),
  volume_l numeric(6,2) check (volume_l is null or volume_l >= 0),
  sort_order integer not null default 0,
  active boolean not null default true
);
create table public.quality_grades (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  adjustment_pct numeric(5,2) not null default 0
    check (adjustment_pct between -100 and 500),
  sort_order integer not null default 0,
  active boolean not null default true
);
```

### Price book

```sql
create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  pot_size_id uuid not null references public.pot_sizes(id) on delete restrict,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, pot_size_id)
);
create table public.price_breaks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_qty integer not null check (min_qty > 0),
  discount_pct numeric(5,2) not null check (discount_pct >= 0 and discount_pct < 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, min_qty)
);
```

### Batch attributes + product default size

```sql
alter table public.products
  add column pot_size_id uuid references public.pot_sizes(id) on delete restrict;
alter table public.batches
  add column pot_size_id uuid references public.pot_sizes(id) on delete restrict,
  add column grade_id uuid references public.quality_grades(id) on delete restrict,
  add column price_override numeric(10,2)
    check (price_override is null or price_override >= 0);
```

### Sale price snapshot

```sql
alter table public.stock_movements
  add column unit_price numeric(10,2),
  add column line_total numeric(12,2);
```

### Price change history

```sql
create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('price','break','grade')),
  product_id uuid references public.products(id) on delete cascade,
  pot_size_id uuid references public.pot_sizes(id) on delete set null,
  grade_id uuid references public.quality_grades(id) on delete set null,
  min_qty integer,
  old_value text,
  new_value text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
```

Triggers: `AFTER INSERT/UPDATE/DELETE` on `product_prices` and `price_breaks`; `AFTER UPDATE OF adjustment_pct` on `quality_grades`. Functions are SECURITY DEFINER. RLS: staff read; no direct writes.

### Backfill

- `pot_sizes` seed: 40mm Ellebag, 60mm Ellebag, 80mm Ellebag, Rootrainer Tube (active, sort_order).
- `quality_grades` seed: Standard (0%), Premium (+30%), Economy (-20%).
- For every product with a non-null legacy `price`: insert a `product_prices` row for the default pot size ('60mm Ellebag') with that price.
- `products.pot_size_id` → '60mm Ellebag' for all products.
- Existing `batches`: `pot_size_id` inherits the product's, `grade_id` → 'standard', `price_override` null.

### RLS

Follow the existing pattern in stock_schema.sql:237 (active staff read, owners write). Add `pot_sizes`, `quality_grades`, `product_prices`, `price_breaks`, `price_history` to the read/write policy loop. `price_history` is read-only for staff (no insert policy; trigger is security definer).

### Public views (recreate)

- `public.public_catalog_plants`: keep existing columns; add `price` (effective unit price for the product's default size at standard grade, GST-inclusive) and `price_label` (the size name). Computed in SQL from `product_prices` + `pot_sizes` + `quality_grades` (standard grade). `low_availability` unchanged.
- New `public.public_catalog_price_list`: one row per (species, pot_size, tier) with `sku, name, category, category_sort_order, sort_order, pot_size (name), min_qty, discount_pct, unit_price` (effective price at that tier for standard grade).
- Grants: `select` to `anon, authenticated` on both.

### RPC update

`apply_stock_movement` — add `p_unit_price numeric default null` and `p_line_total numeric default null` parameters, persisted to the row. Drop the old 7-arg signature and recreate (to avoid overload ambiguity), then re-grant. `transfer_stock`, `set_batch_stock_count`, `finalize_stocktake` keep calling with the existing arg count (defaults apply).

## Price math module: `src/lib/pricing.ts` (NEW)

Single pure module, unit-tested. Used by the public site, admin UI, CSV export, and sale capture.

```ts
export interface PriceRow { product_id; pot_size_id; unit_price; active; pot_size_name; }
export interface BreakRow { product_id; min_qty; discount_pct; }
export interface BatchContext { pot_size_id; grade_id; price_override; grade_adjustment_pct; }
export interface PriceResolution {
  unit_price: number | null;   // final per-unit price (GST-inclusive)
  line_total: number | null;    // unit_price * qty
  base_price: number | null;    // before grade and tier
  grade_adjustment_pct: number;
  discount_pct: number;         // applied break's discount
  source: 'override' | 'book' | 'legacy' | 'none';
  pot_size_id: string | null;
  grade_id: string | null;
}
export function resolvePrice(input: {
  product: { price?: number | null; pot_size_id?: string | null };
  priceRows: PriceRow[];
  breaks: BreakRow[];
  batch?: BatchContext;
  qty: number;
}): PriceResolution;
```

Resolution order:
1. Effective pot size = `batch.pot_size_id ?? product.pot_size_id`. Effective grade adjustment = `batch.grade_adjustment_pct ?? 0`.
2. Base: if `batch.price_override` is set → base = override, source='override', grade adjustment ignored. Else look up the active price row for (product, effective pot size) → base, source='book'. Else fall back to `product.price` (legacy), source='legacy'.
3. If source != 'override': base = base * (1 + grade_adjustment_pct/100).
4. Break: pick the active break with the greatest `min_qty <= qty`; effective = base * (1 - discount_pct/100). If none, discount_pct = 0.
5. Round to 2 dp. `line_total = unit_price * qty` (rounded).

Unit tests in `src/lib/pricing.test.ts`: override beats book; grade uplift applies; break applies at threshold only; null when no price; rounding; qty=1 default.

## API surface (new)

Under `src/pages/api/pricing/`:
- `pot-sizes/index.ts` — GET (staff), POST (owner, zod: code/name/diameter_mm/volume_l/sort_order).
- `pot-sizes/[id].ts` — PATCH, DELETE (deactivate) (owner).
- `grades/index.ts` — GET (staff), POST (owner).
- `grades/[id].ts` — PATCH, DELETE (owner).
- `price-rows/index.ts` — GET `?product_id=` (staff), PUT upsert (owner, zod: product_id, pot_size_id, unit_price).
- `price-rows/[id].ts` — DELETE (owner).
- `breaks/index.ts` — GET `?product_id=`, POST (owner).
- `breaks/[id].ts` — PATCH, DELETE (owner).
- `quote.ts` — GET `?product_id=&batch_id=&qty=` → `PriceResolution` (staff). Convenience endpoint wrapping `resolvePrice` server-side.

Reuse `Simple`-style inline editors where the field count is small; otherwise explicit components.

## Validation (`src/lib/validation.ts`)

- Replace `pot_size: optText(40)` with `pot_size_id: uuid.nullable().optional()` in `productSchema`/`productPatchSchema`.
- Remove `price` from `productSchema` (legacy).
- Add: `potSizeSchema`, `gradeSchema`, `priceRowSchema`, `priceBreakSchema`.
- `lib.test.ts`: update the "rejects negative price" test to target `priceRowSchema` (negative `unit_price` rejected).

## Admin UI

- `src/components/admin/pricing/` (new dir):
  - `ProductPricingPanel.tsx` — used in the Product form: price rows (size + price, add/remove) + breaks (min_qty + %, add/remove). Calls `/api/pricing/price-rows` and `/api/pricing/breaks`.
  - `PriceBookTable.tsx` — Setup tab full matrix: all products × sizes with inline price, filterable, expandable breaks.
  - `PotSizesEditor.tsx`, `GradesEditor.tsx` — reference list CRUD.
- `ManageView.tsx`: add a `Pricing` section (PotSizesEditor, GradesEditor, PriceBookTable, and a recent `price_history` log) under the Setup tab.
- `ProductsView.tsx` ProductForm: add a "Pricing" section using `ProductPricingPanel`. In the Batches section, add pot size / grade / price override fields per batch; pass through the batch API (`src/pages/api/batches/index.ts` PATCH needed — currently only POST/GET; add PATCH for batch fields including pot_size_id, grade_id, price_override).
- `ScanView.tsx`: when reason='sale', fetch the resolved price via `/api/pricing/quote` and display "unit price · line total" under the qty control; include `unit_price`/`line_total` in the movement payload (the movements API also recomputes server-side as the source of truth).
- `src/pages/api/stock/movements.ts`: for `reason='sale'`, call `resolvePrice` server-side and pass `p_unit_price`/`p_line_total` to the RPC. (Client value is a hint; server recomputes.)

## Public site

- `src/lib/publicCatalog.ts`: extend `PublicPlant` with `price` (default size, standard grade), `price_label` (size name), `min_price`, `from_price`. Add `getPublicPriceList()` querying `public_catalog_price_list`.
- `src/pages/index.astro`: card price line (index.astro:118) → `{plant.price !== null && <p class="plant-price">{plant.from_price ? 'From ' : ''}{priceFormat.format(plant.price)} <span>incl. GST per plant{plant.price_label ? ` · ${plant.price_label}` : ''}</span></p>}`.
- New `src/pages/price-list.astro` — grouped by category, each species shows size + price + volume tiers. Link from `Layout.astro` nav ("Price list") and home page.

## CSV import/export

- `src/pages/api/export/products.csv.ts`: keep `price` column (now derived from the price book: default size, standard grade, qty 1); keep `pot_size` column (default size name). Add a separate `/api/export/price-list.csv.ts` exporting the full `public_catalog_price_list` rows.
- `src/pages/api/import/products.ts`: `pot_size` column accepts a pot size name/code and resolves to `pot_size_id`; `price` column writes/updates the default-size price row for the product (creating it if needed). Keep dry-run summary.

## Migration rollout (two-phase)

1. Apply `20261022000000_pricing_price_book.sql` (expand: new tables, new columns, backfill, views, RLS, history triggers). Legacy `products.price` / `products.pot_size` left in place.
2. Deploy the app (code no longer reads `products.price`/`products.pot_size`).
3. Apply `supabase/migrations/20261022001000_pricing_drop_legacy_price.sql` (contract: drop the now-unused columns). Only after step 2.

## Validation

- `npm run build` (astro check + build) — typecheck.
- `npm test` (vitest) — pricing module + validation schemas.
- Manual SQL verification against local Supabase (`npx supabase start`): backfill counts match (31 price rows), `resolvePrice` parity between TS and a SQL spot-check, RLS (anon sees only public views).
- Manual UI smoke: edit a price, change a grade multiplier, set a quantity break, record a sale in ScanView and confirm `unit_price`/`line_total` on the movement; public `/price-list` renders.

## Risks / open items

- `apply_stock_movement` signature change requires dropping + recreating the function; `transfer_stock`, `set_batch_stock_count`, `finalize_stocktake` call sites must be re-checked for arg-count compatibility (defaults cover them).
- Bulk sales recorded as many single-plant scans do NOT capture the volume discount (each movement is qty=1). Staff must record bulk sales as one movement with the full qty. Note in ScanView UI.
- `public_catalog_plants` is a `security_barrier` view; recomputing prices inside it requires the price book to be readable by anon — only the views are granted, not the base tables. The view is `security definer`-equivalent via `security_barrier` + table grants; ensure the view owner (postgres) can read the base tables. Test in staging.
- Pot size seed values (40/60/80mm, Rootrainer) are starting values; the owner should confirm against actual Ellebag diameters used.
- Grade multipliers (+30%/-20%) are starting values; the owner should confirm.

## Out of scope (explicitly)

- Quote/order builder, customer accounts, freight/delivery pricing, invoicing, multi-currency, tax rates other than GST.
- Per-product freight, per-customer negotiated pricing.
- Automated price list PDF generation (the live `/price-list` page replaces it).
- Historical price reconstruction before migration (legacy prices are snapshotted into `product_prices` as of migration date).
- `products.price` kept as a deprecated column until phase 2 of rollout.
