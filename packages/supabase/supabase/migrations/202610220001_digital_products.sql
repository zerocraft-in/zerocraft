-- Digital product delivery foundation.
-- Digital files are private and must never be stored in the public product-media bucket.

alter table public.store_products
  add column if not exists digital_delivery jsonb not null default '{"mode":"instant","download_limit":0,"link_expiry_hours":0}'::jsonb
  check (jsonb_typeof(digital_delivery) = 'object');

create table if not exists public.store_product_digital_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  variant_id uuid references public.store_product_variants(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (length(trim(file_name)) between 1 and 180),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 262144000),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists store_product_digital_files_product_idx
  on public.store_product_digital_files(product_id, sort_order);

alter table public.store_product_digital_files enable row level security;
drop policy if exists "Studio manage digital product files" on public.store_product_digital_files;
create policy "Studio manage digital product files"
  on public.store_product_digital_files for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

grant select, insert, update, delete on public.store_product_digital_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'digital-products',
  'digital-products',
  false,
  262144000,
  array['application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream', 'audio/mpeg', 'video/mp4', 'text/plain']::text[]
)
on conflict (id) do nothing;

drop policy if exists "Studio manage digital product objects" on storage.objects;
create policy "Studio manage digital product objects"
  on storage.objects for all to authenticated
  using (bucket_id = 'digital-products' and public.is_studio_member())
  with check (bucket_id = 'digital-products' and public.is_studio_member());
