-- WordPress-style page content and site navigation foundation for the Zerocraft CMS.
create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null default '',
  content text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  seo_title text not null default '',
  seo_description text not null default '',
  featured_image_url text not null default '',
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create index if not exists cms_pages_status_idx on public.cms_pages(status, updated_at desc);

create table if not exists public.cms_navigation_menus (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text not null default 'header',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.cms_navigation_menus(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 100),
  href text not null,
  position integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cms_navigation_items_menu_idx on public.cms_navigation_items(menu_id, position);

create table if not exists public.cms_site_settings (
  setting_key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.cms_pages enable row level security;
alter table public.cms_navigation_menus enable row level security;
alter table public.cms_navigation_items enable row level security;
alter table public.cms_site_settings enable row level security;

drop policy if exists "Published pages are public" on public.cms_pages;
create policy "Published pages are public" on public.cms_pages for select using (status = 'published' or public.is_studio_member());
drop policy if exists "Studio manage pages" on public.cms_pages;
create policy "Studio manage pages" on public.cms_pages for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
drop policy if exists "Studio manage navigation menus" on public.cms_navigation_menus;
create policy "Studio manage navigation menus" on public.cms_navigation_menus for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
drop policy if exists "Studio manage navigation items" on public.cms_navigation_items;
create policy "Studio manage navigation items" on public.cms_navigation_items for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
drop policy if exists "Studio manage site settings" on public.cms_site_settings;
create policy "Studio manage site settings" on public.cms_site_settings for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());

grant select on public.cms_pages to anon, authenticated;
grant select, insert, update, delete on public.cms_pages, public.cms_navigation_menus, public.cms_navigation_items, public.cms_site_settings to authenticated;
