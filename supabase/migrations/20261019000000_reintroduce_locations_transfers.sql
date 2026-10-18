-- Reintroduce nursery locations and the transfer_stock RPC.
-- Locations were dropped in 20261016040000 (stock is now tracked by product+batch only);
-- this migration re-adds them as an optional dimension so stock can be moved between
-- physical spots (bench / tunnel / shadehouse / shop / other) without losing history.

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(name) between 1 and 80),
  kind text not null default 'bench' check (kind in ('bench','tunnel','shadehouse','shop','other')),
  active boolean not null default true
);

-- New location rows start empty; existing stock_levels keep working because the
-- column is nullable and movements/batches are unaffected.
alter table public.stock_levels
  add column location_id uuid references public.locations(id) on delete restrict;

alter table public.stock_movements
  add column location_id uuid references public.locations(id) on delete restrict;

alter table public.stocktakes
  add column location_id uuid references public.locations(id) on delete restrict;

create index stock_levels_location_idx on public.stock_levels (location_id);
create index stock_movements_location_idx on public.stock_movements (location_id);

-- apply_stock_movement gains an optional location argument so transfers can record
-- the source/destination of each leg.
create or replace function public.apply_stock_movement(
  p_product uuid, p_batch uuid, p_delta integer,
  p_reason text, p_note text, p_client_op_id text,
  p_location uuid default null
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
  if p_location is not null and not exists (select 1 from locations where id = p_location and active) then
    raise exception 'unknown location';
  end if;

  select * into v_existing from stock_movements where user_id = v_user and client_op_id = p_client_op_id;
  if found then return v_existing; end if;

  perform 1 from products where id = p_product and active for update;
  if not found then raise exception 'unknown product'; end if;
  if p_batch is not null and not exists (select 1 from batches where id = p_batch and product_id = p_product) then
    raise exception 'batch does not belong to product';
  end if;

  select * into v_level from stock_levels
   where product_id = p_product and batch_id is not distinct from p_batch
     and location_id is not distinct from p_location for update;
  if not found then
    if p_delta < 0 then raise exception 'insufficient stock'; end if;
    insert into stock_levels (product_id, batch_id, location_id, qty) values (p_product, p_batch, p_location, p_delta);
  else
    if v_level.qty + p_delta < 0 then raise exception 'insufficient stock'; end if;
    update stock_levels set qty = qty + p_delta where id = v_level.id;
  end if;

  insert into stock_movements (product_id, batch_id, location_id, delta, reason, note, user_id, client_op_id)
  values (p_product, p_batch, p_location, p_delta, p_reason, p_note, v_user, p_client_op_id)
  returning * into v_row;
  return v_row;
end $$;

-- transfer_stock moves p_qty of a product/batch from one active location to another.
create function public.transfer_stock(
  p_product uuid, p_from uuid, p_to uuid, p_batch uuid, p_qty integer, p_note text, p_client_op_id text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  if p_from = p_to then raise exception 'locations must differ'; end if;
  if not exists (select 1 from locations where id = p_from and active) then raise exception 'unknown location'; end if;
  if not exists (select 1 from locations where id = p_to and active) then raise exception 'unknown location'; end if;
  perform apply_stock_movement(p_product, p_from, p_batch, -p_qty, 'transfer', p_note, p_client_op_id || ':out', p_from);
  perform apply_stock_movement(p_product, p_to, p_batch, p_qty, 'transfer', p_note, p_client_op_id || ':in', p_to);
end $$;

revoke all on function public.apply_stock_movement(uuid, uuid, integer, text, text, text, uuid) from public, anon;
revoke all on function public.transfer_stock(uuid, uuid, uuid, uuid, integer, text, text) from public, anon;
grant execute on function public.apply_stock_movement(uuid, uuid, integer, text, text, text, uuid) to authenticated;
grant execute on function public.transfer_stock(uuid, uuid, uuid, uuid, integer, text, text) to authenticated;

-- archive_batch already exists (20261016060000). Add its inverse so archived batches
-- can be restored from the dashboard; an archived batch with stock is still restorable.
create function public.unarchive_batch(p_id uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_batch batches;
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  select * into v_batch from batches where id = p_id for update;
  if not found then raise exception 'unknown batch'; end if;
  if v_batch.archived_at is null then return null; end if;
  update batches set archived_at = null where id = p_id returning archived_at into v_batch.archived_at;
  return v_batch.archived_at;
end $$;

revoke all on function public.unarchive_batch(uuid) from public, anon;
grant execute on function public.unarchive_batch(uuid) to authenticated;

-- Readable by active staff; writable by owners only (matches categories pattern).
do $$ declare t text; begin
  execute format('create policy %I_read on %I for select using (is_active_user())', 'locations', 'locations');
  execute format('create policy %I_ins on %I for insert with check (is_owner())', 'locations', 'locations');
  execute format('create policy %I_upd on %I for update using (is_owner()) with check (is_owner())', 'locations', 'locations');
  execute format('create policy %I_del on %I for delete using (is_owner())', 'locations', 'locations');
end $$;