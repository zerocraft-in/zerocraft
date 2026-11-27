-- User security controls used by the Shopify-style Users settings.
alter table public.profiles
  add column if not exists secure_sign_in_required boolean not null default false;

grant update (secure_sign_in_required) on public.profiles to authenticated;
