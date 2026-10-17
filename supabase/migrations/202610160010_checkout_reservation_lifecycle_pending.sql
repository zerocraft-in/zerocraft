-- PENDING REVIEW ONLY — NOT DEPLOYED.
-- Phase 4E-A transactional checkout and reservation lifecycle.
-- Do not apply this migration until the SQL has been reviewed against the live
-- schema, payment provider contract, RLS policies, and a disposable database.
-- This migration intentionally replaces the checkout RPC from 202610160003;
-- it does not edit any previously applied migration file.

-- The reservation table was created by 202610160004. These columns make the
-- terminal reason and expiry policy explicit while retaining old rows.
alter table public.store_inventory_reservations
  add column if not exists expires_at timestamptz,
  add column if not exists release_reason text;

alter table public.store_inventory_reservations
  drop constraint if exists store_inventory_reservations_status_check;

alter table public.store_inventory_reservations
  add constraint store_inventory_reservations_status_check
  check (status in ('reserved', 'released', 'expired', 'fulfilled'));

alter table public.store_inventory_reservations
  drop constraint if exists store_inventory_reservations_lifecycle_check;

alter table public.store_inventory_reservations
  add constraint store_inventory_reservations_lifecycle_check
  check (
    (status = 'reserved' and released_at is null and fulfilled_at is null)
    or (status = 'released' and released_at is not null and fulfilled_at is null)
    or (status = 'expired' and released_at is not null and fulfilled_at is null)
    or (status = 'fulfilled' and released_at is null and fulfilled_at is not null)
  );

create index if not exists store_inventory_reservations_expiry_idx
  on public.store_inventory_reservations(expires_at, status)
  where status = 'reserved';

-- Only the trusted server can invoke checkout and lifecycle transitions. The
-- database role check is defense in depth; the application must still perform
-- session, origin, role, and payment-provider authorization checks.
create or replace function public.create_transactional_checkout(
  p_customer_id uuid,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_checkout jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := p_customer_id;
  v_request public.store_checkout_requests%rowtype;
  v_product public.store_products%rowtype;
  v_variant public.store_product_variants%rowtype;
  v_raw_line jsonb;
  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_currency text;
  v_order_currency text;
  v_unit_major numeric(12,2);
  v_unit_paise bigint;
  v_unit_minor bigint;
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_order_id uuid;
  v_order_number text;
  v_order_item_id uuid;
  v_location_id uuid;
  v_on_hand integer;
  v_reserved integer;
  v_inventory_count integer;
  v_existing jsonb;
  v_customization_path text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'CHECKOUT_INVALID: trusted server required';
  end if;

  if v_customer_id is null
     or not exists (select 1 from auth.users where id = v_customer_id)
     or coalesce((select email from auth.users where id = v_customer_id), '') = '' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: customer unavailable';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{1,128}$' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid idempotency key';
  end if;
  if p_request_fingerprint is null or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid request fingerprint';
  end if;
  if jsonb_typeof(p_checkout) <> 'object'
     or jsonb_typeof(p_checkout->'items') <> 'array'
     or jsonb_typeof(p_checkout->'address') <> 'object'
     or not (p_checkout ? 'items')
     or not (p_checkout ? 'address')
     or exists (select 1 from jsonb_object_keys(p_checkout) as key where key not in ('items', 'address', 'delivery', 'paymentMethod')) then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid checkout payload';
  end if;
  if jsonb_array_length(p_checkout->'items') < 1 or jsonb_array_length(p_checkout->'items') > 30 then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid line count';
  end if;
  if coalesce(p_checkout->>'paymentMethod', '') <> 'cod'
     or coalesce(p_checkout->>'delivery', '') not in ('standard', 'express', 'overnight') then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: unsupported checkout option';
  end if;
  if length(coalesce(p_checkout->'address'->>'fullName', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'street', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'city', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'state', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'postalCode', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'country', '')) not between 2 and 3
     or length(coalesce(p_checkout->'address'->>'phone', '')) not between 1 and 40 then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid delivery address';
  end if;

  for v_raw_line in select value from jsonb_array_elements(p_checkout->'items') loop
    if jsonb_typeof(v_raw_line) <> 'object'
       or coalesce(v_raw_line->>'productId', '') !~ '^[0-9a-fA-F-]{36}$'
       or coalesce(v_raw_line->>'quantity', '') !~ '^[0-9]+$'
       or (v_raw_line->>'quantity')::numeric not between 1 and 20
       or (v_raw_line ? 'variantId' and nullif(v_raw_line->>'variantId', '') is not null
           and (v_raw_line->>'variantId') !~ '^[0-9a-fA-F-]{36}$')
       or (v_raw_line ? 'customizationReference' and length(v_raw_line->>'customizationReference') > 300)
       or exists (select 1 from jsonb_object_keys(v_raw_line) as key
                  where key not in ('productId', 'variantId', 'quantity', 'customizationReference', 'color', 'size')) then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid cart line';
    end if;
  end loop;

  -- The unique customer/key row is the serialization point for retries.
  insert into public.store_checkout_requests(customer_id, idempotency_key, request_fingerprint)
  values (v_customer_id, p_idempotency_key, p_request_fingerprint)
  on conflict (customer_id, idempotency_key) do nothing;
  select * into v_request
    from public.store_checkout_requests
    where customer_id = v_customer_id and idempotency_key = p_idempotency_key
    for update;
  if v_request.request_fingerprint <> p_request_fingerprint then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT: request differs';
  end if;
  if v_request.order_id is not null then
    select jsonb_build_object(
      'order_id', o.id, 'order_number', o.order_number, 'status', o.status,
      'currency', o.currency, 'total', o.total, 'subtotal', o.subtotal,
      'discount', o.discount, 'shipping_fee', o.shipping_fee, 'tax', o.tax,
      'items', o.items, 'created_at', o.created_at, 'replayed', true
    ) into v_existing
    from public.store_orders o where o.id = v_request.order_id;
    if v_existing is not null then return v_existing; end if;
  end if;

  -- Sort every checkout by product/variant/customization before locking rows.
  -- This prevents two multi-line checkouts from taking inventory locks in
  -- opposite order and materially reduces deadlock risk.
  for v_line in
    select jsonb_build_object(
      'productId', x."productId", 'variantId', x."variantId",
      'customizationReference', x."customizationReference", 'color', x.color,
      'size', x.size, 'quantity', sum(x.quantity)
    )
    from jsonb_to_recordset(p_checkout->'items') as x(
      "productId" uuid, "variantId" uuid, quantity integer,
      "customizationReference" text, color text, size text
    )
    group by x."productId", x."variantId", x."customizationReference", x.color, x.size
    order by x."productId", x."variantId" nulls first, x."customizationReference" nulls first, x.color, x.size
  loop
    v_product_id := (v_line->>'productId')::uuid;
    v_variant_id := nullif(v_line->>'variantId', '')::uuid;
    v_quantity := (v_line->>'quantity')::integer;

    select * into v_product from public.store_products where id = v_product_id for update;
    if not found or v_product.status <> 'active' then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: product unavailable';
    end if;
    v_variant := null;
    if v_variant_id is not null then
      select * into v_variant from public.store_product_variants
        where id = v_variant_id and product_id = v_product_id for update;
      if not found or not v_variant.is_active then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: variant unavailable';
      end if;
      if nullif(v_line->>'color', '') is not null and not exists (
        select 1 from public.store_variant_values vv
        join public.store_variant_option_values ov on ov.id = vv.option_value_id
        join public.store_variant_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) in ('color', 'colour')
          and lower(ov.value) = lower(v_line->>'color')
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: color does not match variant';
      end if;
      if nullif(v_line->>'size', '') is not null and not exists (
        select 1 from public.store_variant_values vv
        join public.store_variant_option_values ov on ov.id = vv.option_value_id
        join public.store_variant_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) = 'size'
          and lower(ov.value) = lower(v_line->>'size')
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: size does not match variant';
      end if;
      if nullif(v_line->>'color', '') is null and exists (
        select 1 from public.store_variant_values vv
        join public.store_variant_option_values ov on ov.id = vv.option_value_id
        join public.store_variant_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) in ('color', 'colour')
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: color selection required';
      end if;
      if nullif(v_line->>'size', '') is null and exists (
        select 1 from public.store_variant_values vv
        join public.store_variant_option_values ov on ov.id = vv.option_value_id
        join public.store_variant_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) = 'size'
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: size selection required';
      end if;
    elsif (select count(*) from public.store_product_variants where product_id = v_product_id and is_active) > 1 then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: variant required';
    end if;

    v_currency := upper(coalesce(nullif(v_variant.currency_code, ''), nullif(v_product.currency_code, ''), v_product.currency));
    if v_currency not in ('INR', 'USD') then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: unsupported currency';
    end if;
    if v_order_currency is null then v_order_currency := v_currency;
    elsif v_order_currency <> v_currency then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: mixed currencies';
    end if;
    if v_currency = 'INR' then
      v_unit_paise := coalesce(v_variant.price_paise, v_product.price_paise);
      if v_unit_paise is null or v_unit_paise < 0 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid INR price';
      end if;
      v_unit_minor := v_unit_paise;
      v_unit_major := v_unit_paise::numeric / 100;
    else
      v_unit_major := coalesce(v_variant.price, v_product.price);
      if v_unit_major is null or v_unit_major < 0 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid USD price';
      end if;
      v_unit_minor := round(v_unit_major * 100)::bigint;
      v_unit_paise := null;
    end if;
    v_line_total := v_unit_major * v_quantity;
    if v_line_total > 9999999999.99 or v_subtotal > 9999999999.99 - v_line_total then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: order total exceeds supported range';
    end if;
    v_subtotal := v_subtotal + v_line_total;

    if v_product.product_type = 'physical' then
      if v_variant_id is null then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: physical product requires a variant';
      end if;
      select count(*) into v_inventory_count from public.store_inventory_levels where variant_id = v_variant_id;
      if v_inventory_count <> 1 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: inventory allocation is unsupported';
      end if;
    end if;

    v_customization_path := nullif(v_line->>'customizationReference', '');
    if v_customization_path is not null and not exists (
      select 1 from public.store_customizations c
      join public.store_customization_templates t on t.id = c.template_id
      join storage.objects o on o.bucket_id = 'customer-customizations' and o.name = c.object_path
      where c.object_path = v_customization_path and c.customer_id = v_customer_id
        and c.product_id = v_product_id and c.status = 'ready'
        and t.product_id = v_product_id and t.status = 'published'
    ) then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: customization is not owned or valid for product';
    end if;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id, 'variantId', v_variant_id, 'title', v_product.title,
      'sku', coalesce(v_variant.sku, v_product.sku), 'quantity', v_quantity,
      'unitPrice', v_unit_major, 'unitPriceMinor', v_unit_minor, 'currency', v_currency,
      'productType', v_product.product_type, 'customizationReference', v_customization_path
    ));
  end loop;

  select extensions.gen_random_uuid(), 'ZC-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8))
    into v_order_id, v_order_number;
  insert into public.store_orders(
    id, order_number, customer_id, customer_name, customer_email, customer_phone,
    shipping_address, items, delivery_method, subtotal, discount, shipping_fee, tax,
    total, currency, status, payment_status, payment_method, idempotency_key
  ) values (
    v_order_id, v_order_number, v_customer_id,
    coalesce(p_checkout->'address'->>'fullName', ''),
    coalesce((select email from auth.users where id = v_customer_id), ''),
    coalesce(p_checkout->'address'->>'phone', ''), p_checkout->'address', v_lines,
    p_checkout->>'delivery', v_subtotal, 0, 0, 0, v_subtotal, v_order_currency,
    'pending', 'unpaid', 'cod', v_customer_id::text || ':' || p_idempotency_key
  );

  -- Order items, inventory reservations, and customization consumption are all
  -- inside this function transaction. Any exception rolls back every mutation.
  for v_line in select value from jsonb_array_elements(v_lines) loop
    insert into public.store_order_items(
      order_id, product_id, variant_id, title, sku, quantity,
      unit_price_paise, unit_price_minor, currency, currency_code, customization
    ) values (
      v_order_id, (v_line->>'productId')::uuid, nullif(v_line->>'variantId', '')::uuid,
      v_line->>'title', coalesce(v_line->>'sku', ''), (v_line->>'quantity')::integer,
      case when v_line->>'currency' = 'INR' then (v_line->>'unitPriceMinor')::bigint end,
      case when v_line->>'currency' = 'USD' then (v_line->>'unitPriceMinor')::bigint end,
      v_line->>'currency', v_line->>'currency',
      case when nullif(v_line->>'customizationReference', '') is null then '{}'::jsonb
        else jsonb_build_object('reference', v_line->>'customizationReference') end
    ) returning id into v_order_item_id;

    if v_line->>'productType' = 'physical' then
      select location_id, on_hand, reserved into v_location_id, v_on_hand, v_reserved
        from public.store_inventory_levels
        where variant_id = (v_line->>'variantId')::uuid
        for update;
      if not found or v_reserved + (v_line->>'quantity')::integer > v_on_hand then
        raise exception using errcode = 'P0001', message = 'OUT_OF_STOCK: insufficient inventory';
      end if;
      update public.store_inventory_levels
        set reserved = reserved + (v_line->>'quantity')::integer, updated_at = now()
        where location_id = v_location_id and variant_id = (v_line->>'variantId')::uuid;
      insert into public.store_inventory_reservations(
        order_id, order_item_id, location_id, variant_id, quantity, status, expires_at
      ) values (
        v_order_id, v_order_item_id, v_location_id, (v_line->>'variantId')::uuid,
        (v_line->>'quantity')::integer, 'reserved', now() + interval '30 minutes'
      );
    end if;

    v_customization_path := nullif(v_line->>'customizationReference', '');
    if v_customization_path is not null then
      update public.store_customizations
        set status = 'consumed', consumed_at = now()
        where object_path = v_customization_path
          and customer_id = v_customer_id
          and product_id = (v_line->>'productId')::uuid
          and status = 'ready';
      if not found then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: customization was already consumed';
      end if;
    end if;
  end loop;

  update public.store_checkout_requests
    set order_id = v_order_id, completed_at = now() where id = v_request.id;
  return jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number, 'status', 'pending',
    'currency', v_order_currency, 'total', v_subtotal, 'subtotal', v_subtotal,
    'discount', 0, 'shipping_fee', 0, 'tax', 0, 'items', v_lines,
    'created_at', now(), 'replayed', false
  );
end;
$$;

revoke all on function public.create_transactional_checkout(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_transactional_checkout(uuid, text, text, jsonb) to service_role;

-- Release is idempotent. Only rows still in reserved state are changed.
-- The explicit reason is constrained to the lifecycle events currently
-- supported by this pending MVP; payment-provider reasons remain separate.
create or replace function public.release_order_reservations(p_order_id uuid, p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  if p_reason not in ('payment_failed', 'cancelled', 'manual_release') then
    raise exception using errcode = '22023', message = 'RESERVATION_INVALID: invalid release reason';
  end if;
  perform 1 from public.store_orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order unavailable'; end if;
  for r in select id, location_id, variant_id, quantity from public.store_inventory_reservations
    where order_id = p_order_id and status = 'reserved' order by location_id, variant_id, id for update loop
    update public.store_inventory_levels set reserved = reserved - r.quantity, updated_at = now()
      where location_id = r.location_id and variant_id = r.variant_id and reserved >= r.quantity;
    if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: inventory invariant failed'; end if;
    update public.store_inventory_reservations set status = 'released', released_at = now(), release_reason = p_reason
      where id = r.id and status = 'reserved';
    n := n + 1;
  end loop;
  return n;
end; $$;

-- Preserve the one-argument function signature already present in the
-- hardening migration for existing trusted callers.
create or replace function public.release_order_reservations(p_order_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  return public.release_order_reservations(p_order_id, 'manual_release');
end; $$;

create or replace function public.expire_order_reservations(p_order_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0; v_status text; v_active integer; v_unexpired integer;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  select status into v_status from public.store_orders where id = p_order_id for update;
  if v_status is null then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order unavailable'; end if;
  if v_status not in ('pending', 'confirmed') then return 0; end if;

  -- Do not partially expire an order. If any active reservation has not yet
  -- expired, leave every reservation untouched and keep the order open.
  select count(*) filter (where status = 'reserved'),
         count(*) filter (where status = 'reserved' and (expires_at is null or expires_at > now()))
    into v_active, v_unexpired
    from public.store_inventory_reservations where order_id = p_order_id;
  if v_active = 0 or v_unexpired > 0 then return 0; end if;

  for r in select id, location_id, variant_id, quantity from public.store_inventory_reservations
    where order_id = p_order_id and status = 'reserved' order by location_id, variant_id, id for update loop
    update public.store_inventory_levels set reserved = reserved - r.quantity, updated_at = now()
      where location_id = r.location_id and variant_id = r.variant_id and reserved >= r.quantity;
    if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: inventory invariant failed'; end if;
    update public.store_inventory_reservations set status = 'expired', released_at = now(), release_reason = 'expired'
      where id = r.id and status = 'reserved';
    n := n + 1;
  end loop;
  if n > 0 then
    update public.store_orders set status = 'cancelled', updated_at = now() where id = p_order_id;
  end if;
  return n;
end; $$;

create or replace function public.fulfill_order_reservations(p_order_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0; v_status text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  select status into v_status from public.store_orders where id = p_order_id for update;
  if v_status is null or v_status not in ('fulfilling', 'shipped', 'completed') then
    raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order is not fulfillable';
  end if;
  for r in select id, location_id, variant_id, quantity from public.store_inventory_reservations
    where order_id = p_order_id and status = 'reserved' order by location_id, variant_id, id for update loop
    update public.store_inventory_levels set on_hand = on_hand - r.quantity, reserved = reserved - r.quantity, updated_at = now()
      where location_id = r.location_id and variant_id = r.variant_id and on_hand >= r.quantity and reserved >= r.quantity;
    if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: inventory invariant failed'; end if;
    update public.store_inventory_reservations set status = 'fulfilled', fulfilled_at = now()
      where id = r.id and status = 'reserved';
    n := n + 1;
  end loop;
  return n;
end; $$;

create or replace function public.cancel_order_with_reservations(p_order_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer; v_status text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  select status into v_status from public.store_orders where id = p_order_id for update;
  if v_status is null then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order unavailable'; end if;
  if v_status = 'cancelled' then return 0; end if;
  if v_status not in ('pending', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order cannot be cancelled after fulfilment begins';
  end if;
  n := public.release_order_reservations(p_order_id, 'cancelled');
  update public.store_orders set status = 'cancelled', updated_at = now() where id = p_order_id;
  return n;
end; $$;

alter table public.store_inventory_reservations
  drop constraint if exists store_inventory_reservations_release_reason_check;
alter table public.store_inventory_reservations
  add constraint store_inventory_reservations_release_reason_check
  check (release_reason is null or release_reason in ('payment_failed', 'cancelled', 'manual_release', 'expired'));

revoke all on function public.release_order_reservations(uuid, text) from public, anon, authenticated;
revoke all on function public.release_order_reservations(uuid) from public, anon, authenticated;
revoke all on function public.expire_order_reservations(uuid) from public, anon, authenticated;
revoke all on function public.fulfill_order_reservations(uuid) from public, anon, authenticated;
revoke all on function public.cancel_order_with_reservations(uuid) from public, anon, authenticated;
grant execute on function public.release_order_reservations(uuid, text) to service_role;
grant execute on function public.release_order_reservations(uuid) to service_role;
grant execute on function public.expire_order_reservations(uuid) to service_role;
grant execute on function public.fulfill_order_reservations(uuid) to service_role;
grant execute on function public.cancel_order_with_reservations(uuid) to service_role;

-- Pending review: do not enable ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED until
-- this migration is approved, deployed to a disposable environment, and its
-- payment/order lifecycle tests pass.
