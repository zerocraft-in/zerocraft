create table if not exists public.store_media_assets (
  store_id uuid not null references public.stores(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  file_name text not null,
  folder text not null default 'Library',
  alt_text text not null default '',
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, storage_path)
);

alter table public.store_media_assets enable row level security;
revoke all on public.store_media_assets from public, anon, authenticated;
grant all on public.store_media_assets to service_role;
notify pgrst, 'reload schema';
