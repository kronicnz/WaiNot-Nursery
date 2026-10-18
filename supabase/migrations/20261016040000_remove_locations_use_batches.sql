drop function public.transfer_stock(uuid, uuid, uuid, uuid, integer, text, text);
drop function public.apply_stock_movement(uuid, uuid, uuid, integer, text, text, text);
drop function public.set_stock_count(uuid, uuid, integer, text, text);
drop function public.set_batch_stock_count(uuid, uuid, uuid, integer, text, text);
drop function public.finalize_stocktake(uuid);

create temporary table stock_levels_migration as
select product_id, batch_id, sum(qty)::integer as qty
from public.stock_levels
group by product_id, batch_id;

delete from public.stock_levels;
drop index public.stock_levels_key;
alter table public.stock_levels drop column location_id;
insert into public.stock_levels (product_id, batch_id, qty)
select product_id, batch_id, qty from stock_levels_migration;
drop table stock_levels_migration;
create unique index stock_levels_product_batch_key
  on public.stock_levels (product_id, batch_id) nulls not distinct;

alter table public.stock_movements drop column location_id;
alter table public.stocktakes drop column location_id;
drop table public.locations;

create function public.apply_stock_movement(
  p_product uuid, p_batch uuid, p_delta integer,
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
  if p_reason not in ('receive','sale','adjust','loss','stocktake') then raise exception 'invalid reason'; end if;
  if p_delta = 0 then raise exception 'delta must be non-zero'; end if;
  if p_reason = 'receive' and p_delta < 0 then raise exception 'receive must be positive'; end if;
  if p_reason in ('sale','loss') and p_delta > 0 then raise exception '% must be negative', p_reason; end if;

  select * into v_existing from stock_movements where user_id = v_user and client_op_id = p_client_op_id;
  if found then return v_existing; end if;

  perform 1 from products where id = p_product and active for update;
  if not found then raise exception 'unknown product'; end if;
  if p_batch is not null and not exists (select 1 from batches where id = p_batch and product_id = p_product) then
    raise exception 'batch does not belong to product';
  end if;

  select * into v_level from stock_levels
   where product_id = p_product and batch_id is not distinct from p_batch for update;
  if not found then
    if p_delta < 0 then raise exception 'insufficient stock'; end if;
    insert into stock_levels (product_id, batch_id, qty) values (p_product, p_batch, p_delta);
  else
    if v_level.qty + p_delta < 0 then raise exception 'insufficient stock'; end if;
    update stock_levels set qty = qty + p_delta where id = v_level.id;
  end if;

  insert into stock_movements (product_id, batch_id, delta, reason, note, user_id, client_op_id)
  values (p_product, p_batch, p_delta, p_reason, p_note, v_user, p_client_op_id)
  returning * into v_row;
  return v_row;
end $$;

create function public.set_batch_stock_count(
  p_product uuid, p_batch uuid, p_count integer, p_note text, p_client_op_id text
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_current integer;
  v_delta integer;
begin
  if v_user is null or not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  if p_count < 0 or p_count > 1000000 then raise exception 'count out of range'; end if;
  if p_client_op_id is null or length(p_client_op_id) < 8 or length(p_client_op_id) > 60 then raise exception 'invalid client operation id'; end if;
  if p_note is not null and length(p_note) > 500 then raise exception 'note too long'; end if;

  perform 1 from products where id = p_product and active for update;
  if not found then raise exception 'unknown product'; end if;
  if p_batch is not null and not exists (select 1 from batches where id = p_batch and product_id = p_product) then
    raise exception 'batch does not belong to product';
  end if;
  if exists (
    select 1 from stock_movements
    where user_id = v_user and left(client_op_id, length(p_client_op_id) + 1) = p_client_op_id || ':'
  ) then
    return 0;
  end if;

  select coalesce(sum(qty), 0)::integer into v_current
  from stock_levels
  where product_id = p_product and batch_id is not distinct from p_batch;

  v_delta := p_count - v_current;
  if v_delta <> 0 then
    perform apply_stock_movement(p_product, p_batch, v_delta, 'stocktake', p_note, p_client_op_id || ':count');
    return 1;
  end if;
  return 0;
end $$;

create function public.finalize_stocktake(p_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_st stocktakes;
  l record;
  v_current integer;
  v_adjustments integer := 0;
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  select * into v_st from stocktakes where id = p_id for update;
  if not found or v_st.status <> 'open' then raise exception 'stocktake not open'; end if;

  for l in select * from stocktake_lines where stocktake_id = p_id loop
    select coalesce(sum(qty), 0)::integer into v_current
    from stock_levels
    where product_id = l.product_id and batch_id is not distinct from l.batch_id;

    if l.counted_qty <> v_current then
      perform apply_stock_movement(
        l.product_id, l.batch_id, l.counted_qty - v_current, 'stocktake',
        'Stocktake ' || p_id, 'stocktake:' || p_id || ':' || l.product_id || ':' || coalesce(l.batch_id::text, 'unassigned')
      );
      v_adjustments := v_adjustments + 1;
    end if;
  end loop;

  update stocktakes set status = 'finalized', finalized_at = now() where id = p_id;
  return v_adjustments;
end $$;

revoke all on function public.apply_stock_movement(uuid, uuid, integer, text, text, text) from public, anon;
revoke all on function public.set_batch_stock_count(uuid, uuid, integer, text, text) from public, anon;
revoke all on function public.finalize_stocktake(uuid) from public, anon;
grant execute on function public.apply_stock_movement(uuid, uuid, integer, text, text, text) to authenticated;
grant execute on function public.set_batch_stock_count(uuid, uuid, integer, text, text) to authenticated;
grant execute on function public.finalize_stocktake(uuid) to authenticated;
