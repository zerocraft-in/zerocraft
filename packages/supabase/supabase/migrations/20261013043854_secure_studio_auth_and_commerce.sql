-- Studio auth, least-privilege RLS, and ecommerce catalog setup.
-- Apply to the ZEROCRAFT Supabase project. Existing content and accounts are preserved.

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null,
  items jsonb not null,
  delivery_method text not null check (delivery_method in ('standard', 'express', 'overnight')),
  coupon_code text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  tax numeric(12,2) not null default 0 check (tax >= 0),
  total numeric(12,2) not null check (total >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'fulfilling', 'shipped', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_orders_created_at_idx on public.store_orders (created_at desc);
create index if not exists store_orders_status_idx on public.store_orders (status);

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.store_categories(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  product_type text not null default 'physical' check (product_type in ('physical', 'digital')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  sku text not null unique,
  price numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  stock integer check (stock is null or stock >= 0),
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 100),
  sku text not null unique,
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  price numeric(12,2) not null check (price >= 0),
  stock integer check (stock is null or stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_products_category_idx on public.store_products(category_id);
create index if not exists store_products_status_idx on public.store_products(status);
create index if not exists store_variants_product_idx on public.store_product_variants(product_id);

-- New signups receive the least-privileged role. Existing roles remain unchanged.
alter table public.profiles alter column role set default 'client'::public.user_role;

create or replace function public.is_studio_member()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'manager', 'staff')
  );
$$;

create or replace function public.is_studio_admin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_studio_member() from public;
revoke all on function public.is_studio_admin() from public;
grant execute on function public.is_studio_member() to anon, authenticated;
grant execute on function public.is_studio_admin() to authenticated;

create or replace function public.create_studio_profile()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    case when lower(new.email) = 'ivd.maran@gmail.com' then 'admin'::public.user_role else 'client'::public.user_role end
  ) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_studio_profile() from public, anon, authenticated;
drop trigger if exists studio_profile_created on auth.users;
create trigger studio_profile_created after insert on auth.users
for each row execute function public.create_studio_profile();

insert into public.profiles (id, email, full_name, role)
select id, email,
  coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1)),
  case when lower(email) = 'ivd.maran@gmail.com' then 'admin'::public.user_role else 'client'::public.user_role end
from auth.users where email is not null
on conflict (id) do update set
  email = excluded.email,
  role = case when lower(excluded.email) = 'ivd.maran@gmail.com' then 'admin'::public.user_role else public.profiles.role end;

-- Remove the old permissive policies on these CMS tables before defining the access model.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename = any(array[
      'profiles', 'blogs', 'works', 'reviews', 'clients', 'appointments', 'notifications',
      'store_orders', 'store_categories', 'store_products', 'store_product_variants'
    ])
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.blogs enable row level security;
alter table public.works enable row level security;
alter table public.reviews enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.notifications enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_categories enable row level security;
alter table public.store_products enable row level security;
alter table public.store_product_variants enable row level security;

create policy "Profiles self or studio read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_studio_member());
create policy "Studio admins manage profiles" on public.profiles for update to authenticated
  using (public.is_studio_admin()) with check (public.is_studio_admin());

create policy "Published blogs or studio read" on public.blogs for select
  using (status = 'published' or public.is_studio_member());
create policy "Studio manage blogs" on public.blogs for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

create policy "Public works read" on public.works for select using (true);
create policy "Studio manage works" on public.works for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

create policy "Approved reviews or studio read" on public.reviews for select
  using (status = 'approved' or public.is_studio_member());
create policy "Studio manage reviews" on public.reviews for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

create policy "Studio manage clients" on public.clients for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage appointments" on public.appointments for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage notifications" on public.notifications for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

create policy "Studio read store orders" on public.store_orders for select to authenticated
  using (public.is_studio_member());
create policy "Studio update order status" on public.store_orders for update to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

create policy "Active store categories or studio read" on public.store_categories for select
  using (is_active or public.is_studio_member());
create policy "Studio manage store categories" on public.store_categories for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

create policy "Active store products or studio read" on public.store_products for select
  using (status = 'active' or public.is_studio_member());
create policy "Studio manage store products" on public.store_products for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

create policy "Active variants of active products or studio read" on public.store_product_variants for select
  using (
    public.is_studio_member() or (
      is_active and exists (
        select 1 from public.store_products as product
        where product.id = product_id and product.status = 'active'
      )
    )
  );
create policy "Studio manage store variants" on public.store_product_variants for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

-- Remove broad default table grants and grant only the actions used by the public site and Studio.
revoke all on public.profiles, public.blogs, public.works, public.reviews, public.clients,
  public.appointments, public.notifications, public.store_orders, public.store_categories,
  public.store_products, public.store_product_variants from anon, authenticated;

grant select on public.blogs, public.works, public.reviews,
  public.store_categories, public.store_products, public.store_product_variants to anon;
grant select, insert, update, delete on public.blogs, public.works, public.reviews,
  public.clients, public.appointments, public.notifications,
  public.store_categories, public.store_products, public.store_product_variants to authenticated;
grant select on public.profiles, public.store_orders to authenticated;
grant update (role, full_name, phone, avatar_url, updated_at) on public.profiles to authenticated;
grant update (status, payment_status, updated_at) on public.store_orders to authenticated;

create or replace function public.studio_replace_product_variants(p_product_id uuid, p_variants jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_studio_member() then raise exception 'Studio access required.'; end if;
  if jsonb_typeof(p_variants) <> 'array' then raise exception 'Variants must be an array.'; end if;
  delete from public.store_product_variants where product_id = p_product_id;
  insert into public.store_product_variants (product_id, label, sku, options, price, stock, is_active)
  select p_product_id, v.label, v.sku, coalesce(v.options, '{}'::jsonb), v.price, v.stock, coalesce(v.is_active, true)
  from jsonb_to_recordset(p_variants) as v(label text, sku text, options jsonb, price numeric, stock integer, is_active boolean);
end;
$$;
revoke all on function public.studio_replace_product_variants(uuid, jsonb) from public;
grant execute on function public.studio_replace_product_variants(uuid, jsonb) to authenticated;

create or replace function public.studio_store_order_summary()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'count', count(*),
    'pending', count(*) filter (where status = 'pending'),
    'paidByCurrency', coalesce((
      select jsonb_object_agg(revenue.currency, revenue.amount)
      from (
        select currency, sum(total) as amount
        from public.store_orders
        where payment_status = 'paid' and status <> 'cancelled'
        group by currency
      ) as revenue
    ), '{}'::jsonb)
  )
  from public.store_orders;
$$;
revoke all on function public.studio_store_order_summary() from public;
grant execute on function public.studio_store_order_summary() to authenticated;

;
