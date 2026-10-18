-- Nursery stock management schema. Apply with `supabase db push`.
-- Disable public sign-ups in Supabase Auth settings; staff are invited by an owner.

create extension if not exists pgcrypto;

-- ───────── Profiles & role helpers ─────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'staff' check (role in ('owner','staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active)
$$;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'owner')
$$;

-- The very first user becomes the owner; everyone else starts as staff.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''),
          case when exists (select 1 from profiles) then 'staff' else 'owner' end);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── Catalogue ─────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(name) between 1 and 80)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(name) between 1 and 80),
  kind text not null default 'bench' check (kind in ('bench','tunnel','shadehouse','shop','other')),
  active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (length(sku) between 1 and 64),
  name text not null check (length(name) between 1 and 200),
  botanical_name text,
  category_id uuid references public.categories(id) on delete set null,
  pot_size text,
  price numeric(10,2) check (price is null or price >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  image_path text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.product_barcodes (
  barcode text primary key check (length(barcode) between 1 and 128),
  type text not null default 'EAN' check (type in ('EAN','CODE128','QR','OTHER')),
  product_id uuid not null references public.products(id) on delete cascade
);
create index on public.product_barcodes (product_id);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  batch_code text not null check (length(batch_code) between 1 and 64),
  potted_on date,
  notes text,
  unique (product_id, batch_code)
);

-- ───────── Stock (written only through RPCs) ─────────
create table public.stock_levels (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  batch_id uuid references public.batches(id) on delete restrict,
  qty integer not null default 0 check (qty >= 0)
);
create unique index stock_levels_key on public.stock_levels
  (product_id, location_id, coalesce(batch_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  batch_id uuid references public.batches(id) on delete restrict,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('receive','sale','adjust','transfer','loss','stocktake')),
  note text check (note is null or length(note) <= 500),
  user_id uuid not null references auth.users(id),
  client_op_id text not null check (length(client_op_id) between 8 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, client_op_id)
);
create index on public.stock_movements (product_id, created_at desc);
create index on public.stock_movements (created_at desc);

-- Movements are immutable.
create function public.block_mutation() returns trigger language plpgsql as $$
begin raise exception 'stock_movements is append-only'; end $$;
create trigger movements_immutable before update or delete on public.stock_movements
  for each row execute function public.block_mutation();

create table public.stocktakes (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id),
  status text not null default 'open' check (status in ('open','finalized')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create table public.stocktake_lines (
  stocktake_id uuid not null references public.stocktakes(id) on delete cascade,
  product_id uuid not null references public.products(id),
  batch_id uuid references public.batches(id),
  counted_qty integer not null check (counted_qty >= 0),
  primary key (stocktake_id, product_id)
);

-- ───────── RPCs ─────────
create function public.apply_stock_movement(
  p_product uuid, p_location uuid, p_batch uuid, p_delta integer,
  p_reason text, p_note text, p_client_op_id text
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

  insert into stock_movements (product_id, location_id, batch_id, delta, reason, note, user_id, client_op_id)
  values (p_product, p_location, p_batch, p_delta, p_reason, p_note, v_user, p_client_op_id)
  returning * into v_row;
  return v_row;
end $$;

create function public.transfer_stock(
  p_product uuid, p_from uuid, p_to uuid, p_batch uuid, p_qty integer, p_note text, p_client_op_id text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  if p_from = p_to then raise exception 'locations must differ'; end if;
  perform apply_stock_movement(p_product, p_from, p_batch, -p_qty, 'transfer', p_note, p_client_op_id || ':out');
  perform apply_stock_movement(p_product, p_to, p_batch, p_qty, 'transfer', p_note, p_client_op_id || ':in');
end $$;

create function public.finalize_stocktake(p_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_st stocktakes; l record; v_cur integer; v_n integer := 0;
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  select * into v_st from stocktakes where id = p_id for update;
  if not found or v_st.status <> 'open' then raise exception 'stocktake not open'; end if;
  for l in select * from stocktake_lines where stocktake_id = p_id loop
    select coalesce(sum(qty),0) into v_cur from stock_levels
      where product_id = l.product_id and location_id = v_st.location_id and batch_id is not distinct from l.batch_id;
    if l.counted_qty <> v_cur then
      perform apply_stock_movement(l.product_id, v_st.location_id, l.batch_id, l.counted_qty - v_cur,
        'stocktake', 'Stocktake ' || p_id, 'stocktake:' || p_id || ':' || l.product_id);
      v_n := v_n + 1;
    end if;
  end loop;
  update stocktakes set status = 'finalized', finalized_at = now() where id = p_id;
  return v_n;
end $$;

create view public.low_stock with (security_invoker = true) as
select p.id as product_id, p.sku, p.name, p.reorder_level, coalesce(sum(s.qty),0)::int as total_qty
from products p left join stock_levels s on s.product_id = p.id
where p.active and p.reorder_level > 0
group by p.id
having coalesce(sum(s.qty),0) <= p.reorder_level;

-- ───────── Row Level Security ─────────
alter table profiles enable row level security;
alter table categories enable row level security;
alter table locations enable row level security;
alter table products enable row level security;
alter table product_barcodes enable row level security;
alter table batches enable row level security;
alter table stock_levels enable row level security;
alter table stock_movements enable row level security;
alter table stocktakes enable row level security;
alter table stocktake_lines enable row level security;

create policy profiles_read on profiles for select using (id = auth.uid() or is_owner());
create policy profiles_owner_update on profiles for update using (is_owner()) with check (is_owner());

-- Readable by active staff; writable by owners only.
do $$ declare t text; begin
  foreach t in array array['categories','locations','products','product_barcodes','batches'] loop
    execute format('create policy %I_read on %I for select using (is_active_user())', t, t);
    execute format('create policy %I_ins on %I for insert with check (is_owner())', t, t);
    execute format('create policy %I_upd on %I for update using (is_owner()) with check (is_owner())', t, t);
    execute format('create policy %I_del on %I for delete using (is_owner())', t, t);
  end loop;
end $$;

-- Stock tables: read only (writes go through security-definer RPCs).
create policy stock_levels_read on stock_levels for select using (is_active_user());
create policy stock_movements_read on stock_movements for select using (is_active_user());

create policy stocktakes_read on stocktakes for select using (is_active_user());
create policy stocktakes_ins on stocktakes for insert
  with check (is_active_user() and created_by = auth.uid() and status = 'open');
create policy stocktake_lines_read on stocktake_lines for select using (is_active_user());
create policy stocktake_lines_write on stocktake_lines for all
  using (is_active_user() and exists (select 1 from stocktakes s where s.id = stocktake_id and s.status = 'open'))
  with check (is_active_user() and exists (select 1 from stocktakes s where s.id = stocktake_id and s.status = 'open'));

revoke all on function apply_stock_movement, transfer_stock, finalize_stocktake from public, anon;
grant execute on function apply_stock_movement, transfer_stock, finalize_stocktake to authenticated;
revoke execute on function is_active_user, is_owner from anon;

-- ───────── Storage: private product photos ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy product_images_read on storage.objects for select
  using (bucket_id = 'product-images' and public.is_active_user());
create policy product_images_ins on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_owner());
create policy product_images_upd on storage.objects for update
  using (bucket_id = 'product-images' and public.is_owner());
create policy product_images_del on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_owner());
