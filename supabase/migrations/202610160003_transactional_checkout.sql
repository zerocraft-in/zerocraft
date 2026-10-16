-- DRAFT ONLY: transactional checkout foundation.
-- Do not apply until the live schema, inventory allocation policy, and payment rules
-- have been reviewed and explicitly approved. This migration is forward-only and
-- does not modify existing orders, products, inventory, or Storage objects.

-- The original order-item table only allowed INR paise. Keep that value for INR,
-- while adding an explicit minor-unit snapshot for legacy USD purchases.
alter table public.store_order_items
  add column if not exists unit_price_minor bigint,
  add column if not exists currency_code text;

alter table public.store_order_items
  alter column unit_price_paise drop not null;

alter table public.store_order_items
  drop constraint if exists store_order_items_currency_check;

alter table public.store_order_items
  add constraint store_order_items_currency_check
  check (currency in ('INR', 'USD'));

alter table public.store_order_items
  add constraint store_order_items_money_snapshot_check
  check (
    (currency = 'INR' and unit_price_paise is not null and unit_price_minor is null)
    or (currency = 'USD' and unit_price_minor is not null and unit_price_paise is null)
  );

create table if not exists public.store_checkout_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(trim(idempotency_key)) between 1 and 128),
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  order_id uuid references public.store_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (customer_id, idempotency_key)
);

create table if not exists public.store_customizations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  template_id uuid not null references public.store_customization_templates(id) on delete restrict,
  object_path text not null unique check (object_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|png|webp|pdf)$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 26214400),
  status text not null default 'ready' check (status in ('ready', 'consumed', 'rejected')),
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists store_customizations_customer_idx
  on public.store_customizations(customer_id, created_at desc);
create index if not exists store_customizations_product_idx
  on public.store_customizations(product_id, template_id);

create index if not exists store_checkout_requests_order_idx
  on public.store_checkout_requests(order_id);

create index if not exists store_orders_customer_idx
  on public.store_orders(customer_id, created_at desc);

alter table public.store_checkout_requests enable row level security;
alter table public.store_customizations enable row level security;

revoke all on public.store_checkout_requests from anon, authenticated;

revoke all on public.store_customizations from anon, authenticated;
grant select, insert on public.store_customizations to authenticated;

drop policy if exists "Customers read own customizations" on public.store_customizations;
create policy "Customers read own customizations" on public.store_customizations for select
  to authenticated using (customer_id = (select auth.uid()));

drop policy if exists "Customers register own customizations" on public.store_customizations;
create policy "Customers register own customizations" on public.store_customizations for insert
  to authenticated with check (
    customer_id = (select auth.uid())
    and object_path ~ ('^' || (select auth.uid())::text || '/[0-9a-fA-F-]{36}\\.(jpg|png|webp|pdf)$')
  );

drop policy if exists "Customer read own orders" on public.store_orders;
create policy "Customer read own orders" on public.store_orders for select
  to authenticated using (customer_id = (select auth.uid()));

drop policy if exists "Customer read own order items" on public.store_order_items;
create policy "Customer read own order items" on public.store_order_items for select
  to authenticated using (exists (
    select 1 from public.store_orders o
    where o.id = order_id and o.customer_id = (select auth.uid())
  ));

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
  v_customer_id uuid := auth.uid();
  v_request public.store_checkout_requests%rowtype;
  v_order public.store_orders%rowtype;
  v_line jsonb;
  v_raw_line jsonb;
  v_product public.store_products%rowtype;
  v_variant public.store_product_variants%rowtype;
  v_variant_id uuid;
  v_product_id uuid;
  v_quantity integer;
  v_currency text;
  v_order_currency text;
  v_color text;
  v_size text;
  v_unit_major numeric(12,2);
  v_unit_paise bigint;
  v_unit_minor bigint;
  v_subtotal numeric(12,2) := 0;
  v_line_total numeric(12,2);
  v_lines jsonb := '[]'::jsonb;
  v_inventory_count integer;
  v_location_id uuid;
  v_on_hand integer;
  v_reserved integer;
  v_order_id uuid;
  v_order_number text;
  v_existing jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: trusted server required';
  end if;
  v_customer_id := p_customer_id;
  if v_customer_id is null or not exists (select 1 from auth.users where id = v_customer_id) then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: customer unavailable';
  end if;
  if coalesce((select email from auth.users where id = v_customer_id), '') = '' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: customer email unavailable';
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
    or exists (select 1 from jsonb_object_keys(p_checkout) key where key not in ('items', 'address', 'delivery', 'paymentMethod'))
    or not (p_checkout ? 'items')
    or not (p_checkout ? 'address')
  then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid checkout payload';
  end if;
  if jsonb_array_length(p_checkout->'items') < 1 or jsonb_array_length(p_checkout->'items') > 30 then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid line count';
  end if;
  if coalesce(p_checkout->>'paymentMethod', '') <> 'cod' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: unsupported payment method';
  end if;
  if p_checkout->>'delivery' not in ('standard', 'express', 'overnight') then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: unsupported delivery method';
  end if;
  if length(coalesce(p_checkout->'address'->>'fullName', '')) not between 1 and 160
    or length(coalesce(p_checkout->'address'->>'street', '')) not between 1 and 160
    or length(coalesce(p_checkout->'address'->>'city', '')) not between 1 and 160
    or length(coalesce(p_checkout->'address'->>'state', '')) not between 1 and 160
    or length(coalesce(p_checkout->'address'->>'postalCode', '')) not between 1 and 160
    or length(coalesce(p_checkout->'address'->>'country', '')) not between 2 and 3
    or length(coalesce(p_checkout->'address'->>'phone', '')) not between 1 and 40
  then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid delivery address';
  end if;

  for v_raw_line in select value from jsonb_array_elements(p_checkout->'items') loop
    if jsonb_typeof(v_raw_line) <> 'object'
      or coalesce(v_raw_line->>'productId', '') !~ '^[0-9a-fA-F-]{36}$'
      or coalesce(v_raw_line->>'quantity', '') !~ '^[0-9]+$'
      or (v_raw_line->>'quantity')::numeric not between 1 and 20
      or (v_raw_line ? 'variantId' and nullif(v_raw_line->>'variantId', '') is not null and (v_raw_line->>'variantId') !~ '^[0-9a-fA-F-]{36}$')
      or (v_raw_line ? 'customizationReference' and length(v_raw_line->>'customizationReference') > 300)
      or exists (select 1 from jsonb_object_keys(v_raw_line) key where key not in ('productId', 'variantId', 'quantity', 'customizationReference', 'color', 'size'))
    then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid cart line';
    end if;
  end loop;

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

  -- Duplicate lines are intentionally aggregated by product, variant and
  -- customization identity before any inventory is locked.
  for v_line in
    select jsonb_build_object(
      'productId', x.product_id,
      'variantId', x.variant_id,
      'customizationReference', x."customizationReference",
      'color', x.color,
      'size', x.size,
      'quantity', sum(x.quantity)
    )
    from jsonb_to_recordset(p_checkout->'items') as x(
      "productId" uuid, "variantId" uuid, quantity integer, "customizationReference" text, color text, size text
    )
    group by x."productId", x."variantId", x."customizationReference", x.color, x.size
    order by x."productId", x."variantId" nulls first, x."customizationReference" nulls first, x.color, x.size
  loop
    v_variant := null;
    v_product_id := (v_line->>'productId')::uuid;
    v_variant_id := nullif(v_line->>'variantId', '')::uuid;
    v_quantity := (v_line->>'quantity')::integer;
    v_color := nullif(v_line->>'color', '');
    v_size := nullif(v_line->>'size', '');
    if v_quantity < 1 or v_quantity > 20 then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid quantity';
    end if;

    select * into v_product from public.store_products where id = v_product_id for update;
    if not found or v_product.status <> 'active' then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: product unavailable';
    end if;

    if v_variant_id is not null then
      select * into v_variant from public.store_product_variants where id = v_variant_id and product_id = v_product_id for update;
      if not found or not v_variant.is_active then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: variant unavailable';
      end if;
      if v_color is not null and not exists (
        select 1 from public.store_variant_values vv
        join public.store_variant_option_values ov on ov.id = vv.option_value_id
        join public.store_variant_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) in ('color', 'colour') and lower(ov.value) = lower(v_color)
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: color does not match variant';
      end if;
      if v_color is null and exists (
        select 1 from public.store_variant_values vv
        join public.store_variant_option_values ov on ov.id = vv.option_value_id
        join public.store_variant_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) in ('color', 'colour')
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: color selection required';
      end if;
      if v_size is not null and not exists (
        select 1 from public.store_variant_values vv
        join public.store_variant_option_values ov on ov.id = vv.option_value_id
        join public.store_variant_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) = 'size' and lower(ov.value) = lower(v_size)
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: size does not match variant';
      end if;
      if v_size is null and exists (
        select 1 from public.store_variant_values vv
        join public.store_variant_option_values ov on ov.id = vv.option_value_id
        join public.store_variant_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) = 'size'
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: size selection required';
      end if;
      if (select count(*) from public.store_variant_options where product_id = v_product_id and lower(name) in ('color', 'colour')) > 1 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: duplicate color option definitions';
      end if;
      if (select count(*) from public.store_variant_options where product_id = v_product_id and lower(name) = 'size') > 1 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: duplicate size option definitions';
      end if;
    else
      select count(*) into v_inventory_count from public.store_product_variants where product_id = v_product_id and is_active;
      if v_inventory_count > 1 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: variant required';
      end if;
    end if;

    v_currency := upper(coalesce(nullif(v_variant.currency_code, ''), nullif(v_product.currency_code, ''), v_product.currency));
    if v_currency not in ('INR', 'USD') then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: unsupported currency';
    end if;
    if v_order_currency is null then
      v_order_currency := v_currency;
    elsif v_order_currency <> v_currency then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: mixed currencies';
    end if;
    if v_currency = 'INR' then
      v_unit_paise := coalesce(v_variant.price_paise, v_product.price_paise);
      if v_unit_paise is null or v_unit_paise < 0 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid INR price';
      end if;
      v_unit_minor := null;
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
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: physical product requires an inventory-backed variant';
      end if;
      select count(*) into v_inventory_count from public.store_inventory_levels where variant_id = v_variant_id;
      if v_inventory_count <> 1 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: inventory allocation is unsupported';
      end if;
      select location_id, on_hand, reserved into v_location_id, v_on_hand, v_reserved
      from public.store_inventory_levels where variant_id = v_variant_id for update;
      if v_reserved + v_quantity > v_on_hand then
        raise exception using errcode = 'P0001', message = 'OUT_OF_STOCK: insufficient inventory';
      end if;
      update public.store_inventory_levels
      set reserved = reserved + v_quantity, updated_at = now()
      where location_id = v_location_id and variant_id = v_variant_id;
    end if;

    if nullif(v_line->>'customizationReference', '') is not null then
      if not exists (
        select 1
        from public.store_customizations c
        join public.store_customization_templates t on t.id = c.template_id
        join storage.objects o on o.bucket_id = 'customer-customizations' and o.name = c.object_path
        where c.object_path = v_line->>'customizationReference'
          and c.customer_id = v_customer_id
          and c.product_id = v_product_id
          and c.status = 'ready'
          and t.product_id = v_product_id
          and t.status = 'published'
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: customization is not owned or valid for product';
      end if;
    end if;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id, 'variantId', v_variant_id, 'title', v_product.title,
      'sku', coalesce(v_variant.sku, v_product.sku), 'quantity', v_quantity,
      'unitPrice', v_unit_major, 'unitPriceMinor', coalesce(v_unit_paise, v_unit_minor),
      'currency', v_currency, 'customizationReference', nullif(v_line->>'customizationReference', '')
    ));
  end loop;

  select extensions.gen_random_uuid(), 'ZC-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8)) into v_order_id, v_order_number;
  insert into public.store_orders(
    id, order_number, customer_id, customer_name, customer_email, customer_phone,
    shipping_address, items, delivery_method, subtotal, discount, shipping_fee, tax,
    total, currency, status, payment_status, payment_method, idempotency_key
  ) values (
    v_order_id, v_order_number, v_customer_id,
    coalesce(p_checkout->'address'->>'fullName', ''),
    coalesce((select email from auth.users where id = v_customer_id), ''),
    coalesce(p_checkout->'address'->>'phone', ''), p_checkout->'address', v_lines,
    p_checkout->>'delivery', v_subtotal, 0, 0, 0, v_subtotal,
    v_order_currency,
    'pending', 'unpaid', 'cod', v_customer_id::text || ':' || p_idempotency_key
  );

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
    );
  end loop;

  update public.store_checkout_requests
  set order_id = v_order_id, completed_at = now()
  where id = v_request.id;

  return jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number,
    'status', 'pending', 'currency', v_order_currency, 'total', v_subtotal,
    'subtotal', v_subtotal, 'discount', 0, 'shipping_fee', 0, 'tax', 0,
    'items', v_lines, 'created_at', now(), 'replayed', false
  );
end;
$$;

revoke all on function public.create_transactional_checkout(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_transactional_checkout(uuid, text, text, jsonb) to service_role;

-- Customer order reads remain mediated by a future narrowly-scoped policy or
-- server endpoint. Studio retains its existing order access model.
