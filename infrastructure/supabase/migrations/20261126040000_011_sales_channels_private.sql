
-- ============================================================================
-- Zerocraft Platform — Migration 011
-- Sales Channels private schema (sales_channels_private)
--
-- Dependencies:
--   Migration 009: sales_channels schema operational tables
--   Migration 010: sales_channels schema continued tables
--
-- Security:
--   * sales_channels_private is NOT exposed through Supabase Data API
--   * No access granted to authenticated — only service_role and backend code
--   * RLS enabled but with restrictive policies (service_role bypasses RLS)
--   * All sensitive data is encrypted at rest
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Revoke all access to sales_channels_private from non-service roles
-- ----------------------------------------------------------------------------

revoke all on schema sales_channels_private from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 1. channel_credentials — encrypted OAuth credentials per installation
-- ----------------------------------------------------------------------------

create table sales_channels_private.channel_credentials (
  id uuid not null default gen_random_uuid()
    constraint pk_channel_credentials primary key,

  installation_id uuid not null
    constraint fk_channel_credentials_installation_id
    references sales_channels.channel_installations(id)
    on delete cascade,

  encrypted_access_token text not null
    constraint ck_channel_credentials_encrypted_access_token
    check (char_length(trim(encrypted_access_token)) > 0),

  encrypted_refresh_token text null,

  token_expires_at timestamptz null,

  encryption_key_version int not null default 1
    constraint ck_channel_credentials_encryption_key_version
    check (encryption_key_version >= 1),

  credential_status text not null default 'active'
    constraint ck_channel_credentials_credential_status
    check (credential_status in ('active', 'expired', 'revoked', 'error')),

  last_refreshed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_channel_credentials_installation
    unique (installation_id)
);

comment on table sales_channels_private.channel_credentials is
  'Server-side encrypted OAuth credentials. Never expose to browser clients.';

comment on column sales_channels_private.channel_credentials.encrypted_access_token is
  'Encrypted OAuth access token. Never store plaintext.';

comment on column sales_channels_private.channel_credentials.encrypted_refresh_token is
  'Encrypted OAuth refresh token. Never store plaintext.';

alter table sales_channels_private.channel_credentials enable row level security;

create index idx_channel_credentials_installation_id on sales_channels_private.channel_credentials(installation_id);
create index idx_channel_credentials_credential_status on sales_channels_private.channel_credentials(credential_status);

-- No authenticated access — only service_role can read/write via backend RPCs.
create policy "channel_credentials_select_blocked"
on sales_channels_private.channel_credentials
for select
to authenticated
using (false);

create policy "channel_credentials_insert_blocked"
on sales_channels_private.channel_credentials
for insert
to authenticated
with check (false);

create policy "channel_credentials_update_blocked"
on sales_channels_private.channel_credentials
for update
to authenticated
using (false);

create policy "channel_credentials_delete_blocked"
on sales_channels_private.channel_credentials
for delete
to authenticated
using (false);

create trigger trg_channel_credentials_updated_at
before update on sales_channels_private.channel_credentials
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 2. webhook_secrets — encrypted provider webhook verification secrets
-- ----------------------------------------------------------------------------

create table sales_channels_private.webhook_secrets (
  id uuid not null default gen_random_uuid()
    constraint pk_webhook_secrets primary key,

  installation_id uuid not null
    constraint fk_webhook_secrets_installation_id
    references sales_channels.channel_installations(id)
    on delete cascade,

  provider_key text not null
    constraint ck_webhook_secrets_provider_key
    check (char_length(trim(provider_key)) between 1 and 100),

  encrypted_webhook_secret text not null
    constraint ck_webhook_secrets_encrypted_webhook_secret
    check (char_length(trim(encrypted_webhook_secret)) > 0),

  encryption_key_version int not null default 1
    constraint ck_webhook_secrets_encryption_key_version
    check (encryption_key_version >= 1),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_webhook_secrets_installation_provider
    unique (installation_id, provider_key)
);

comment on table sales_channels_private.webhook_secrets is
  'Encrypted provider webhook verification secrets. Restricted to trusted backend processing.';

comment on column sales_channels_private.webhook_secrets.encrypted_webhook_secret is
  'Encrypted webhook verification secret. Never store plaintext.';

alter table sales_channels_private.webhook_secrets enable row level security;

create index idx_webhook_secrets_installation_id on sales_channels_private.webhook_secrets(installation_id);
create index idx_webhook_secrets_provider_key on sales_channels_private.webhook_secrets(provider_key);

-- No authenticated access — only service_role can read/write via backend RPCs.
create policy "webhook_secrets_select_blocked"
on sales_channels_private.webhook_secrets
for select
to authenticated
using (false);

create policy "webhook_secrets_insert_blocked"
on sales_channels_private.webhook_secrets
for insert
to authenticated
with check (false);

create policy "webhook_secrets_update_blocked"
on sales_channels_private.webhook_secrets
for update
to authenticated
using (false);

create policy "webhook_secrets_delete_blocked"
on sales_channels_private.webhook_secrets
for delete
to authenticated
using (false);

create trigger trg_webhook_secrets_updated_at
before update on sales_channels_private.webhook_secrets
for each row
execute function public.updated_at_trigger();


-- ============================================================================
-- End of Migration 011 (sales_channels_private schema)
-- ============================================================================
