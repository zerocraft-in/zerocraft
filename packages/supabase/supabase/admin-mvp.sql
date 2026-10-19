-- Apply once in the configured Supabase project before enabling the store/admin MVP.
-- Existing sample data is not imported. Run with a database administrator role.

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
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'fulfilling', 'shipped', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_orders_created_at_idx on public.store_orders (created_at desc);
create index if not exists store_orders_status_idx on public.store_orders (status);
alter table public.store_orders enable row level security;

-- The function owner bypasses RLS so the membership lookup does not recurse.
create or replace function public.is_studio_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'manager', 'staff')
  );
$$;
create or replace function public.is_studio_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_studio_member() from public;
revoke all on function public.is_studio_admin() from public;
grant execute on function public.is_studio_member() to anon, authenticated;
grant execute on function public.is_studio_admin() to authenticated;

-- A signed-in customer is not automatically a studio staff member.
drop policy if exists "Profiles read" on public.profiles;
drop policy if exists "Profiles insert" on public.profiles;
drop policy if exists "Profiles update" on public.profiles;
create policy "Profiles read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_studio_member());
create policy "Profiles insert" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and (
    role = 'client' or (role = 'admin' and (select auth.jwt() ->> 'email') = 'ivd.maran@gmail.com')
  ));
create policy "Profiles update" on public.profiles for update to authenticated
  using (public.is_studio_admin()) with check (public.is_studio_admin());

-- New sign-ins start as customers until an admin explicitly grants a studio role.
create or replace function public.create_studio_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, new.email, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    case when new.email = 'ivd.maran@gmail.com' then 'admin'::public.user_role else 'client'::public.user_role end
  ) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists studio_profile_created on auth.users;
create trigger studio_profile_created after insert on auth.users for each row execute function public.create_studio_profile();
insert into public.profiles (id, email, full_name, role)
select id, email, coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1)),
  case when email = 'ivd.maran@gmail.com' then 'admin'::public.user_role else 'client'::public.user_role end
from auth.users where email is not null
on conflict (id) do nothing;

drop policy if exists "Studio orders read" on public.store_orders;
drop policy if exists "Studio orders update" on public.store_orders;
create policy "Studio orders read" on public.store_orders for select to authenticated using (public.is_studio_member());
create policy "Studio orders update" on public.store_orders for update to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());
grant select on public.store_orders to authenticated;
revoke update on public.store_orders from authenticated;
grant update (status, payment_status, updated_at) on public.store_orders to authenticated;

-- Remove the old blanket policies that granted every authenticated account full access.
drop policy if exists "All Access for Studio Users on Blogs" on public.blogs;
drop policy if exists "All Access for Studio Users on Works" on public.works;
drop policy if exists "All Access for Studio Users on Reviews" on public.reviews;
drop policy if exists "All Access for Studio Users on Clients" on public.clients;
drop policy if exists "All Access for Studio Users on Appointments" on public.appointments;
drop policy if exists "Public or Authenticated Read Blogs" on public.blogs;
drop policy if exists "Public Read Works" on public.works;
drop policy if exists "Public Read Approved Reviews" on public.reviews;
drop policy if exists "Studio Staff Read Clients" on public.clients;
drop policy if exists "Studio Staff Read Appointments" on public.appointments;

create policy "Public published blogs" on public.blogs for select using (status = 'published' or public.is_studio_member());
create policy "Studio manage blogs" on public.blogs for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Public works" on public.works for select using (true);
create policy "Studio manage works" on public.works for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Public approved reviews" on public.reviews for select using (status = 'approved' or public.is_studio_member());
create policy "Studio manage reviews" on public.reviews for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage clients" on public.clients for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage appointments" on public.appointments for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
