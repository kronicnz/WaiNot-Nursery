create function public.set_batch_stock_count(
  p_product uuid, p_location uuid, p_batch uuid, p_count integer, p_note text, p_client_op_id text
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
  if not exists (select 1 from products where id = p_product and active for update) then raise exception 'unknown product'; end if;
  if not exists (select 1 from locations where id = p_location and active) then raise exception 'unknown location'; end if;
  if p_batch is not null and not exists (select 1 from batches where id = p_batch and product_id = p_product) then
    raise exception 'batch does not belong to product';
  end if;

  if exists (select 1 from stock_movements where user_id = v_user and client_op_id = p_client_op_id) then
    return 0;
  end if;

  select coalesce(sum(qty), 0)::integer into v_current
  from stock_levels
  where product_id = p_product and location_id = p_location and batch_id is not distinct from p_batch;

  v_delta := p_count - v_current;
  if v_delta <> 0 then
    perform apply_stock_movement(
      p_product, p_location, p_batch, v_delta, 'stocktake', p_note, p_client_op_id
    );
    return 1;
  end if;
  return 0;
end $$;

revoke all on function public.set_batch_stock_count(uuid, uuid, uuid, integer, text, text) from public, anon;
grant execute on function public.set_batch_stock_count(uuid, uuid, uuid, integer, text, text) to authenticated;

alter table public.stocktake_lines drop constraint stocktake_lines_pkey;
create unique index stocktake_lines_batch_key
  on public.stocktake_lines (stocktake_id, product_id, batch_id) nulls not distinct;

insert into public.locations (name, kind)
select 'Nursery', 'other'
where not exists (select 1 from public.locations where active);
