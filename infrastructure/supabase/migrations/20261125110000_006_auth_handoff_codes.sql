
-- ============================================================================
-- Zerocraft Platform — Migration 006
-- Accounts-to-Admin auth handoff codes.
--
-- One-time, time-bound, PKCE-bound codes used to hand a verified accounts
-- session over to the admin application without ever placing a token in a
-- browser URL. Rows are inserted and consumed exclusively by the service-role
-- admin client, which bypasses RLS; public access is blocked by policy.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Handoff codes table
-- ----------------------------------------------------------------------------

create table public.auth_handoff_codes (
  id uuid not null default gen_random_uuid()
    constraint pk_auth_handoff_codes primary key,

  code_hash text not null,
  user_id uuid not null
    constraint fk_auth_handoff_codes_user_id
    references auth.users(id)
    on delete cascade,

  email text not null,
  target_origin text not null,
  return_path text not null,
  code_challenge text not null,

  expires_at timestamptz not null,
  consumed_at timestamptz null,

  created_at timestamptz not null default now(),

  constraint uq_auth_handoff_codes_code_hash unique (code_hash)
);

comment on table public.auth_handoff_codes is
  'Single-use, time-bound, PKCE-bound codes for cross-origin auth handoffs.';

comment on column public.auth_handoff_codes.code_hash is
  'SHA-256 hash of the single-use authorization code. Plaintext codes are never stored.';
comment on column public.auth_handoff_codes.code_challenge is
  'PKCE code challenge the redeeming client must prove possession of.';
comment on column public.auth_handoff_codes.consumed_at is
  'Set when the code is redeemed; a consumed code cannot be reused.';


create index idx_auth_handoff_codes_user_id
  on public.auth_handoff_codes(user_id);

create index idx_auth_handoff_codes_expires_at
  on public.auth_handoff_codes(expires_at);


-- ----------------------------------------------------------------------------
-- 2. Row-level security
-- ----------------------------------------------------------------------------

alter table public.auth_handoff_codes enable row level security;

create policy "auth_handoff_codes_select_blocked"
on public.auth_handoff_codes
for select
to authenticated
using (false);

create policy "auth_handoff_codes_insert_blocked"
on public.auth_handoff_codes
for insert
to authenticated
with check (false);

create policy "auth_handoff_codes_update_blocked"
on public.auth_handoff_codes
for update
to authenticated
using (false);

create policy "auth_handoff_codes_delete_blocked"
on public.auth_handoff_codes
for delete
to authenticated
using (false);


-- ============================================================================
-- End of Migration 006
-- ============================================================================
