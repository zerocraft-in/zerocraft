-- Recoverable lifecycle for store categories and unreferenced media assets.

alter table public.store_categories
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_after timestamptz,
  add column if not exists deleted_from_is_active boolean;

alter table public.store_categories
  drop constraint if exists store_categories_delete_window_check,
  add constraint store_categories_delete_window_check
    check (
      (deleted_at is null and purge_after is null and deleted_from_is_active is null)
      or (
        deleted_at is not null
        and purge_after is not null
        and deleted_from_is_active is not null
        and purge_after >= deleted_at + interval '15 days'
      )
    );

alter table public.store_subcategories
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_after timestamptz,
  add column if not exists deleted_from_is_active boolean;

alter table public.store_subcategories
  drop constraint if exists store_subcategories_delete_window_check,
  add constraint store_subcategories_delete_window_check
    check (
      (deleted_at is null and purge_after is null and deleted_from_is_active is null)
      or (
        deleted_at is not null
        and purge_after is not null
        and deleted_from_is_active is not null
        and purge_after >= deleted_at + interval '15 days'
      )
    );

create index if not exists store_categories_recycle_bin_idx
  on public.store_categories(purge_after)
  where deleted_at is not null;

create index if not exists store_subcategories_recycle_bin_idx
  on public.store_subcategories(purge_after)
  where deleted_at is not null;

create table if not exists public.store_recycle_bin_assets (
  storage_path text primary key,
  file_name text not null,
  folder text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  deleted_at timestamptz not null default now(),
  purge_after timestamptz not null,
  deleted_by uuid references auth.users(id) on delete set null,
  check (purge_after >= deleted_at + interval '15 days')
);

create index if not exists store_recycle_bin_assets_purge_idx
  on public.store_recycle_bin_assets(purge_after);

alter table public.store_recycle_bin_assets enable row level security;

drop policy if exists "Studio manage recycled store assets" on public.store_recycle_bin_assets;
drop policy if exists "Studio read recycled store assets" on public.store_recycle_bin_assets;
create policy "Studio read recycled store assets"
  on public.store_recycle_bin_assets for select to authenticated
  using (public.studio_has_permission('catalog.read'));
create policy "Studio manage recycled store assets"
  on public.store_recycle_bin_assets for all to authenticated
  using (public.studio_has_permission('catalog.manage'))
  with check (public.studio_has_permission('catalog.manage'));

grant select, insert, delete on public.store_recycle_bin_assets to authenticated;

create or replace function public.studio_soft_delete_store_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_time timestamptz := now();
  category_record public.store_categories%rowtype;
begin
  if not public.studio_has_permission('catalog.manage') then
    raise exception 'Catalog manage permission required' using errcode = '42501';
  end if;

  select * into category_record
  from public.store_categories
  where id = p_category_id
  for update;

  if not found then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;
  if category_record.deleted_at is not null then
    return;
  end if;

  update public.store_categories
  set is_active = false,
      deleted_from_is_active = is_active,
      deleted_at = deleted_time,
      purge_after = deleted_time + interval '15 days',
      updated_at = deleted_time
  where id = p_category_id;

  update public.store_subcategories
  set is_active = false,
      deleted_from_is_active = is_active,
      deleted_at = deleted_time,
      purge_after = deleted_time + interval '15 days',
      updated_at = deleted_time
  where category_id = p_category_id and deleted_at is null;
end;
$$;

create or replace function public.studio_soft_delete_store_subcategory(p_subcategory_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_time timestamptz := now();
begin
  if not public.studio_has_permission('catalog.manage') then
    raise exception 'Catalog manage permission required' using errcode = '42501';
  end if;

  update public.store_subcategories
  set is_active = false,
      deleted_from_is_active = is_active,
      deleted_at = deleted_time,
      purge_after = deleted_time + interval '15 days',
      updated_at = deleted_time
  where id = p_subcategory_id and deleted_at is null;

  if not found then
    if exists (select 1 from public.store_subcategories where id = p_subcategory_id and deleted_at is not null) then
      return;
    end if;
    raise exception 'Subcategory not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.studio_restore_store_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  category_record public.store_categories%rowtype;
begin
  if not public.studio_has_permission('catalog.manage') then
    raise exception 'Catalog manage permission required' using errcode = '42501';
  end if;

  select * into category_record
  from public.store_categories
  where id = p_category_id and deleted_at is not null
  for update;

  if not found then
    raise exception 'Deleted category not found' using errcode = 'P0002';
  end if;
  if category_record.purge_after <= now() then
    raise exception 'The restore window has expired' using errcode = '22023';
  end if;

  update public.store_categories
  set is_active = deleted_from_is_active,
      deleted_from_is_active = null,
      deleted_at = null,
      purge_after = null,
      updated_at = now()
  where id = p_category_id;

  update public.store_subcategories
  set is_active = deleted_from_is_active,
      deleted_from_is_active = null,
      deleted_at = null,
      purge_after = null,
      updated_at = now()
  where category_id = p_category_id
    and deleted_at = category_record.deleted_at
    and purge_after > now();
end;
$$;

create or replace function public.studio_restore_store_subcategory(p_subcategory_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  subcategory_record public.store_subcategories%rowtype;
begin
  if not public.studio_has_permission('catalog.manage') then
    raise exception 'Catalog manage permission required' using errcode = '42501';
  end if;

  select * into subcategory_record
  from public.store_subcategories
  where id = p_subcategory_id and deleted_at is not null
  for update;

  if not found then
    raise exception 'Deleted subcategory not found' using errcode = 'P0002';
  end if;
  if subcategory_record.purge_after <= now() then
    raise exception 'The restore window has expired' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.store_categories
    where id = subcategory_record.category_id and deleted_at is not null
  ) then
    raise exception 'Restore the parent category first' using errcode = '22023';
  end if;

  update public.store_subcategories
  set is_active = deleted_from_is_active,
      deleted_from_is_active = null,
      deleted_at = null,
      purge_after = null,
      updated_at = now()
  where id = p_subcategory_id;
end;
$$;

revoke all on function public.studio_soft_delete_store_category(uuid) from public;
revoke all on function public.studio_soft_delete_store_subcategory(uuid) from public;
revoke all on function public.studio_restore_store_category(uuid) from public;
revoke all on function public.studio_restore_store_subcategory(uuid) from public;
grant execute on function public.studio_soft_delete_store_category(uuid) to authenticated;
grant execute on function public.studio_soft_delete_store_subcategory(uuid) to authenticated;
grant execute on function public.studio_restore_store_category(uuid) to authenticated;
grant execute on function public.studio_restore_store_subcategory(uuid) to authenticated;

create or replace function public.studio_purge_expired_store_categories()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  purged_count integer := 0;
  removed_categories integer := 0;
begin
  update public.store_products
  set category_id = null,
      subcategory_id = null,
      updated_at = now()
  where subcategory_id in (
    select id from public.store_subcategories
    where deleted_at is not null and purge_after <= now()
  );
  delete from public.store_subcategories
  where deleted_at is not null and purge_after <= now();
  get diagnostics purged_count = row_count;

  update public.store_products
  set category_id = null,
      subcategory_id = null,
      updated_at = now()
  where category_id in (
    select id from public.store_categories
    where deleted_at is not null and purge_after <= now()
  );

  delete from public.store_subcategories
  where category_id in (
    select id from public.store_categories
    where deleted_at is not null and purge_after <= now()
  );
  delete from public.store_categories
  where deleted_at is not null and purge_after <= now();
  get diagnostics removed_categories = row_count;

  return purged_count + removed_categories;
end;
$$;

revoke all on function public.studio_purge_expired_store_categories() from public;

do $schedule$
begin
  if exists (select 1 from cron.job where jobname = 'studio-purge-expired-store-categories') then
    perform cron.unschedule('studio-purge-expired-store-categories');
  end if;
  perform cron.schedule(
    'studio-purge-expired-store-categories',
    '45 3 * * *',
    $job$select public.studio_purge_expired_store_categories();$job$
  );
end;
$schedule$;

notify pgrst, 'reload schema';
