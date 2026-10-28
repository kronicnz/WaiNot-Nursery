SET local check_function_bodies = off;

CREATE TABLE "public"."care_task_completions" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "task_id"      uuid                     NOT NULL,
  "due_on"       date                     NOT NULL,
  "completed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "completed_by" uuid                     NOT NULL,
  "client_op_id" uuid                     NOT NULL,
  CONSTRAINT "care_task_completions_completed_by_client_op_id_key" UNIQUE (completed_by, client_op_id),
  CONSTRAINT "care_task_completions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."care_task_completions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."care_task_completions" FROM "anon";

CREATE TABLE "public"."care_tasks" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "title"        text                     NOT NULL,
  "notes"        text,
  "due_on"       date                     NOT NULL,
  "repeat_days"  integer,
  "batch_id"     uuid,
  "location_id"  uuid,
  "completed_at" timestamp with time zone,
  "created_by"   uuid                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "care_tasks_notes_check" CHECK (((notes IS NULL) OR (length(notes) <= 2000))),
  CONSTRAINT "care_tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "care_tasks_repeat_days_check" CHECK (((repeat_days >= 1) AND (repeat_days <= 3650))),
  CONSTRAINT "care_tasks_title_check" CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 200)))
);

ALTER TABLE "public"."care_tasks"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."care_tasks" FROM "anon";

CREATE TABLE "public"."customers" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        text                     NOT NULL,
  "email"       text,
  "phone"       text,
  "notes"       text,
  "archived_at" timestamp with time zone,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "customers_email_check" CHECK (((email IS NULL) OR (length(email) <= 254))),
  CONSTRAINT "customers_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 200))),
  CONSTRAINT "customers_notes_check" CHECK (((notes IS NULL) OR (length(notes) <= 2000))),
  CONSTRAINT "customers_phone_check" CHECK (((phone IS NULL) OR (length(phone) <= 80))),
  CONSTRAINT "customers_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customers"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."customers" FROM "anon";

CREATE TABLE "public"."order_lines" (
  "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
  "order_id"    uuid          NOT NULL,
  "product_id"  uuid          NOT NULL,
  "batch_id"    uuid,
  "location_id" uuid,
  "quantity"    integer       NOT NULL,
  "unit_price"  numeric(10,2) NOT NULL,
  CONSTRAINT "order_lines_pkey" PRIMARY KEY (id),
  CONSTRAINT "order_lines_quantity_check" CHECK (((quantity >= 1) AND (quantity <= 100000))),
  CONSTRAINT "order_lines_unit_price_check" CHECK (((unit_price >= (0)::numeric) AND (unit_price <= (100000)::numeric)))
);

ALTER TABLE "public"."order_lines"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."order_lines" FROM "anon";

CREATE TABLE "public"."orders" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "customer_id"  uuid,
  "status"       text                     NOT NULL DEFAULT 'open'::text,
  "notes"        text,
  "created_by"   uuid                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "fulfilled_at" timestamp with time zone,
  CONSTRAINT "orders_notes_check" CHECK (((notes IS NULL) OR (length(notes) <= 2000))),
  CONSTRAINT "orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "orders_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'fulfilled'::text, 'cancelled'::text])))
);

ALTER TABLE "public"."orders"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."orders" FROM "anon";

ALTER TABLE "public"."order_lines"
  ADD COLUMN "line_total" numeric(12,2) GENERATED ALWAYS AS (((quantity)::numeric * unit_price)) STORED;

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

CREATE OR REPLACE FUNCTION public.cancel_nursery_order (
  p_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
declare v_order orders;
begin
  if auth.uid() is null or not is_active_user() then raise exception 'not authorised' using errcode = '42501'; end if;
  select * into v_order from orders where id = p_id for update;
  if not found then raise exception 'unknown order'; end if;
  if v_order.status = 'cancelled' then return 'cancelled'; end if;
  if v_order.status <> 'open' then raise exception 'order not open'; end if;
  update orders set status = 'cancelled' where id = p_id;
  return 'cancelled';
end $function$;

REVOKE ALL ON FUNCTION "public"."cancel_nursery_order"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.complete_care_task (
  p_id           uuid,
  p_client_op_id uuid
)
  RETURNS date
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
declare
  v_task care_tasks;
  v_existing care_task_completions;
begin
  if auth.uid() is null or not is_active_user() then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_client_op_id is null then raise exception 'invalid client operation id'; end if;
  select * into v_task from care_tasks where id = p_id for update;
  if not found then raise exception 'unknown care task'; end if;
  select * into v_existing from care_task_completions where completed_by = auth.uid() and client_op_id = p_client_op_id;
  if found then
    if v_existing.task_id <> p_id then raise exception 'invalid client operation id reuse'; end if;
    return v_task.due_on;
  end if;
  if v_task.completed_at is not null then raise exception 'care task already completed'; end if;
  insert into care_task_completions(task_id, due_on, completed_by, client_op_id)
    values (p_id, v_task.due_on, auth.uid(), p_client_op_id);
  if v_task.repeat_days is null then
    update care_tasks set completed_at = now() where id = p_id;
    return null;
  end if;
  update care_tasks set due_on = v_task.due_on + v_task.repeat_days where id = p_id returning due_on into v_task.due_on;
  return v_task.due_on;
end $function$;

REVOKE ALL ON FUNCTION "public"."complete_care_task"(uuid, uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.create_nursery_order (
  p_customer uuid,
  p_notes    text,
  p_lines    jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
declare
  v_id uuid;
  l record;
begin
  if auth.uid() is null or not is_active_user() then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_customer is not null and not exists (select 1 from customers where id = p_customer and archived_at is null) then
    raise exception 'unknown customer';
  end if;
  if p_notes is not null and length(p_notes) > 2000 then raise exception 'invalid notes'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 100 then
    raise exception 'invalid order lines';
  end if;
  insert into orders(customer_id, notes, created_by) values (p_customer, p_notes, auth.uid()) returning id into v_id;
  for l in select * from jsonb_to_recordset(p_lines)
    as x(product_id uuid, batch_id uuid, location_id uuid, quantity integer, unit_price numeric)
  loop
    if not exists (select 1 from products where id = l.product_id and active) then raise exception 'unknown product'; end if;
    if l.batch_id is not null and not exists (select 1 from batches where id = l.batch_id and product_id = l.product_id and archived_at is null) then
      raise exception 'batch does not belong to product or is archived';
    end if;
    if l.location_id is not null and not exists (select 1 from locations where id = l.location_id and active) then raise exception 'unknown location'; end if;
    if l.quantity is null or l.quantity not between 1 and 100000 or l.unit_price is null
      or l.unit_price < 0 or l.unit_price > 100000 or l.unit_price <> round(l.unit_price, 2)
      or l.quantity * l.unit_price >= 10000000000 then
      raise exception 'invalid order line';
    end if;
    insert into order_lines(order_id, product_id, batch_id, location_id, quantity, unit_price)
    values (v_id, l.product_id, l.batch_id, l.location_id, l.quantity, l.unit_price);
  end loop;
  return v_id;
end $function$;

REVOKE ALL ON FUNCTION "public"."create_nursery_order"(uuid, text, jsonb) FROM PUBLIC, "anon";

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

CREATE OR REPLACE FUNCTION public.fulfill_nursery_order (
  p_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
declare
  v_order orders;
  l record;
begin
  if auth.uid() is null or not is_active_user() then raise exception 'not authorised' using errcode = '42501'; end if;
  select * into v_order from orders where id = p_id for update;
  if not found then raise exception 'unknown order'; end if;
  if v_order.status = 'fulfilled' then return 'fulfilled'; end if;
  if v_order.status <> 'open' then raise exception 'order not open'; end if;
  if not exists (select 1 from order_lines where order_id = p_id) then raise exception 'invalid order lines'; end if;
  for l in select * from order_lines where order_id = p_id order by product_id, batch_id nulls first, location_id nulls first, id loop
    perform apply_stock_movement(l.product_id, l.batch_id, -l.quantity, 'sale',
      'Order ' || p_id, 'order:' || p_id || ':' || l.id, l.location_id, l.unit_price, l.line_total);
  end loop;
  update orders set status = 'fulfilled', fulfilled_at = now() where id = p_id;
  return 'fulfilled';
end $function$;

REVOKE ALL ON FUNCTION "public"."fulfill_nursery_order"(uuid) FROM PUBLIC, "anon";

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

ALTER TABLE "public"."care_task_completions"
  ADD CONSTRAINT "care_task_completions_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES auth.users(id);

ALTER TABLE "public"."care_tasks"
  ADD CONSTRAINT "care_tasks_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE RESTRICT;

ALTER TABLE "public"."care_tasks"
  ADD CONSTRAINT "care_tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."care_tasks"
  ADD CONSTRAINT "care_tasks_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE RESTRICT;

ALTER TABLE "public"."care_task_completions"
  ADD CONSTRAINT "care_task_completions_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.care_tasks(id) ON DELETE RESTRICT;

ALTER TABLE "public"."order_lines"
  ADD CONSTRAINT "order_lines_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE RESTRICT;

ALTER TABLE "public"."order_lines"
  ADD CONSTRAINT "order_lines_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE RESTRICT;

ALTER TABLE "public"."order_lines"
  ADD CONSTRAINT "order_lines_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

ALTER TABLE "public"."order_lines"
  ADD CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;

CREATE INDEX care_task_completions_task_idx ON public.care_task_completions USING btree (task_id, completed_at DESC);

CREATE INDEX care_tasks_due_idx ON public.care_tasks USING btree (due_on)
  WHERE (completed_at IS NULL);

CREATE INDEX order_lines_order_idx ON public.order_lines USING btree (order_id);

CREATE INDEX orders_customer_idx ON public.orders USING btree (customer_id);

CREATE INDEX orders_status_created_idx ON public.orders USING btree (status, created_at DESC);

CREATE POLICY "care_task_completions_read" ON "public"."care_task_completions"
  FOR SELECT
  TO "authenticated"
  USING (public.is_active_user());

CREATE POLICY "care_tasks_insert" ON "public"."care_tasks"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_active_user() AND (created_by = auth.uid())));

CREATE POLICY "care_tasks_read" ON "public"."care_tasks"
  FOR SELECT
  TO "authenticated"
  USING (public.is_active_user());

CREATE POLICY "care_tasks_update" ON "public"."care_tasks"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

CREATE POLICY "customers_insert" ON "public"."customers"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_active_user());

CREATE POLICY "customers_read" ON "public"."customers"
  FOR SELECT
  TO "authenticated"
  USING (public.is_active_user());

CREATE POLICY "customers_update" ON "public"."customers"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

CREATE POLICY "order_lines_read" ON "public"."order_lines"
  FOR SELECT
  TO "authenticated"
  USING (public.is_active_user());

CREATE POLICY "orders_read" ON "public"."orders"
  FOR SELECT
  TO "authenticated"
  USING (public.is_active_user());

GRANT EXECUTE ON FUNCTION "public"."cancel_nursery_order"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."cancel_nursery_order"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."cancel_nursery_order"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."cancel_nursery_order"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."complete_care_task"(uuid, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."complete_care_task"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."complete_care_task"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."complete_care_task"(uuid, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."create_nursery_order"(uuid, text, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."create_nursery_order"(uuid, text, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_nursery_order"(uuid, text, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_nursery_order"(uuid, text, jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."fulfill_nursery_order"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."fulfill_nursery_order"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."fulfill_nursery_order"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."fulfill_nursery_order"(uuid) TO "service_role";

REVOKE ALL ON TABLE "public"."care_task_completions" FROM "authenticated";

GRANT SELECT ON TABLE "public"."care_task_completions" TO "authenticated";

REVOKE ALL ON TABLE "public"."care_task_completions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_task_completions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_task_completions" TO "service_role";

REVOKE ALL ON TABLE "public"."care_tasks" FROM "authenticated";

REVOKE ALL ("batch_id") ON TABLE "public"."care_tasks" FROM "authenticated";

GRANT UPDATE ("batch_id") ON TABLE "public"."care_tasks" TO "authenticated";

REVOKE ALL ("due_on") ON TABLE "public"."care_tasks" FROM "authenticated";

GRANT UPDATE ("due_on") ON TABLE "public"."care_tasks" TO "authenticated";

REVOKE ALL ("location_id") ON TABLE "public"."care_tasks" FROM "authenticated";

GRANT UPDATE ("location_id") ON TABLE "public"."care_tasks" TO "authenticated";

REVOKE ALL ("notes") ON TABLE "public"."care_tasks" FROM "authenticated";

GRANT UPDATE ("notes") ON TABLE "public"."care_tasks" TO "authenticated";

REVOKE ALL ("repeat_days") ON TABLE "public"."care_tasks" FROM "authenticated";

GRANT UPDATE ("repeat_days") ON TABLE "public"."care_tasks" TO "authenticated";

REVOKE ALL ("title") ON TABLE "public"."care_tasks" FROM "authenticated";

GRANT UPDATE ("title") ON TABLE "public"."care_tasks" TO "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."care_tasks" TO "authenticated";

REVOKE ALL ON TABLE "public"."care_tasks" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_tasks" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_tasks" TO "service_role";

REVOKE ALL ON TABLE "public"."customers" FROM "authenticated";

REVOKE ALL ("archived_at") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("archived_at") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("email") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("email") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("name") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("notes") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("notes") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("phone") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("phone") ON TABLE "public"."customers" TO "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ON TABLE "public"."customers" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customers" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customers" TO "service_role";

REVOKE ALL ON TABLE "public"."order_lines" FROM "authenticated";

GRANT SELECT ON TABLE "public"."order_lines" TO "authenticated";

REVOKE ALL ON TABLE "public"."order_lines" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_lines" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_lines" TO "service_role";

REVOKE ALL ON TABLE "public"."orders" FROM "authenticated";

GRANT SELECT ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ON TABLE "public"."orders" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orders" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orders" TO "service_role";
