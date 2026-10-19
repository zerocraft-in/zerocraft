-- PHASE 4E-D STAGING ONLY — PREPARED, NOT EXECUTED.
-- Run only through psql against a separately approved disposable Supabase project.
-- Never run this file against production. It creates synthetic staging fixtures.
-- It does not create Auth users, print credentials, or access production records.

\set ON_ERROR_STOP on
\if :{?STAGING_PROJECT_REF}
\else
  \echo 'STAGING_PROJECT_REF is required; refusing to continue.'
  \quit 3
\endif
\if :{?CUSTOMER_A_ID}
\else
  \echo 'CUSTOMER_A_ID is required; refusing to continue.'
  \quit 3
\endif
\if :{?CUSTOMER_B_ID}
\else
  \echo 'CUSTOMER_B_ID is required; refusing to continue.'
  \quit 3
\endif

-- The operator must verify STAGING_PROJECT_REF is not the production project
-- before invoking psql. Do not add the production reference or credentials here.
\echo 'Prepared staging harness. Confirm the linked project is disposable before continuing.'

begin;

create temp table phase4e_fixture (
  product_id uuid not null,
  variant_id uuid not null,
  location_id uuid not null
) on commit drop;

with new_product as (
  insert into public.store_products(
    title, slug, description, product_type, status, sku, price, currency,
    price_paise, currency_code, stock, image_url
  ) values (
    'Phase 4E-D Synthetic Product',
    'phase4e-d-synthetic-product-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'Disposable staging fixture only.', 'physical', 'active',
    'PHASE4E-D-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    10.00, 'INR', 1000, 'INR', 10, ''
  ) returning id
), new_variant as (
  insert into public.store_product_variants(product_id, label, sku, options, price, stock, price_paise, currency_code, is_active)
  select id, 'Synthetic variant', 'PHASE4E-D-V-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), '{}', 10.00, 10, 1000, 'INR', true
  from new_product returning id, product_id
), new_location as (
  insert into public.store_inventory_locations(name, code, is_active)
  values ('Phase 4E-D Synthetic Location', 'PHASE4E-D-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), true)
  returning id
)
insert into phase4e_fixture(product_id, variant_id, location_id)
select new_variant.product_id, new_variant.id, new_location.id from new_variant cross join new_location;

insert into public.store_inventory_levels(location_id, variant_id, on_hand, reserved, reorder_point)
select location_id, variant_id, 10, 0, 0 from phase4e_fixture;

-- Use the trusted-server claim only for this disposable database test. The
-- application still has to enforce browser authentication and same-origin.
select set_config('request.jwt.claim.role', 'service_role', true);

create temp table phase4e_results(order_id uuid, replayed boolean, payload jsonb) on commit drop;

insert into phase4e_results(order_id, replayed, payload)
select (result->>'order_id')::uuid, coalesce((result->>'replayed')::boolean, false), result
from (
  select public.create_transactional_checkout(
    :'CUSTOMER_A_ID'::uuid,
    'phase4e-d-success',
    repeat('a', 64),
    jsonb_build_object(
      'items', jsonb_build_array(jsonb_build_object(
        'productId', f.product_id, 'variantId', f.variant_id, 'quantity', 1
      )),
      'address', jsonb_build_object(
        'fullName', 'Staging Customer A', 'street', 'Synthetic Street',
        'city', 'Staging City', 'state', 'ST', 'postalCode', '000000',
        'country', 'IN', 'phone', '0000000000'
      ),
      'delivery', 'standard', 'paymentMethod', 'cod'
    )
  ) as result
  from phase4e_fixture f
) checkout;

do $$
declare
  v_count integer;
  v_reserved integer;
begin
  select count(*) into v_count from phase4e_results;
  if v_count <> 1 then raise exception 'Expected one successful checkout result'; end if;
  select reserved into v_reserved from public.store_inventory_levels l join phase4e_fixture f on f.location_id = l.location_id and f.variant_id = l.variant_id;
  if v_reserved <> 1 then raise exception 'Expected one reserved unit, got %', v_reserved; end if;
end $$;

-- Duplicate retry: same customer/key/fingerprint must replay without another
-- order or reservation.
select public.create_transactional_checkout(
  :'CUSTOMER_A_ID'::uuid, 'phase4e-d-success', repeat('a', 64),
  jsonb_build_object('items', jsonb_build_array(jsonb_build_object('productId', f.product_id, 'variantId', f.variant_id, 'quantity', 1)), 'address', jsonb_build_object('fullName','Staging Customer A','street','Synthetic Street','city','Staging City','state','ST','postalCode','000000','country','IN','phone','0000000000'),'delivery','standard','paymentMethod','cod')
) from phase4e_fixture f;

-- Idempotency conflict must fail. The savepoint keeps this expected failure
-- from aborting the remainder of the staging transaction.
savepoint phase4e_conflict;
do $$
begin
  perform public.create_transactional_checkout(
    :'CUSTOMER_A_ID'::uuid, 'phase4e-d-success', repeat('b', 64),
    jsonb_build_object('items', '[]'::jsonb, 'address', '{}'::jsonb, 'delivery', 'standard', 'paymentMethod', 'cod')
  );
  raise exception 'Expected IDEMPOTENCY_CONFLICT';
exception when others then
  if position('IDEMPOTENCY_CONFLICT' in sqlerrm) = 0 then raise; end if;
end $$;
rollback to savepoint phase4e_conflict;

-- Lifecycle tests use the first order. Release is retry-safe.
select public.release_order_reservations((select order_id from phase4e_results limit 1), 'manual_release');
select public.release_order_reservations((select order_id from phase4e_results limit 1), 'manual_release');

do $$
declare v_reserved integer;
begin
  select reserved into v_reserved from public.store_inventory_levels l join phase4e_fixture f on f.location_id = l.location_id and f.variant_id = l.variant_id;
  if v_reserved <> 0 then raise exception 'Release did not restore available stock'; end if;
end $$;

-- Expiry: make a fresh pending order eligible and verify all its active
-- reservations are expired before the order is cancelled.
insert into phase4e_results(order_id, replayed, payload)
select (result->>'order_id')::uuid, false, result
from (
  select public.create_transactional_checkout(
    :'CUSTOMER_A_ID'::uuid, 'phase4e-d-expiry', repeat('c', 64),
    jsonb_build_object('items', jsonb_build_array(jsonb_build_object('productId', f.product_id, 'variantId', f.variant_id, 'quantity', 1)), 'address', jsonb_build_object('fullName','Staging Customer A','street','Synthetic Street','city','Staging City','state','ST','postalCode','000000','country','IN','phone','0000000000'),'delivery','standard','paymentMethod','cod')
  ) as result
  from phase4e_fixture f
) checkout;
update public.store_inventory_reservations set expires_at = now() - interval '1 minute'
where order_id = (select order_id from phase4e_results order by ctid desc limit 1)
  and status = 'reserved';
select public.expire_order_reservations((select order_id from phase4e_results order by order_id desc limit 1));
do $$
declare v_order uuid; v_status text; v_active integer;
begin
  select order_id into v_order from phase4e_results order by ctid desc limit 1;
  select status into v_status from public.store_orders where id = v_order;
  select count(*) into v_active from public.store_inventory_reservations where order_id = v_order and status = 'reserved';
  if v_status <> 'cancelled' or v_active <> 0 then raise exception 'Expiry invariant failed'; end if;
end $$;

-- Fulfilment: only a fulfilment-started order may consume on-hand stock.
insert into phase4e_results(order_id, replayed, payload)
select (result->>'order_id')::uuid, false, result
from (
  select public.create_transactional_checkout(
    :'CUSTOMER_A_ID'::uuid, 'phase4e-d-fulfil', repeat('d', 64),
    jsonb_build_object('items', jsonb_build_array(jsonb_build_object('productId', f.product_id, 'variantId', f.variant_id, 'quantity', 1)), 'address', jsonb_build_object('fullName','Staging Customer A','street','Synthetic Street','city','Staging City','state','ST','postalCode','000000','country','IN','phone','0000000000'),'delivery','standard','paymentMethod','cod')
  ) as result
  from phase4e_fixture f
) checkout;
update public.store_orders set status = 'fulfilling'
where id = (select order_id from phase4e_results order by ctid desc limit 1);
select public.fulfill_order_reservations((select order_id from phase4e_results order by ctid desc limit 1));
select public.fulfill_order_reservations((select order_id from phase4e_results order by ctid desc limit 1));

-- Prepared assertions for RLS/Storage must run through independent Supabase
-- client sessions with customer A, customer B, staff, manager, and admin JWTs.
-- The SQL editor/service role must not be used as evidence of RLS enforcement.
-- See docs/phase4e-d-integration-test-plan.md for the required matrix.

rollback;

\echo 'Database lifecycle harness prepared. PostgreSQL execution is required for any result.'
