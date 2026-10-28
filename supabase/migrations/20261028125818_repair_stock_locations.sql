SET local check_function_bodies = off;

DROP INDEX "public"."stock_levels_product_batch_key";

DROP FUNCTION "public"."apply_stock_movement"(uuid, uuid, uuid, integer, text, text, text, numeric, numeric);

CREATE OR REPLACE FUNCTION public.apply_stock_movement (
  p_product      uuid,
  p_batch        uuid,
  p_delta        integer,
  p_reason       text,
  p_note         text,
  p_client_op_id text,
  p_location     uuid    DEFAULT NULL::uuid,
  p_unit_price   numeric DEFAULT NULL::numeric,
  p_line_total   numeric DEFAULT NULL::numeric
)
  RETURNS public.stock_movements
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
declare
  v_user uuid := auth.uid();
  v_existing stock_movements;
  v_row stock_movements;
  v_level stock_levels;
  v_batch batches;
begin
  if v_user is null or not is_active_user() then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_reason not in ('receive','sale','adjust','loss','stocktake','transfer') then raise exception 'invalid reason'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'delta must be non-zero'; end if;
  if p_reason = 'receive' and p_delta < 0 then raise exception 'receive must be positive'; end if;
  if p_reason in ('sale','loss') and p_delta > 0 then raise exception '% must be negative', p_reason; end if;
  if p_client_op_id is null or length(p_client_op_id) not between 8 and 100 then raise exception 'invalid client operation id'; end if;
  if p_unit_price < 0 or p_line_total < 0 then raise exception 'invalid sale price'; end if;

  perform 1 from products where id = p_product and active for update;
  if not found then raise exception 'unknown product'; end if;
  select * into v_existing from stock_movements where user_id = v_user and client_op_id = p_client_op_id;
  if found then
    if v_existing.product_id is distinct from p_product or v_existing.batch_id is distinct from p_batch
      or v_existing.location_id is distinct from p_location or v_existing.delta is distinct from p_delta
      or v_existing.reason is distinct from p_reason then
      raise exception 'invalid client operation id reuse';
    end if;
    return v_existing;
  end if;
  if p_location is not null and not exists (select 1 from locations where id = p_location and (active or p_delta < 0)) then
    raise exception 'unknown location';
  end if;
  if p_batch is not null then
    select * into v_batch from batches where id = p_batch and product_id = p_product for update;
    if not found then raise exception 'batch does not belong to product'; end if;
    if v_batch.archived_at is not null then raise exception 'batch is archived'; end if;
  end if;
  select * into v_level from stock_levels
   where product_id = p_product and batch_id is not distinct from p_batch
     and location_id is not distinct from p_location for update;
  if not found then
    if p_delta < 0 then raise exception 'insufficient stock'; end if;
    insert into stock_levels (product_id, batch_id, location_id, qty)
      values (p_product, p_batch, p_location, p_delta);
  else
    if v_level.qty + p_delta < 0 then raise exception 'insufficient stock'; end if;
    update stock_levels set qty = qty + p_delta where id = v_level.id;
  end if;
  insert into stock_movements (product_id, batch_id, location_id, delta, reason, note, user_id, client_op_id, unit_price, line_total)
  values (p_product, p_batch, p_location, p_delta, p_reason, p_note, v_user, p_client_op_id, p_unit_price, p_line_total)
  returning * into v_row;
  return v_row;
end $function$;

REVOKE ALL ON FUNCTION "public"."apply_stock_movement"(uuid, uuid, integer, text, text, text, uuid, numeric, numeric) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.finalize_stocktake (
  p_id uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
declare
  v_st stocktakes;
  l record;
  v_adjustments integer := 0;
begin
  if auth.uid() is null or not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  select * into v_st from stocktakes where id = p_id for update;
  if not found or v_st.status <> 'open' then raise exception 'stocktake not open'; end if;
  for l in select * from stocktake_lines where stocktake_id = p_id order by product_id, batch_id nulls first loop
    v_adjustments := v_adjustments + set_batch_total_count(l.product_id, l.batch_id, l.counted_qty,
      'Stocktake ' || p_id, 'stocktake:' || md5(p_id::text || ':' || l.product_id::text || ':' || coalesce(l.batch_id::text, 'unassigned')));
  end loop;
  update stocktakes set status = 'finalized', finalized_at = now() where id = p_id;
  return v_adjustments;
end $function$;

CREATE OR REPLACE FUNCTION public.set_batch_stock_count (
  p_product      uuid,
  p_batch        uuid,
  p_count        integer,
  p_note         text,
  p_client_op_id text
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
begin
  return set_batch_total_count(p_product, p_batch, p_count, p_note, p_client_op_id);
end $function$;

CREATE OR REPLACE FUNCTION public.set_batch_total_count (
  p_product      uuid,
  p_batch        uuid,
  p_count        integer,
  p_note         text,
  p_client_op_id text
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
declare
  v_current integer;
  v_delta integer;
  v_remaining integer;
  v_take integer;
  v_level record;
  v_adjustments integer := 0;
  v_batch batches;
begin
  if auth.uid() is null or not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  if p_count is null or p_count < 0 or p_count > 1000000 then raise exception 'count out of range'; end if;
  if p_client_op_id is null or length(p_client_op_id) not between 8 and 60 then raise exception 'invalid client operation id'; end if;
  if p_note is not null and length(p_note) > 500 then raise exception 'note too long'; end if;
  perform 1 from products where id = p_product and active for update;
  if not found then raise exception 'unknown product'; end if;
  if p_batch is not null then
    select * into v_batch from batches where id = p_batch and product_id = p_product for update;
    if not found then raise exception 'batch does not belong to product'; end if;
    if v_batch.archived_at is not null then raise exception 'batch is archived'; end if;
  end if;
  if exists (select 1 from stock_movements where user_id = auth.uid()
    and left(client_op_id, length(p_client_op_id) + 1) = p_client_op_id || ':') then return 0; end if;
  select coalesce(sum(qty), 0)::integer into v_current from stock_levels
    where product_id = p_product and batch_id is not distinct from p_batch;
  v_delta := p_count - v_current;
  if v_delta > 0 then
    perform apply_stock_movement(p_product, p_batch, v_delta, 'stocktake', p_note, p_client_op_id || ':unassigned');
    return 1;
  elsif v_delta < 0 then
    v_remaining := -v_delta;
    for v_level in select location_id, qty from stock_levels
      where product_id = p_product and batch_id is not distinct from p_batch and qty > 0
      order by location_id nulls first for update
    loop
      v_take := least(v_remaining, v_level.qty);
      perform apply_stock_movement(p_product, p_batch, -v_take, 'stocktake', p_note,
        p_client_op_id || ':' || coalesce(v_level.location_id::text, 'unassigned'), v_level.location_id);
      v_remaining := v_remaining - v_take;
      v_adjustments := v_adjustments + 1;
      exit when v_remaining = 0;
    end loop;
  end if;
  return v_adjustments;
end $function$;

REVOKE ALL ON FUNCTION "public"."set_batch_total_count"(uuid, uuid, integer, text, text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.transfer_stock (
  p_product      uuid,
  p_from         uuid,
  p_to           uuid,
  p_batch        uuid,
  p_qty          integer,
  p_note         text,
  p_client_op_id text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
begin
  if p_qty is null or p_qty <= 0 then raise exception 'qty must be positive'; end if;
  if p_from is not distinct from p_to then raise exception 'locations must differ'; end if;
  if p_client_op_id is null or length(p_client_op_id) not between 8 and 80 then raise exception 'invalid client operation id'; end if;
  perform apply_stock_movement(p_product, p_batch, -p_qty, 'transfer', p_note, p_client_op_id || ':out', p_from);
  perform apply_stock_movement(p_product, p_batch, p_qty, 'transfer', p_note, p_client_op_id || ':in', p_to);
end $function$;

CREATE UNIQUE INDEX stock_levels_product_batch_location_key ON public.stock_levels USING btree (product_id, batch_id, location_id) NULLS NOT DISTINCT;

GRANT EXECUTE ON FUNCTION "public"."apply_stock_movement"(uuid, uuid, integer, text, text, text, uuid, numeric, numeric) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."apply_stock_movement"(uuid, uuid, integer, text, text, text, uuid, numeric, numeric) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."apply_stock_movement"(uuid, uuid, integer, text, text, text, uuid, numeric, numeric) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."apply_stock_movement"(uuid, uuid, integer, text, text, text, uuid, numeric, numeric) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_batch_total_count"(uuid, uuid, integer, text, text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."set_batch_total_count"(uuid, uuid, integer, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_batch_total_count"(uuid, uuid, integer, text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_batch_total_count"(uuid, uuid, integer, text, text) TO "service_role";
