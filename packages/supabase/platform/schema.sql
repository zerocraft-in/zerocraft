-- ZeroCraft central platform. Run only on the dedicated zerocraftstudio project.
create schema if not exists platform_private;
revoke all on schema platform_private from public,anon;
grant usage on schema platform_private to authenticated,service_role;
create table public.accounts(id uuid primary key references auth.users(id) on delete cascade,display_name text not null default '',status text not null default 'active' check(status in ('active','suspended')),created_at timestamptz not null default now());
create table public.stores(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),name text not null check(length(trim(name)) between 1 and 100),slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),status text not null default 'setup' check(status in ('setup','ready','suspended','archived')),settings jsonb not null default '{}',setup_completed_at timestamptz,published_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.store_members(store_id uuid not null references public.stores(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,role text not null check(role in ('owner','manager','staff')),status text not null default 'active' check(status in ('active','suspended')),tenant_user_id uuid,created_at timestamptz not null default now(),primary key(store_id,user_id));
create index members_user_idx on public.store_members(user_id,store_id);
create table public.connections(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id) on delete cascade,provider text not null check(provider in ('supabase','r2')),project_ref text,status text not null default 'pending' check(status in ('pending','connected','verifying','ready','failed','revoked')),details jsonb not null default '{}',encrypted_config text,version integer not null default 1,verified_at timestamptz,updated_at timestamptz not null default now(),unique(store_id,provider));
create unique index connections_project_unique on public.connections(project_ref) where provider='supabase' and project_ref is not null;
create table public.oauth_grants(store_id uuid not null references public.stores(id) on delete cascade,provider text not null check(provider in ('supabase','cloudflare')),encrypted_token text not null,expires_at timestamptz,updated_at timestamptz not null default now(),primary key(store_id,provider));
create table public.oauth_attempts(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id) on delete cascade,user_id uuid not null references auth.users(id),provider text not null check(provider in ('supabase','cloudflare')),state_hash text not null unique,encrypted_verifier text not null,expires_at timestamptz not null,consumed_at timestamptz,created_at timestamptz not null default now());
create index attempts_expiry_idx on public.oauth_attempts(expires_at);
create table public.setup_steps(store_id uuid not null references public.stores(id) on delete cascade,key text not null check(key in ('basics','database','catalog','media','features','review')),status text not null default 'pending' check(status in ('pending','running','ready','failed','skipped')),evidence jsonb not null default '{}',verified_at timestamptz,primary key(store_id,key));
create table public.jobs(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id) on delete cascade,kind text not null,status text not null default 'queued' check(status in ('queued','running','ready','failed')),idempotency_key text not null unique,progress integer not null default 0 check(progress between 0 and 100),error text,lease_until timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index jobs_store_idx on public.jobs(store_id,created_at desc);
create unique index jobs_running_unique on public.jobs(store_id,kind) where status='running';
create table public.apps(id text primary key,name text not null,version text not null,permissions text[] not null default '{}',capabilities text[] not null default '{}');
create table public.installations(store_id uuid not null references public.stores(id) on delete cascade,app_id text not null references public.apps(id),version text not null,status text not null default 'installed' check(status in ('installed','ready','disconnected','uninstalled')),installed_by uuid references auth.users(id),installed_at timestamptz not null default now(),primary key(store_id,app_id));
create table public.features(store_id uuid not null references public.stores(id) on delete cascade,key text not null,enabled boolean not null default false,settings jsonb not null default '{}',primary key(store_id,key));
create table public.audit_logs(id uuid primary key default gen_random_uuid(),store_id uuid references public.stores(id) on delete set null,actor_id uuid references auth.users(id) on delete set null,action text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create index audit_store_idx on public.audit_logs(store_id,created_at desc);

create table public.store_media_assets (
  store_id uuid not null,
  storage_path text not null,
  public_url text not null,
  file_name text not null,
  folder text not null default 'Library',
  alt_text text not null default '',
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check(size_bytes>=0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(store_id,storage_path)
);

create function platform_private.member(target uuid,manage boolean default false) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.store_members m join public.accounts a on a.id=m.user_id join public.stores s on s.id=m.store_id where m.store_id=target and m.user_id=(select auth.uid()) and m.status='active' and a.status='active' and s.status not in ('suspended','archived') and (not manage or m.role in ('owner','manager'))); $$;
revoke all on function platform_private.member(uuid,boolean) from public,anon;
grant execute on function platform_private.member(uuid,boolean) to authenticated;
create function platform_private.create_account() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.accounts(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing; return new; end $$;
revoke all on function platform_private.create_account() from public,anon,authenticated;
create trigger platform_create_account after insert on auth.users for each row execute function platform_private.create_account();
insert into public.accounts(id,display_name) select id,coalesce(raw_user_meta_data->>'full_name','') from auth.users on conflict(id) do nothing;

create function public.create_store(store_name text,store_slug text,basic_settings jsonb default '{}') returns uuid language plpgsql security definer set search_path='' as $$ declare result uuid; begin if (select auth.uid()) is null or not exists(select 1 from public.accounts where id=(select auth.uid()) and status='active') then raise exception 'Sign in to create a store' using errcode='42501'; end if; if length(trim(store_name)) not between 1 and 100 or store_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(store_slug)>80 or jsonb_typeof(basic_settings)<>'object' then raise exception 'Invalid store details'; end if; insert into public.stores(owner_id,name,slug,settings) values((select auth.uid()),trim(store_name),store_slug,basic_settings) returning id into result; insert into public.store_members(store_id,user_id,role) values(result,(select auth.uid()),'owner'); insert into public.setup_steps(store_id,key,status,verified_at) select result,k,case when k='basics' then 'ready' else 'pending' end,case when k='basics' then now() else null end from unnest(array['basics','database','catalog','media','features','review']) k; insert into public.audit_logs(store_id,actor_id,action) values(result,(select auth.uid()),'store.created'); return result; end $$;
revoke all on function public.create_store(text,text,jsonb) from public,anon;
grant execute on function public.create_store(text,text,jsonb) to authenticated;
insert into public.apps values('media-manager','Media Manager','1.0.0',array['files.read','files.write','storage.connect'],array['files.manage','media.upload']) on conflict(id) do nothing;

do $$ declare t text; begin foreach t in array array['accounts','stores','store_members','connections','oauth_grants','oauth_attempts','setup_steps','jobs','apps','installations','features','audit_logs','store_media_assets'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from public,anon,authenticated',t); execute format('grant all on public.%I to service_role',t); end loop; end $$;
grant select on public.accounts,public.stores,public.store_members,public.setup_steps,public.jobs,public.apps,public.installations,public.features,public.audit_logs to authenticated;
grant select(id,store_id,provider,project_ref,status,details,version,verified_at,updated_at) on public.connections to authenticated;
create policy account_read on public.accounts for select to authenticated using(id=(select auth.uid()));
create policy stores_read on public.stores for select to authenticated using(platform_private.member(id));
create policy members_read on public.store_members for select to authenticated using(user_id=(select auth.uid()) or platform_private.member(store_id,true));
create policy connections_read on public.connections for select to authenticated using(platform_private.member(store_id,true));
create policy steps_read on public.setup_steps for select to authenticated using(platform_private.member(store_id));
create policy jobs_read on public.jobs for select to authenticated using(platform_private.member(store_id,true));
create policy apps_read on public.apps for select to authenticated using(true);
create policy installations_read on public.installations for select to authenticated using(platform_private.member(store_id));
create policy features_read on public.features for select to authenticated using(platform_private.member(store_id));
create policy audit_read on public.audit_logs for select to authenticated using(platform_private.member(store_id,true));
notify pgrst,'reload schema';
