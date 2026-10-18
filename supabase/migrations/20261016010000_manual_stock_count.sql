create or replace function public.apply_stock_movement(
  p_product uuid, p_location uuid, p_batch uuid, p_delta integer,
  p_reason text, p_note text, p_client_op_id text
) returns public.stock_movements
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_existing stock_movements;
  v_row stock_movements;
  v_level stock_levels;
  v_product products;
begin
  if v_user is null or not is_active_user() then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_reason not in ('receive','sale','adjust','loss','transfer','stocktake') then raise exception 'invalid reason'; end if;
  if p_delta = 0 then raise exception 'delta must be non-zero'; end if;
  if p_reason = 'receive' and p_delta < 0 then raise exception 'receive must be positive'; end if;
  if p_reason in ('sale','loss') and p_delta > 0 then raise exception '% must be negative', p_reason; end if;

  select * into v_existing from stock_movements where user_id = v_user and client_op_id = p_client_op_id;
  if found then return v_existing; end if;

  select * into v_product from products where id = p_product and active for update;
  if not found then raise exception 'unknown product'; end if;
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

create function public.set_stock_count(
  p_product uuid, p_location uuid, p_count integer, p_note text, p_client_op_id text
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_product products;
  v_level record;
  v_current integer;
  v_remaining integer;
  v_delta integer;
  v_adjustments integer := 0;
begin
  if v_user is null or not is_active_user() then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_count < 0 or p_count > 1000000 then raise exception 'count out of range'; end if;
  if p_client_op_id is null or length(p_client_op_id) < 8 or length(p_client_op_id) > 60 then raise exception 'invalid client operation id'; end if;
  if p_note is not null and length(p_note) > 500 then raise exception 'note too long'; end if;

  select * into v_product from products where id = p_product and active for update;
  if not found then raise exception 'unknown product'; end if;
  if not exists (select 1 from locations where id = p_location and active) then raise exception 'unknown location'; end if;

  select coalesce(sum(qty), 0)::integer into v_current
  from stock_levels where product_id = p_product and location_id = p_location;

  if p_count > v_current then
    perform apply_stock_movement(
      p_product, p_location, null, p_count - v_current, 'stocktake', p_note,
      p_client_op_id || ':unbatched'
    );
    return 1;
  end if;

  v_remaining := v_current - p_count;
  for v_level in
    select id, batch_id, qty
    from stock_levels
    where product_id = p_product and location_id = p_location and qty > 0
    order by (batch_id is not null), batch_id
  loop
    exit when v_remaining = 0;
    v_delta := least(v_level.qty, v_remaining);
    perform apply_stock_movement(
      p_product, p_location, v_level.batch_id, -v_delta, 'stocktake', p_note,
      p_client_op_id || ':' || coalesce(v_level.batch_id::text, 'unbatched')
    );
    v_remaining := v_remaining - v_delta;
    v_adjustments := v_adjustments + 1;
  end loop;

  return v_adjustments;
end $$;

revoke all on function public.set_stock_count(uuid, uuid, integer, text, text) from public, anon;
grant execute on function public.set_stock_count(uuid, uuid, integer, text, text) to authenticated;
