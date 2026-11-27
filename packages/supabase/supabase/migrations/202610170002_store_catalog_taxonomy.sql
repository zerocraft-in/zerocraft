-- Zerocraft Store catalog taxonomy.
-- Additive only. Review and apply manually; never run automatically against production.

create table if not exists public.store_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.store_categories(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  image_url text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug),
  unique (id, category_id)
);

alter table public.store_products
  add column if not exists subcategory_id uuid,
  add column if not exists design_origin text not null default 'original_zerocraft',
  add column if not exists rights_status text not null default 'not_applicable';

alter table public.store_products
  drop constraint if exists store_products_design_origin_check,
  drop constraint if exists store_products_rights_status_check;

alter table public.store_products
  add constraint store_products_design_origin_check
    check (design_origin in ('original_zerocraft', 'licensed', 'fan_inspired')),
  add constraint store_products_rights_status_check
    check (rights_status in ('not_applicable', 'approved_license', 'review_required'));

alter table public.store_products
  add constraint store_products_subcategory_parent_fk
    foreign key (subcategory_id, category_id)
    references public.store_subcategories (id, category_id)
    on delete restrict;

create index if not exists store_subcategories_category_idx
  on public.store_subcategories(category_id, sort_order, name);
create index if not exists store_products_subcategory_idx
  on public.store_products(subcategory_id);

alter table public.store_subcategories enable row level security;

drop policy if exists "Public active store subcategories" on public.store_subcategories;
create policy "Public active store subcategories"
  on public.store_subcategories for select
  using (
    is_active and exists (
      select 1 from public.store_categories c
      where c.id = category_id and c.is_active
    )
  );

drop policy if exists "Studio manage store subcategories" on public.store_subcategories;
create policy "Studio manage store subcategories"
  on public.store_subcategories for all to authenticated
  using (public.is_studio_member())
  with check (public.is_studio_member());

grant select on public.store_subcategories to anon, authenticated;
grant insert, update, delete on public.store_subcategories to authenticated;

-- Public catalog visibility is intentionally stricter than Studio visibility.
-- Legacy/uncategorized rows remain stored for review and are not deleted.
