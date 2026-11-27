create table public.cms_content_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('folders','menus','redirects','blogs','articles','definitions','entries')),
  title text not null check (length(trim(title)) between 1 and 200),
  handle text not null check (handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(handle) <= 120),
  status text not null default 'draft' check (status in ('draft','active')),
  parent_id uuid references public.cms_content_records(id) on delete restrict,
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind in ('articles','entries')) = (parent_id is not null))
);
create unique index cms_content_handle_unique on public.cms_content_records(kind, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), handle);
create unique index cms_content_redirect_source_unique on public.cms_content_records ((data->>'from')) where kind = 'redirects';
create index cms_content_parent_idx on public.cms_content_records(parent_id);
alter table public.cms_content_records enable row level security;
revoke all on public.cms_content_records from anon;
grant select, insert, update, delete on public.cms_content_records to authenticated;
create policy content_read on public.cms_content_records for select to authenticated using (((kind <> 'folders' and public.studio_has_permission('content.read')) or (kind = 'folders' and public.studio_has_permission('catalog.read'))));
create policy content_insert on public.cms_content_records for insert to authenticated with check (((kind <> 'folders' and public.studio_has_permission('content.manage')) or (kind = 'folders' and public.studio_has_permission('catalog.manage'))));
create policy content_update on public.cms_content_records for update to authenticated using (((kind <> 'folders' and public.studio_has_permission('content.manage')) or (kind = 'folders' and public.studio_has_permission('catalog.manage')))) with check (((kind <> 'folders' and public.studio_has_permission('content.manage')) or (kind = 'folders' and public.studio_has_permission('catalog.manage'))));
create policy content_delete on public.cms_content_records for delete to authenticated using (((kind <> 'folders' and public.studio_has_permission('content.manage')) or (kind = 'folders' and public.studio_has_permission('catalog.manage'))));
