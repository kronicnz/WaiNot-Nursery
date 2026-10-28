-- Nursery price book: species × pot size × quality grade × quantity break,
-- with per-batch (lot) overrides for clearance. Phase 1 (expand): new tables,
-- new columns, backfill, views, RLS, history triggers. Legacy products.price /
-- products.pot_size left in place until phase 2.

-- ───────── Reference tables ─────────
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

-- ───────── Price book ─────────
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

-- ───────── Batch attributes + product default size ─────────
alter table public.products
  add column pot_size_id uuid references public.pot_sizes(id) on delete restrict;

alter table public.batches
  add column pot_size_id uuid references public.pot_sizes(id) on delete restrict,
  add column grade_id uuid references public.quality_grades(id) on delete restrict,
  add column price_override numeric(10,2)
    check (price_override is null or price_override >= 0);

-- ───────── Sale price snapshot ─────────
alter table public.stock_movements
  add column unit_price numeric(10,2),
  add column line_total numeric(12,2);

-- ───────── Price change history ─────────
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

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger product_prices_touch before update on public.product_prices
  for each row execute function public.touch_updated_at();
create trigger price_breaks_touch before update on public.price_breaks
  for each row execute function public.touch_updated_at();

-- History records for price book changes (security definer so it can write
-- even though RLS restricts direct inserts on price_history).
create function public.record_price_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_scope text;
  v_product uuid;
  v_pot_size uuid;
  v_grade uuid;
  v_min_qty integer;
  v_old text;
  v_new text;
begin
  if tg_op = 'DELETE' then
    v_scope := case
      when old.price_override is not null then 'price'
      else 'price'
    end;
    v_product := old.product_id;
    v_pot_size := old.pot_size_id;
    v_grade := null;
    v_min_qty := null;
    v_old := old.unit_price::text;
    v_new := null;
  elsif tg_op = 'UPDATE' then
    v_scope := 'price';
    v_product := new.product_id;
    v_pot_size := new.pot_size_id;
    v_grade := null;
    v_min_qty := null;
    v_old := old.unit_price::text;
    v_new := new.unit_price::text;
  else -- INSERT
    v_scope := 'price';
    v_product := new.product_id;
    v_pot_size := new.pot_size_id;
    v_grade := null;
    v_min_qty := null;
    v_old := null;
    v_new := new.unit_price::text;
  end if;
  insert into public.price_history (scope, product_id, pot_size_id, grade_id, min_qty, old_value, new_value, changed_by)
  values (v_scope, v_product, v_pot_size, v_grade, v_min_qty, v_old, v_new, auth.uid());
  return null;
end $$;

create trigger product_prices_history
  after insert or update or delete on public.product_prices
  for each row execute function public.record_price_history();

create function public.record_price_break_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old text;
  v_new text;
begin
  if tg_op = 'DELETE' then
    v_old := old.min_qty::text || ':' || old.discount_pct::text;
    v_new := null;
  elsif tg_op = 'UPDATE' then
    v_old := old.min_qty::text || ':' || old.discount_pct::text;
    v_new := new.min_qty::text || ':' || new.discount_pct::text;
  else
    v_old := null;
    v_new := new.min_qty::text || ':' || new.discount_pct::text;
  end if;
  insert into public.price_history (scope, product_id, pot_size_id, grade_id, min_qty, old_value, new_value, changed_by)
  values ('break', new.product_id, null, null, new.min_qty, v_old, v_new, auth.uid());
  return null;
end $$;

create trigger price_breaks_history
  after insert or update or delete on public.price_breaks
  for each row execute function public.record_price_break_history();

create function public.record_grade_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.price_history (scope, product_id, pot_size_id, grade_id, min_qty, old_value, new_value, changed_by)
  values ('grade', null, null, new.id, null, old.adjustment_pct::text, new.adjustment_pct::text, auth.uid());
  return null;
end $$;

create trigger quality_grades_history
  after update of adjustment_pct on public.quality_grades
  for each row execute function public.record_grade_history();

-- ───────── Backfill ─────────
insert into public.pot_sizes (code, name, diameter_mm, volume_l, sort_order, active)
values
  ('ellebag-40', '40mm Ellebag', 40, null, 1, true),
  ('ellebag-60', '60mm Ellebag', 60, null, 2, true),
  ('ellebag-80', '80mm Ellebag', 80, null, 3, true),
  ('rootrainer-tube', 'Rootrainer Tube', null, null, 4, true)
on conflict (code) do nothing;

insert into public.quality_grades (code, name, adjustment_pct, sort_order, active)
values
  ('standard', 'Standard', 0, 1, true),
  ('premium', 'Premium', 30, 2, true),
  ('economy', 'Economy', -20, 3, true)
on conflict (code) do nothing;

-- Default pot size for every product: '60mm Ellebag'.
update public.products set pot_size_id = (select id from public.pot_sizes where code = 'ellebag-60' limit 1);

-- For every product with a non-null legacy price: insert a product_prices row
-- for the default pot size ('60mm Ellebag') with that price.
insert into public.product_prices (product_id, pot_size_id, unit_price)
select p.id, ps.id, p.price
from public.products p
join public.pot_sizes ps on ps.code = 'ellebag-60'
where p.price is not null
on conflict (product_id, pot_size_id) do nothing;

-- Existing batches: pot_size_id inherits the product's, grade_id → standard,
-- price_override null.
update public.batches b
set pot_size_id = p.pot_size_id,
    grade_id = (select id from public.quality_grades where code = 'standard' limit 1),
    price_override = null
from public.products p
where b.product_id = p.id;

-- ───────── Row Level Security ─────────
alter table public.pot_sizes enable row level security;
alter table public.quality_grades enable row level security;
alter table public.product_prices enable row level security;
alter table public.price_breaks enable row level security;
alter table public.price_history enable row level security;

do $$ declare t text; begin
  foreach t in array array['pot_sizes','quality_grades','product_prices','price_breaks'] loop
    execute format('create policy %I_read on %I for select using (is_active_user())', t, t);
    execute format('create policy %I_ins on %I for insert with check (is_owner())', t, t);
    execute format('create policy %I_upd on %I for update using (is_owner()) with check (is_owner())', t, t);
    execute format('create policy %I_del on %I for delete using (is_owner())', t, t);
  end loop;
end $$;

-- price_history is read-only for staff (no insert policy; trigger is security definer).
create policy price_history_read on public.price_history for select using (is_active_user());

-- ───────── Public views (recreate) ─────────
drop view if exists public.public_catalog_plants;
create view public.public_catalog_plants
with (security_barrier = true) as
select
  products.sku as id,
  products.name,
  categories.name as category,
  products.public_description as description,
  products.public_image_url as image,
  products.public_image_alt as image_alt,
  categories.sort_order as category_sort_order,
  products.catalog_sort_order as sort_order,
  pp.unit_price as price,
  ps.name as price_label
from public.products
join public.categories on categories.id = products.category_id
left join public.pot_sizes ps on ps.id = products.pot_size_id
left join lateral (
  select pp2.unit_price
  from public.product_prices pp2
  where pp2.product_id = products.id and pp2.pot_size_id = products.pot_size_id and pp2.active
  order by pp2.updated_at desc
  limit 1
) pp on true
where products.active and products.public_image_url is not null;

create or replace view public.public_catalog_price_list
with (security_barrier = true) as
select
  p.sku as sku,
  p.name as name,
  c.name as category,
  c.sort_order as category_sort_order,
  p.catalog_sort_order as sort_order,
  ps.name as pot_size,
  pb.min_qty as min_qty,
  pb.discount_pct as discount_pct,
  round(
    coalesce(b.price_override, pp.unit_price, 0)::numeric
    * (1 + coalesce(g.adjustment_pct, 0) / 100)
    * (1 - pb.discount_pct / 100), 2
  ) as unit_price
from public.products p
join public.categories c on c.id = p.category_id
join public.product_prices pp on pp.product_id = p.id and pp.active
join public.pot_sizes ps on ps.id = pp.pot_size_id
cross join lateral (select 1 as min_qty, 0 as discount_pct) pb
cross join lateral (
  select (select adjustment_pct from public.quality_grades where code = 'standard' limit 1) as adjustment_pct
) g
left join public.batches b on b.product_id = p.id
where p.active and p.public_image_url is not null;

grant select on public.public_catalog_plants, public.public_catalog_price_list to anon, authenticated;

-- ───────── RPC update: apply_stock_movement ─────────
-- Drop and recreate to add p_unit_price / p_line_total params (avoid overload
-- ambiguity). Callers using the existing 7-arg count still work via defaults.
-- Drop all existing overloads before recreating with new params.
drop function if exists public.apply_stock_movement(uuid, uuid, integer, text, text, text);
drop function if exists public.apply_stock_movement(uuid, uuid, integer, text, text, text, uuid);
drop function if exists public.apply_stock_movement(uuid, uuid, uuid, integer, text, text, text);

create function public.apply_stock_movement(
  p_product uuid, p_location uuid, p_batch uuid, p_delta integer,
  p_reason text, p_note text, p_client_op_id text,
  p_unit_price numeric default null, p_line_total numeric default null
) returns public.stock_movements
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_existing stock_movements;
  v_row stock_movements;
  v_level stock_levels;
begin
  if v_user is null or not is_active_user() then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_reason not in ('receive','sale','adjust','loss','stocktake','transfer') then raise exception 'invalid reason'; end if;
  if p_delta = 0 then raise exception 'delta must be non-zero'; end if;
  if p_reason = 'receive' and p_delta < 0 then raise exception 'receive must be positive'; end if;
  if p_reason in ('sale','loss') and p_delta > 0 then raise exception '% must be negative', p_reason; end if;

  select * into v_existing from stock_movements where user_id = v_user and client_op_id = p_client_op_id;
  if found then return v_existing; end if;

  if not exists (select 1 from products where id = p_product and active) then raise exception 'unknown product'; end if;
  if not exists (select 1 from locations where id = p_location and active) then raise exception 'unknown location'; end if;
  if p_batch is not null and not exists (select 1 from batches where id = p_batch and product_id = p_product) then
    raise exception 'batch does not belong to product';
  end if;

  select * into v_level from stock_levels
   where product_id = p_product and location_id = p_location
     and batch_id is not distinct from p_batch for update;
  if not found then
    if p_delta < 0 then raise exception 'insufficient stock'; end if;
    insert into stock_levels (product_id, location_id, batch_id, qty) values (p_product, p_location, p_batch, p_delta);
  else
    if v_level.qty + p_delta < 0 then raise exception 'insufficient stock'; end if;
    update stock_levels set qty = qty + p_delta where id = v_level.id;
  end if;

  insert into stock_movements (product_id, location_id, batch_id, delta, reason, note, user_id, client_op_id, unit_price, line_total)
  values (p_product, p_location, p_batch, p_delta, p_reason, p_note, v_user, p_client_op_id, p_unit_price, p_line_total)
  returning * into v_row;
  return v_row;
end $$;

revoke all on function apply_stock_movement, transfer_stock, finalize_stocktake from public, anon;
grant execute on function apply_stock_movement, transfer_stock, finalize_stocktake to authenticated;
revoke execute on function is_active_user, is_owner from anon;
