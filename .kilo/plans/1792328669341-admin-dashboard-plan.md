# WaiNot Nursery — More Intuitive Admin Dashboard

**Goal:** Make the `/admin` stock workspace easier to use day-to-day: visible sync/offline status, stock transfers between nursery locations, a filterable activity feed with export, a low-stock reorder worksheet, locations setup, and batch archive/unarchive from the dashboard.

## Context (verified against codebase)

- **App:** Astro public site + mobile-first nursery stock app at `/admin`; Supabase Postgres/Auth/Storage; deployed on Vercel (`@astrojs/vercel` adapter).
- **Roles:** `owner` (setup, products, users, stocktakes finalize) and `staff` (read + record movements). Enforced by Supabase RLS + `is_active_user()`/`is_owner()` helpers.
- **Data model:** `categories`, `products`, `batches`, `stock_levels`, `stock_movements`, `stocktakes`, `stocktake_lines`, and a `locations` table (bench/tunnel/shadehouse/shop/kinds) that exists in `supabase/migrations/20260101000000_stock_schema.sql` but has **no admin UI or API route**.
- **Current dashboard** (`src/components/admin/DashboardView.tsx`): greeting, quick actions, onboarding checklist, 4 metrics, batch inventory list (filter/search), stock alerts, plant range, 5 most recent movements. Admin shell: `src/components/admin/AdminApp.tsx` with tabs Overview/Setup/Products/Scan/Stocktake.
- **Existing RPCs usable as-is:** `apply_stock_movement`, `transfer_stock` (product/batch + from/to location), `finalize_stocktake`. Movements are append-only and idempotent via `client_op_id`; offline scans are queued in IndexedDB (`src/lib/client/offline.ts`) and synced on `online` event.
- **API surface:** `src/pages/api` — no `/api/locations` route exists yet; `/api/movements` only handles POST (no filtered/paginated GET); `/api/stock/movements` POST only.
- **Validation:** `npm run build` = `astro check && astro build`; `npm test` = `vitest run`. Lint/typecheck: `astro check` (part of build). Dev: `astro dev --background` (per AGENTS.md).

## Decisions (all confirmed)

1. **Scope:** Combined phased plan, each phase shippable independently:
   - Phase A — Daily stock operations: shell sync/online banner + dashboard transfer card.
   - Phase B — Owner oversight: new Activity tab (filterable/paginated movements + CSV export) + low-stock reorder worksheet.
   - Phase C — Setup completion: Locations UI in ManageView + batch archive/unarchive from dashboard rows.
2. **Sync banner:** Lives in `AdminApp.tsx` shell so it is visible on every tab; shows online/offline state and pending IndexedDB queue count (`listQueue()`), with "Sync now" → `flushQueue()`.
3. **Location transfers:** "Transfer stock" card on the dashboard opening a form: product → batch → from location → to location → qty, backed by existing `transfer_stock` RPC (`src/pages/api/stock/movements.ts` style endpoint wrapper or direct RPC via supabase client). Online-first for Phase A; pending-sync banner covers general offline queue.
4. **Activity tab:** New nav tab "Activity" (viewable by staff and owner; movements are `SELECT`-able by active staff via RLS). Filter by product, batch, user, reason, date range; paginated; CSV export owner-only (new API route).
5. **Reorder worksheet:** Lists active products/batches where `on hand <= reorder_level`, showing suggested receive qty (`reorder_level − on hand`), with one-click receive movement per line (owner + active staff).
6. **Locations UI:** New section in `ManageView.tsx` (owner-only): add/edit location name + kind, toggle active. New `/api/locations` CRUD routes required.
7. **Batch lifecycle:** Dashboard batch inventory rows gain Archive (zero stock only) and Unarchive actions via existing `PATCH /api/batches/:id`.
8. **No Supabase Realtime in Phase A–C:** keep manual refresh + online-event sync to avoid new infra/deps.

## Phase A — Daily stock operations

Tasks:
1. `src/components/admin/AdminApp.tsx`: add sync/online status state (`navigator.onLine`, `online`/`offline` listeners, `listQueue()` length) rendered as a non-dismissible shell banner below/above nav or atop each tab content; "Sync now" button calls `flushQueue()` and refreshes count. Show when offline OR pending > 0.
2. `src/components/admin/DashboardView.tsx`: add "Transfer stock" quick-action card/section (owner + staff): product select, batch select (active batches of product), from-location select, to-location select, qty input, confirm button → movement API.
3. New API route `src/pages/api/transfers/index.ts` (or reuse `stock/movements`): POST wrapper calling `transfer_stock` RPC with idempotency `client_op_id`; validate locations differ and qty > 0; same-origin + zod validation per existing conventions.
4. Wire location lists into transfer form: need `GET /api/locations` (see Phase C route) — Phase A can reuse categories-style fetch until locations route lands, or order tasks so Phase C route exists first.
5. Tests: vitest coverage for transfer validation + banner sync behavior (add to `src/lib/lib.test.ts` pattern or new `src/components/admin/*.test.tsx` if vitest supports React there).
6. `npm run build` + `npm test` pass.

## Phase B — Owner oversight

Tasks:
1. `AdminApp.tsx`: add "Activity" tab (`icon: 'clock'`) visible to both roles (no `owner` gate), label "Activity".
2. `src/pages/api/movements/index.ts`: extend GET to support pagination (`limit`, `offset`/`cursor`) and filters (`product_id`, `batch_id`, `user_id`, `reason`, `from`, `to`); return `{ items, total }`.
3. New `ActivityView.tsx` component: table of movements (product, batch, user, reason, delta, note, time), filters, pagination, "Export CSV" button (owner-only) hitting new export route.
4. New API route `src/pages/api/export/movements.csv.ts`: owner-only CSV export of filtered movements (model on `export/products.csv.ts`).
5. `DashboardView.tsx`: add low-stock reorder worksheet section (owner + staff): active products/batches at/below reorder_level, suggested qty, per-line "Receive" button → `POST /api/stock/movements` reason `receive`; or batch receive all.
6. Tests + `npm run build` + `npm test`.

## Phase C — Setup completion

Tasks:
1. New API route `src/pages/api/locations/index.ts` + `src/pages/api/locations/[id]/index.ts`: GET list, POST create, PATCH update, DELETE (owner-only; RLS already owner-only for categories/locations pattern — confirm policy allows delete when not in use, or soft-deactivate via `active = false` instead of delete to protect stock history).
2. `ManageView.tsx`: add Locations section (owner-only) with add/edit name & kind, toggle active, list existing.
3. `DashboardView.tsx` batch inventory rows: Archive button (zero stock only, via existing `PATCH /api/batches/:id`) and Unarchive button.
4. Transfer form (Phase A) populates from/to locations from `/api/locations`.
5. Tests + `npm run build` + `npm test`.

## Data flow & auth boundaries

- All mutating endpoints: same-origin check, zod validation, `client_op_id` idempotency (mirror existing API routes).
- Owner-only gates: `is_owner()` (export CSV, locations write, stocktake finalize already owner-only).
- Staff-readable: movements, stock levels, locations via `is_active_user()` RLS; Activity tab viewable by staff.
- No secrets/keys logged; no client service-role key usage (service role is server-only per README).

## Risks

- `locations` has no API route yet and stock_levels references `location_id` non-null; ScanView/ProductsView currently ignore locations — Phase A transfer introduces location concept to UI without migrating existing stock_levels to a default location. Mitigation: transfer form requires explicit locations; existing stock stays valid.
- `transfer_stock` RPC rejects `from = to` and non-positive qty; UI must prevent.
- Dashboard batch archive: batches with stock cannot be archived (per README + RPC/business rule) — UI disables Archive when qty > 0.
- Offline transfers: Phase A is online-first; if offline, show clear error rather than silently failing (offline queue schema in `offline.ts` is movement-shaped; extending it to transfers is out of scope).

## Validation steps

1. `npm run build` (typecheck + build) passes after each phase.
2. `npm test` passes; add unit tests for new API validation and transfer/reorder logic.
3. Manual scenarios (dev server `astro dev --background` at `/admin`):
   - Staff opens dashboard while offline: banner shows offline + pending count; comes online, "Sync now" drains queue.
   - Owner transfers 5 units of a batch from "bench" to "shop"; stock_levels update and movement appears in Activity.
   - Owner opens Activity tab, filters by reason `sale` + date range, exports CSV; staff can view but not export.
   - Reorder worksheet shows suggested qty; clicking Receive creates movement and on-hand updates.
   - Owner adds location "tunnel" in ManageView; it appears in transfer from/to selects.
   - Owner archives a zero-stock batch from dashboard row; it disappears from active list and remains in history.
4. Confirm role gating: staff cannot access owner-only endpoints (403/42501 from RLS/RPC).

## Open questions

- None remaining; all scope, placement, and gating decisions resolved above. If offline transfer queueing is desired later, treat as follow-up work (extend `offline.ts` queue shape).
