# WaiNot Nursery — Admin Dashboard UX Redesign

**Status:** Proposal only — no application code changed.
**Goal:** Make the existing `/admin` overview faster to scan and safer to use during daily nursery stock work, especially on mobile.

## Repository context reviewed

- Astro + React admin app, styled with Tailwind utility classes; Supabase-backed API.
- Main shell: `src/components/admin/AdminApp.tsx`; dashboard: `src/components/admin/DashboardView.tsx`.
- Existing dashboard already includes setup progress, inventory search/filtering, low-stock information, recent movements, transfer workflows, and batch lifecycle actions.
- Activity is a separate tab in `src/components/admin/ActivityView.tsx`; offline queue status is already shown by the shell.
- Roles are `owner` and `staff`; preserve existing server-side authorization and RLS boundaries.
- Avoid re-implementing features already present. This plan prioritizes information hierarchy, navigation clarity, and responsive interaction.

## UX outcomes

1. Staff can get to Scan / Stock movement quickly, with minimal scrolling on a phone.
2. Owners can identify stock exceptions and setup gaps without scanning multiple unrelated panels.
3. Inventory lists remain usable on narrow screens and with large product ranges.
4. Existing actions, data semantics, offline behavior, and authorization remain unchanged.

## Proposed information architecture

### 1. Page header
- Keep the date and greeting, but reduce heading height and decorative whitespace.
- Put the last-updated timestamp beside a clearly labeled Refresh action.
- Keep sync/offline state in the persistent shell banner; do not duplicate it in the dashboard.

### 2. Primary actions
- Use a compact, role-aware action strip near the top: **Scan stock**, **Stocktake**, **Receive stock**, and **Transfer stock** where supported.
- Use explicit labels rather than icon-only controls.
- On mobile, make the highest-frequency action prominent and ensure all controls meet comfortable touch-target sizes.
- Reuse existing navigation/actions and form logic rather than creating parallel flows.

### 3. KPI summary
- Present a small, consistent set of operational metrics: total units on hand, low-stock batches, empty active batches, and active products.
- Each metric should have a clear label and a meaningful click-through/filter when the destination already exists.
- Avoid implying that counts are real-time if they are based on the last successful fetch; retain/update the timestamp.

### 4. Exceptions first
- Move low-stock and empty-batch exceptions above the general inventory list.
- Show product/batch identity, on-hand quantity, reorder threshold, and a direct next action.
- Keep empty batches visually distinct from low-but-positive stock.
- Do not silently hide exceptions behind charts or decorative summaries.

### 5. Inventory workspace
- Keep search and the All / Low stock / Empty filters together above the list.
- Preserve batch-level stock semantics and active/archive distinctions.
- On desktop, use a readable table/list with aligned numeric quantities and row actions.
- On mobile, use stacked rows/cards with the key quantity and status visible without horizontal scrolling.
- Make zero-stock archive eligibility clear; never offer archive for batches that still contain stock.

### 6. Recent activity
- Show a concise recent-movements preview with time, product/batch, signed quantity, reason, and location when available.
- Provide a clear link to the existing Activity tab for full history and filtering.
- Use accessible status text in addition to color for movement direction.

### 7. Setup guidance
- Keep the onboarding checklist only while setup is incomplete.
- Once complete, collapse it into a small “Setup complete” status so it does not permanently compete with daily operations.
- Keep owner-only setup actions hidden from staff, consistent with current role filtering.

## Visual system

- Retain the existing nursery palette (deep botanical green, muted sage, warm neutral background) to avoid unnecessary brand churn.
- Use a consistent spacing scale, restrained borders, and fewer nested card surfaces.
- Use typography and alignment—not more color—to establish hierarchy.
- Maintain visible keyboard focus, semantic headings, button labels, table headers, and non-color status cues.
- Respect reduced-motion preferences; avoid adding animation solely for decoration.

## Implementation phases

### Phase 1 — Layout and hierarchy
- Refactor the dashboard composition without changing API contracts.
- Reorder content to: page header → primary actions → KPI summary → stock exceptions → inventory workspace → recent activity.
- Keep setup guidance conditional on incomplete setup.
- Verify owner and staff see the correct actions.

### Phase 2 — Responsive inventory
- Improve mobile inventory row layout, filters, quantity alignment, and action affordances.
- Check long product names, SKUs, batch codes, empty states, loading states, and API errors.
- Ensure no essential action depends on hover.

### Phase 3 — Accessibility and polish
- Audit focus order, visible focus, labels, contrast, table semantics, live updates, and touch target sizes.
- Check that low-stock/empty status is understandable without color.
- Remove redundant visual wrappers and any duplicated sync indicators.

## Out of scope

- New stock-management capabilities or schema migrations.
- Changes to stock calculations, movement RPCs, idempotency, offline queue shape, or sync guarantees.
- New roles or changes to owner/staff permissions.
- Realtime subscriptions, new dependencies, or a visual rebrand.
- Replacing the Activity tab or transfer/stocktake workflows.

## Acceptance criteria

- `npm run build` passes (`astro check` + production build).
- `npm test` passes.
- Dashboard remains functional at phone, tablet, and desktop widths; no essential inventory actions require horizontal page scrolling.
- Search and All / Low stock / Empty filters retain their existing behavior.
- Stock totals and exception counts continue to derive from existing API data and existing business rules.
- Owner-only actions remain owner-only; staff workflows remain available as currently authorized.
- Offline/pending-sync banner remains visible in the shell and retains its current behavior.
- Loading, error, no-products, no-results, and completed-setup states are reviewed.
- No backend behavior changes are introduced as part of the visual refactor.

## Manual QA checklist

- [ ] Owner: incomplete setup, complete setup, low-stock inventory, empty batches, and archived batches.
- [ ] Staff: confirm owner-only controls are absent and stock actions still navigate correctly.
- [ ] Mobile: search/filter inventory, open stock actions, and inspect long names and batch codes.
- [ ] Keyboard-only: traverse navigation, filters, row actions, and refresh; focus remains visible.
- [ ] Simulated offline state: shell banner still communicates offline/pending status.
- [ ] API error and empty states remain understandable and recoverable.
