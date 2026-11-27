-- Central metadata registry for the Studio media library.
-- Objects remain in Cloudflare R2 (or Supabase Storage fallback); this table
-- stores safe metadata and makes standalone files editable and referenceable.
create table if not exists public.store_media_assets (
  storage_path text primary key,
  public_url text not null,
  file_name text not null,
  folder text not null,
  alt_text text not null default '',
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_media_assets_folder_idx
  on public.store_media_assets(folder, updated_at desc);

alter table public.store_media_assets enable row level security;

drop policy if exists "Studio read media assets" on public.store_media_assets;
drop policy if exists "Studio manage media assets" on public.store_media_assets;

create policy "Studio read media assets"
  on public.store_media_assets for select to authenticated
  using (public.studio_has_permission('catalog.read'));

create policy "Studio manage media assets"
  on public.store_media_assets for all to authenticated
  using (public.studio_has_permission('catalog.manage'))
  with check (public.studio_has_permission('catalog.manage'));

grant select on public.store_media_assets to authenticated;
grant insert, update, delete on public.store_media_assets to authenticated;
