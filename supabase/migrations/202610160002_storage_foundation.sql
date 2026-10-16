-- Zerocraft Storage Foundation
-- Additive and intentionally not applied by this phase.
-- product-media is intentionally public for storefront images. A public bucket
-- means a previously issued public URL can remain readable after archival;
-- storage.objects SELECT policies cannot revoke a URL that is already public.
-- Customer artwork must only use customer-customizations.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-media', 'product-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('customer-customizations', 'customer-customizations', false, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[])
on conflict (id) do nothing;

-- Enforce the one-primary-image invariant at the database boundary. Deployment
-- will fail safely if pre-existing media contains duplicate primary rows.
create unique index if not exists store_product_media_one_primary_idx
  on public.store_product_media(product_id)
  where is_primary;

-- Keep policy names deterministic if this migration is reviewed or replayed in a disposable environment.
drop policy if exists "Public read product media objects" on storage.objects;
drop policy if exists "Studio upload product media objects" on storage.objects;
drop policy if exists "Studio update product media objects" on storage.objects;
drop policy if exists "Studio delete product media objects" on storage.objects;
drop policy if exists "Customers upload own customization objects" on storage.objects;
drop policy if exists "Customers read own customization objects" on storage.objects;
drop policy if exists "Customers update own customization objects" on storage.objects;
drop policy if exists "Customers delete own customization objects" on storage.objects;
drop policy if exists "Studio access customization objects" on storage.objects;

create policy "Public read product media objects"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'product-media'
    and exists (
      select 1
      from public.store_product_media m
      join public.store_products p on p.id = m.product_id
      where m.storage_path = name
        and p.status = 'active'
    )
  );

create policy "Studio upload product media objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-media'
    and public.is_studio_member()
    and (storage.foldername(name))[1] = 'products'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.store_products p
      where p.id::text = (storage.foldername(name))[2]
    )
  );

create policy "Studio update product media objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-media'
    and public.is_studio_member()
    and (storage.foldername(name))[1] = 'products'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.store_products p
      where p.id::text = (storage.foldername(name))[2]
    )
  )
  with check (
    bucket_id = 'product-media'
    and public.is_studio_member()
    and (storage.foldername(name))[1] = 'products'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.store_products p
      where p.id::text = (storage.foldername(name))[2]
    )
  );

create policy "Studio delete product media objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-media'
    and public.is_studio_member()
    and (storage.foldername(name))[1] = 'products'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.store_products p
      where p.id::text = (storage.foldername(name))[2]
    )
  );

create policy "Customers upload own customization objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'customer-customizations'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
  );

create policy "Customers read own customization objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'customer-customizations'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
  );

create policy "Customers update own customization objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'customer-customizations'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
  )
  with check (
    bucket_id = 'customer-customizations'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
  );

create policy "Customers delete own customization objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'customer-customizations'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
  );

create policy "Studio access customization objects"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'customer-customizations' and public.is_studio_member())
  with check (bucket_id = 'customer-customizations' and public.is_studio_member());
