-- LOCAL DRAFT — NOT DEPLOYED
-- Phase 2.8B.3F-PREP only. Do not apply without a separate security review.
-- This forward-only draft does not modify existing rows, inventory, Storage objects,
-- orders, accounts, or the already-applied 202610160003 migration.

-- Customer metadata registration must be valid independently of the application.
-- The helper is intentionally narrow and only returns a boolean. It does not expose
-- catalog or customer data and is invoked by the authenticated INSERT policy below.
create or replace function public.is_valid_customer_customization_registration(
  p_customer_id uuid,
  p_product_id uuid,
  p_template_id uuid,
  p_object_path text,
  p_status text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_customer_id = auth.uid()
    and p_status = 'ready'
    and p_object_path ~ (
      '^' || p_customer_id::text || '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
    )
    and exists (
      select 1
      from public.store_products p
      join public.store_customization_templates t on t.product_id = p.id
      where p.id = p_product_id
        and p.status = 'active'
        and t.id = p_template_id
        and t.status = 'published'
    );
$$;

revoke all on function public.is_valid_customer_customization_registration(uuid, uuid, uuid, text, text)
  from public, anon;
grant execute on function public.is_valid_customer_customization_registration(uuid, uuid, uuid, text, text)
  to authenticated;

drop policy if exists "Customers register own customizations" on public.store_customizations;
create policy "Customers register valid own customizations"
  on public.store_customizations
  for insert
  to authenticated
  with check (
    public.is_valid_customer_customization_registration(
      customer_id, product_id, template_id, object_path, status
    )
  );

-- The application has no customer UPDATE/DELETE grant on metadata. Keep that
-- invariant explicit so a customer cannot change a ready record back to ready,
-- change ownership, or remove the audit record directly.
revoke update, delete on public.store_customizations from anon, authenticated;

-- Storage bytes are not transactionally coupled to metadata. Allow customers to
-- change/delete only unregistered uploads; once metadata is ready or consumed,
-- the object is locked against customer replacement and deletion. Studio access
-- remains governed by the existing Studio policies.
drop policy if exists "Customers update own customization objects" on storage.objects;
create policy "Customers update unregistered customization objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'customer-customizations'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
    and not exists (
      select 1 from public.store_customizations c
      where c.object_path = name and c.status in ('ready', 'consumed')
    )
  )
  with check (
    bucket_id = 'customer-customizations'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
    and not exists (
      select 1 from public.store_customizations c
      where c.object_path = name and c.status in ('ready', 'consumed')
    )
  );

drop policy if exists "Customers delete own customization objects" on storage.objects;
create policy "Customers delete unregistered customization objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'customer-customizations'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
    and not exists (
      select 1 from public.store_customizations c
      where c.object_path = name and c.status in ('ready', 'consumed')
    )
  );

-- Authoritative reservation ledger for future checkout replacement and lifecycle
-- operations. The currently deployed checkout RPC does not write this ledger;
-- therefore this table is intentionally NOT sufficient to activate checkout.
create table if not exists public.store_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete restrict,
  order_item_id uuid references public.store_order_items(id) on delete restrict,
  location_id uuid not null references public.store_inventory_locations(id) on delete restrict,
  variant_id uuid not null references public.store_product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'released', 'fulfilled')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  fulfilled_at timestamptz,
  check (
    (status = 'reserved' and released_at is null and fulfilled_at is null)
    or (status = 'released' and released_at is not null and fulfilled_at is null)
    or (status = 'fulfilled' and released_at is null and fulfilled_at is not null)
  ),
  unique (order_id, location_id, variant_id)
);

create index if not exists store_inventory_reservations_order_idx
  on public.store_inventory_reservations(order_id, status);
create index if not exists store_inventory_reservations_variant_idx
  on public.store_inventory_reservations(variant_id, location_id, status);

alter table public.store_inventory_reservations enable row level security;
revoke all on public.store_inventory_reservations from anon, authenticated;
grant select on public.store_inventory_reservations to authenticated;
drop policy if exists "Studio read inventory reservations" on public.store_inventory_reservations;
create policy "Studio read inventory reservations"
  on public.store_inventory_reservations
  for select
  to authenticated
  using (public.is_studio_member());

-- Service-role-only, retry-safe lifecycle primitives. They deliberately require
-- the future checkout implementation to create ledger rows before activation.
create or replace function public.release_order_reservations(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  released_count integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  perform 1 from public.store_orders where id = p_order_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order unavailable';
  end if;
  for r in
    select id, location_id, variant_id, quantity
    from public.store_inventory_reservations
    where order_id = p_order_id and status = 'reserved'
    order by location_id, variant_id, id
    for update
  loop
    update public.store_inventory_levels
    set reserved = reserved - r.quantity, updated_at = now()
    where location_id = r.location_id
      and variant_id = r.variant_id
      and reserved >= r.quantity;
    if not found then
      raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: inventory invariant failed';
    end if;
    update public.store_inventory_reservations
    set status = 'released', released_at = now()
    where id = r.id and status = 'reserved';
    released_count := released_count + 1;
  end loop;
  return released_count;
end;
$$;

create or replace function public.fulfill_order_reservations(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  fulfilled_count integer := 0;
  order_status text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  select status into order_status from public.store_orders where id = p_order_id for update;
  if order_status is null or order_status not in ('fulfilling', 'shipped', 'completed') then
    raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order is not fulfillable';
  end if;
  for r in
    select id, location_id, variant_id, quantity
    from public.store_inventory_reservations
    where order_id = p_order_id and status = 'reserved'
    order by location_id, variant_id, id
    for update
  loop
    update public.store_inventory_levels
    set on_hand = on_hand - r.quantity,
        reserved = reserved - r.quantity,
        updated_at = now()
    where location_id = r.location_id
      and variant_id = r.variant_id
      and on_hand >= r.quantity
      and reserved >= r.quantity;
    if not found then
      raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: inventory invariant failed';
    end if;
    update public.store_inventory_reservations
    set status = 'fulfilled', fulfilled_at = now()
    where id = r.id and status = 'reserved';
    fulfilled_count := fulfilled_count + 1;
  end loop;
  return fulfilled_count;
end;
$$;

revoke all on function public.release_order_reservations(uuid) from public, anon, authenticated;
grant execute on function public.release_order_reservations(uuid) to service_role;
revoke all on function public.fulfill_order_reservations(uuid) from public, anon, authenticated;
grant execute on function public.fulfill_order_reservations(uuid) to service_role;

-- Deployment dependency: replace the checkout RPC in a later reviewed migration
-- so every successful physical line inserts one ledger row in the same transaction.
-- Until then, do not enable transactional checkout or run live reservation tests.
