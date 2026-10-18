create or replace function public.finalize_stocktake(p_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_st stocktakes;
  l record;
  v_current integer;
  v_batch batches;
  v_adjustments integer := 0;
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  select * into v_st from stocktakes where id = p_id for update;
  if not found or v_st.status <> 'open' then raise exception 'stocktake not open'; end if;

  for l in select * from stocktake_lines where stocktake_id = p_id loop
    perform 1 from products where id = l.product_id for update;
    if not found then raise exception 'unknown product'; end if;

    if l.batch_id is not null then
      select * into v_batch from batches where id = l.batch_id and product_id = l.product_id for update;
      if not found then raise exception 'batch does not belong to product'; end if;
      if v_batch.archived_at is not null then raise exception 'batch is archived'; end if;
    end if;

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

revoke all on function public.finalize_stocktake(uuid) from public, anon;
grant execute on function public.finalize_stocktake(uuid) to authenticated;
