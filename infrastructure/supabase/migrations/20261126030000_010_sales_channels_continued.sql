
-- ============================================================================
-- Zerocraft Platform — Migration 010
-- Sales Channels schema continued: product listings, sync jobs, webhooks, orders.
--
-- Dependencies:
--   Migration 009: sales_channels schema, channels, channel_installations, channel_settings
--   Migration 007: stores
--   Migration 003: organizations and organization RBAC
--
-- Security:
--   * RLS enabled on all tables
--   * Direct DML blocked for authenticated; writes via SECURITY DEFINER RPCs
--   * SELECT restricted to active organization members
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 4. product_listings — maps Maara products to external channel products
-- ----------------------------------------------------------------------------

create table sales_channels.product_listings (
  id uuid not null default gen_random_uuid()
    constraint pk_product_listings primary key,

  organization_id uuid not null
    constraint fk_product_listings_organization_id
    references public.organizations(id)
    on delete cascade,

  store_id uuid not null
    constraint fk_product_listings_store_id
    references public.stores(id)
    on delete cascade,

  installation_id uuid not null
    constraint fk_product_listings_installation_id
    references sales_channels.channel_installations(id)
    on delete cascade,

  product_id uuid not null
    constraint ck_product_listings_product_id
    check (char_length(trim(product_id::text)) > 0),

  external_product_id text not null
    constraint ck_product_listings_external_product_id
    check (char_length(trim(external_product_id)) > 0),

  external_product_url text null,

  publication_status text not null default 'draft'
    constraint ck_product_listings_publication_status
    check (publication_status in ('draft', 'published', 'unpublished', 'error', 'syncing')),

  channel_specific_data jsonb not null default '{}'::jsonb
    constraint ck_product_listings_channel_specific_data
    check (jsonb_typeof(channel_specific_data) = 'object'),

  last_published_at timestamptz null,

  last_synced_at timestamptz null,

  last_error_code text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_product_listings_installation_external_product
    unique (installation_id, external_product_id)
);

comment on table sales_channels.product_listings is
  'Maps Maara products to external channel products.';

comment on column sales_channels.product_listings.channel_specific_data is
  'Channel-specific product data, e.g. category mappings, pricing overrides.';

alter table sales_channels.product_listings enable row level security;

create index idx_product_listings_organization_id on sales_channels.product_listings(organization_id);
create index idx_product_listings_store_id on sales_channels.product_listings(store_id);
create index idx_product_listings_installation_id on sales_channels.product_listings(installation_id);
create index idx_product_listings_product_id on sales_channels.product_listings(product_id);
create index idx_product_listings_publication_status on sales_channels.product_listings(publication_status);

-- Members of the organization can view their product listings.
create policy "product_listings_select_member"
on sales_channels.product_listings
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; listings are created via secure RPC.
create policy "product_listings_insert_blocked"
on sales_channels.product_listings
for insert
to authenticated
with check (false);

create policy "product_listings_update_blocked"
on sales_channels.product_listings
for update
to authenticated
using (false);

create policy "product_listings_delete_blocked"
on sales_channels.product_listings
for delete
to authenticated
using (false);

create trigger trg_product_listings_updated_at
before update on sales_channels.product_listings
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 5. product_listing_variants — maps Maara product variants to channel variants
-- ----------------------------------------------------------------------------

create table sales_channels.product_listing_variants (
  id uuid not null default gen_random_uuid()
    constraint pk_product_listing_variants primary key,

  product_listing_id uuid not null
    constraint fk_product_listing_variants_product_listing_id
    references sales_channels.product_listings(id)
    on delete cascade,

  product_variant_id uuid not null
    constraint ck_product_listing_variants_product_variant_id
    check (char_length(trim(product_variant_id::text)) > 0),

  external_variant_id text null,

  external_sku text null,

  external_inventory_item_id text null,

  sync_status text not null default 'pending'
    constraint ck_product_listing_variants_sync_status
    check (sync_status in ('pending', 'synced', 'error', 'syncing')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_product_listing_variants_listing_variant
    unique (product_listing_id, product_variant_id)
);

comment on table sales_channels.product_listing_variants is
  'Maps Maara product variants to external channel variants.';

alter table sales_channels.product_listing_variants enable row level security;

create index idx_product_listing_variants_listing_id on sales_channels.product_listing_variants(product_listing_id);
create index idx_product_listing_variants_variant_id on sales_channels.product_listing_variants(product_variant_id);
create index idx_product_listing_variants_sync_status on sales_channels.product_listing_variants(sync_status);

-- Members of the organization can view their product listing variants.
create policy "product_listing_variants_select_member"
on sales_channels.product_listing_variants
for select
to authenticated
using (
  product_listing_id in (
    select pl.id
    from sales_channels.product_listings pl
    where pl.organization_id in (select private.current_org_ids())
  )
);

-- Direct writes are blocked.
create policy "product_listing_variants_insert_blocked"
on sales_channels.product_listing_variants
for insert
to authenticated
with check (false);

create policy "product_listing_variants_update_blocked"
on sales_channels.product_listing_variants
for update
to authenticated
using (false);

create policy "product_listing_variants_delete_blocked"
on sales_channels.product_listing_variants
for delete
to authenticated
using (false);

create trigger trg_product_listing_variants_updated_at
before update on sales_channels.product_listing_variants
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 6. sync_jobs — central background job tracking
-- ----------------------------------------------------------------------------

create table sales_channels.sync_jobs (
  id uuid not null default gen_random_uuid()
    constraint pk_sync_jobs primary key,

  organization_id uuid not null
    constraint fk_sync_jobs_organization_id
    references public.organizations(id)
    on delete cascade,

  store_id uuid not null
    constraint fk_sync_jobs_store_id
    references public.stores(id)
    on delete cascade,

  installation_id uuid not null
    constraint fk_sync_jobs_installation_id
    references sales_channels.channel_installations(id)
    on delete cascade,

  job_type text not null
    constraint ck_sync_jobs_job_type
    check (job_type in ('publish_product', 'update_product', 'unpublish_product', 'sync_inventory', 'import_orders', 'validate_connection')),

  resource_type text not null
    constraint ck_sync_jobs_resource_type
    check (resource_type in ('product', 'product_variant', 'order', 'inventory', 'connection')),

  resource_id uuid not null,

  idempotency_key text not null
    constraint ck_sync_jobs_idempotency_key
    check (char_length(trim(idempotency_key)) > 0),

  payload jsonb not null default '{}'::jsonb
    constraint ck_sync_jobs_payload
    check (jsonb_typeof(payload) = 'object'),

  status text not null default 'pending'
    constraint ck_sync_jobs_status
    check (status in ('pending', 'processing', 'completed', 'failed', 'retry_scheduled', 'cancelled')),

  attempts int not null default 0
    constraint ck_sync_jobs_attempts
    check (attempts >= 0),

  max_attempts int not null default 3
    constraint ck_sync_jobs_max_attempts
    check (max_attempts >= 1),

  scheduled_at timestamptz not null default now(),

  started_at timestamptz null,

  completed_at timestamptz null,

  last_error_code text null,

  last_error_message text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_sync_jobs_idempotency_key
    unique (idempotency_key)
);

comment on table sales_channels.sync_jobs is
  'Central background job tracking. Idempotency key prevents duplicate execution.';

comment on column sales_channels.sync_jobs.payload is
  'Job parameters. Never store OAuth tokens or credentials here.';

alter table sales_channels.sync_jobs enable row level security;

create index idx_sync_jobs_organization_id on sales_channels.sync_jobs(organization_id);
create index idx_sync_jobs_store_id on sales_channels.sync_jobs(store_id);
create index idx_sync_jobs_installation_id on sales_channels.sync_jobs(installation_id);
create index idx_sync_jobs_status on sales_channels.sync_jobs(status);
create index idx_sync_jobs_scheduled_at on sales_channels.sync_jobs(scheduled_at);
create index idx_sync_jobs_idempotency_key on sales_channels.sync_jobs(idempotency_key);

-- Members of the organization can view their sync jobs.
create policy "sync_jobs_select_member"
on sales_channels.sync_jobs
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; jobs are created via secure RPC.
create policy "sync_jobs_insert_blocked"
on sales_channels.sync_jobs
for insert
to authenticated
with check (false);

create policy "sync_jobs_update_blocked"
on sales_channels.sync_jobs
for update
to authenticated
using (false);

create policy "sync_jobs_delete_blocked"
on sales_channels.sync_jobs
for delete
to authenticated
using (false);

create trigger trg_sync_jobs_updated_at
before update on sales_channels.sync_jobs
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 7. sync_logs — sanitized sync history
-- ----------------------------------------------------------------------------

create table sales_channels.sync_logs (
  id uuid not null default gen_random_uuid()
    constraint pk_sync_logs primary key,

  organization_id uuid not null
    constraint fk_sync_logs_organization_id
    references public.organizations(id)
    on delete cascade,

  store_id uuid not null
    constraint fk_sync_logs_store_id
    references public.stores(id)
    on delete cascade,

  installation_id uuid not null
    constraint fk_sync_logs_installation_id
    references sales_channels.channel_installations(id)
    on delete cascade,

  job_id uuid null
    constraint fk_sync_logs_job_id
    references sales_channels.sync_jobs(id)
    on delete set null,

  event_type text not null
    constraint ck_sync_logs_event_type
    check (event_type in ('start', 'progress', 'success', 'error', 'retry', 'complete')),

  resource_type text not null
    constraint ck_sync_logs_resource_type
    check (resource_type in ('product', 'product_variant', 'order', 'inventory', 'connection')),

  resource_id uuid not null,

  status text not null
    constraint ck_sync_logs_status
    check (status in ('success', 'error', 'warning', 'info')),

  message text not null,

  sanitized_metadata jsonb not null default '{}'::jsonb
    constraint ck_sync_logs_sanitized_metadata
    check (jsonb_typeof(sanitized_metadata) = 'object'),

  created_at timestamptz not null default now()
);

comment on table sales_channels.sync_logs is
  'Record sanitized sync history. Never store OAuth tokens, secrets, passwords or sensitive customer data here.';

alter table sales_channels.sync_logs enable row level security;

create index idx_sync_logs_organization_id on sales_channels.sync_logs(organization_id);
create index idx_sync_logs_installation_id on sales_channels.sync_logs(installation_id);
create index idx_sync_logs_job_id on sales_channels.sync_logs(job_id);
create index idx_sync_logs_created_at on sales_channels.sync_logs(created_at);

-- Members of the organization can view their sync logs.
create policy "sync_logs_select_member"
on sales_channels.sync_logs
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; logs are written via secure RPC by the worker.
create policy "sync_logs_insert_blocked"
on sales_channels.sync_logs
for insert
to authenticated
with check (false);

create policy "sync_logs_update_blocked"
on sales_channels.sync_logs
for update
to authenticated
using (false);

create policy "sync_logs_delete_blocked"
on sales_channels.sync_logs
for delete
to authenticated
using (false);


-- ----------------------------------------------------------------------------
-- 8. webhook_events — provider webhook processing
-- ----------------------------------------------------------------------------

create table sales_channels.webhook_events (
  id uuid not null default gen_random_uuid()
    constraint pk_webhook_events primary key,

  installation_id uuid not null
    constraint fk_webhook_events_installation_id
    references sales_channels.channel_installations(id)
    on delete cascade,

  provider_key text not null
    constraint ck_webhook_events_provider_key
    check (char_length(trim(provider_key)) between 1 and 100),

  external_event_id text not null
    constraint ck_webhook_events_external_event_id
    check (char_length(trim(external_event_id)) > 0),

  event_type text not null
    constraint ck_webhook_events_event_type
    check (char_length(trim(event_type)) between 1 and 200),

  signature_verified boolean not null default false,

  processing_status text not null default 'pending'
    constraint ck_webhook_events_processing_status
    check (processing_status in ('pending', 'processed', 'failed', 'skipped')),

  received_at timestamptz not null default now(),

  processed_at timestamptz null,

  error_code text null,

  sanitized_metadata jsonb not null default '{}'::jsonb
    constraint ck_webhook_events_sanitized_metadata
    check (jsonb_typeof(sanitized_metadata) = 'object'),

  constraint uq_webhook_events_provider_event
    unique (provider_key, external_event_id)
);

comment on table sales_channels.webhook_events is
  'Provider webhook processing. Duplicate webhook prevention via unique provider event.';

comment on column sales_channels.webhook_events.sanitized_metadata is
  'Sanitized webhook payload. Never store sensitive data here.';

alter table sales_channels.webhook_events enable row level security;

create index idx_webhook_events_installation_id on sales_channels.webhook_events(installation_id);
create index idx_webhook_events_provider_key on sales_channels.webhook_events(provider_key);
create index idx_webhook_events_processing_status on sales_channels.webhook_events(processing_status);
create index idx_webhook_events_received_at on sales_channels.webhook_events(received_at);

-- Members of the organization can view their webhook events.
create policy "webhook_events_select_member"
on sales_channels.webhook_events
for select
to authenticated
using (
  installation_id in (
    select ci.id
    from sales_channels.channel_installations ci
    where ci.organization_id in (select private.current_org_ids())
  )
);

-- Direct writes are blocked; webhooks are processed via secure RPC.
create policy "webhook_events_insert_blocked"
on sales_channels.webhook_events
for insert
to authenticated
with check (false);

create policy "webhook_events_update_blocked"
on sales_channels.webhook_events
for update
to authenticated
using (false);

create policy "webhook_events_delete_blocked"
on sales_channels.webhook_events
for delete
to authenticated
using (false);


-- ----------------------------------------------------------------------------
-- 9. external_orders — maps external provider orders to Maara orders
-- ----------------------------------------------------------------------------

create table sales_channels.external_orders (
  id uuid not null default gen_random_uuid()
    constraint pk_external_orders primary key,

  organization_id uuid not null
    constraint fk_external_orders_organization_id
    references public.organizations(id)
    on delete cascade,

  store_id uuid not null
    constraint fk_external_orders_store_id
    references public.stores(id)
    on delete cascade,

  installation_id uuid not null
    constraint fk_external_orders_installation_id
    references sales_channels.channel_installations(id)
    on delete cascade,

  external_order_id text not null
    constraint ck_external_orders_external_order_id
    check (char_length(trim(external_order_id)) > 0),

  external_order_number text null,

  order_id uuid null
    constraint ck_external_orders_order_id
    check (char_length(trim(order_id::text)) > 0),

  external_status text not null
    constraint ck_external_orders_external_status
    check (char_length(trim(external_status)) between 1 and 100),

  sync_status text not null default 'pending'
    constraint ck_external_orders_sync_status
    check (sync_status in ('pending', 'imported', 'error', 'syncing')),

  imported_at timestamptz null,

  last_synced_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_external_orders_installation_external_order
    unique (installation_id, external_order_id)
);

comment on table sales_channels.external_orders is
  'Maps external provider orders to Maara orders. order_id references public.orders when available.';

alter table sales_channels.external_orders enable row level security;

create index idx_external_orders_organization_id on sales_channels.external_orders(organization_id);
create index idx_external_orders_store_id on sales_channels.external_orders(store_id);
create index idx_external_orders_installation_id on sales_channels.external_orders(installation_id);
create index idx_external_orders_order_id on sales_channels.external_orders(order_id);
create index idx_external_orders_sync_status on sales_channels.external_orders(sync_status);

-- Members of the organization can view their external orders.
create policy "external_orders_select_member"
on sales_channels.external_orders
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; orders are imported via secure RPC.
create policy "external_orders_insert_blocked"
on sales_channels.external_orders
for insert
to authenticated
with check (false);

create policy "external_orders_update_blocked"
on sales_channels.external_orders
for update
to authenticated
using (false);

create policy "external_orders_delete_blocked"
on sales_channels.external_orders
for delete
to authenticated
using (false);

create trigger trg_external_orders_updated_at
before update on sales_channels.external_orders
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 10. inventory_sync_events — tracks inventory synchronization
-- ----------------------------------------------------------------------------

create table sales_channels.inventory_sync_events (
  id uuid not null default gen_random_uuid()
    constraint pk_inventory_sync_events primary key,

  organization_id uuid not null
    constraint fk_inventory_sync_events_organization_id
    references public.organizations(id)
    on delete cascade,

  store_id uuid not null
    constraint fk_inventory_sync_events_store_id
    references public.stores(id)
    on delete cascade,

  installation_id uuid not null
    constraint fk_inventory_sync_events_installation_id
    references sales_channels.channel_installations(id)
    on delete cascade,

  product_id uuid not null
    constraint ck_inventory_sync_events_product_id
    check (char_length(trim(product_id::text)) > 0),

  product_variant_id uuid not null
    constraint ck_inventory_sync_events_product_variant_id
    check (char_length(trim(product_variant_id::text)) > 0),

  external_inventory_item_id text not null
    constraint ck_inventory_sync_events_external_inventory_item_id
    check (char_length(trim(external_inventory_item_id)) > 0),

  previous_quantity int not null,

  new_quantity int not null
    constraint ck_inventory_sync_events_new_quantity
    check (new_quantity >= 0),

  sync_status text not null default 'pending'
    constraint ck_inventory_sync_events_sync_status
    check (sync_status in ('pending', 'synced', 'error', 'syncing')),

  source text not null
    constraint ck_inventory_sync_events_source
    check (source in ('maara', 'external', 'webhook')),

  idempotency_key text not null
    constraint ck_inventory_sync_events_idempotency_key
    check (char_length(trim(idempotency_key)) > 0),

  processed_at timestamptz null,

  created_at timestamptz not null default now(),

  constraint uq_inventory_sync_events_idempotency_key
    unique (idempotency_key)
);

comment on table sales_channels.inventory_sync_events is
  'Tracks inventory synchronization. Prevents sync loops and duplicate quantity updates.';

alter table sales_channels.inventory_sync_events enable row level security;

create index idx_inventory_sync_events_organization_id on sales_channels.inventory_sync_events(organization_id);
create index idx_inventory_sync_events_installation_id on sales_channels.inventory_sync_events(installation_id);
create index idx_inventory_sync_events_product_id on sales_channels.inventory_sync_events(product_id);
create index idx_inventory_sync_events_sync_status on sales_channels.inventory_sync_events(sync_status);
create index idx_inventory_sync_events_idempotency_key on sales_channels.inventory_sync_events(idempotency_key);

-- Members of the organization can view their inventory sync events.
create policy "inventory_sync_events_select_member"
on sales_channels.inventory_sync_events
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; events are written via secure RPC by the worker.
create policy "inventory_sync_events_insert_blocked"
on sales_channels.inventory_sync_events
for insert
to authenticated
with check (false);

create policy "inventory_sync_events_update_blocked"
on sales_channels.inventory_sync_events
for update
to authenticated
using (false);

create policy "inventory_sync_events_delete_blocked"
on sales_channels.inventory_sync_events
for delete
to authenticated
using (false);


-- Grant SELECT on sales_channels tables to authenticated (RLS policies restrict rows).
grant select on sales_channels.product_listings to authenticated;
grant select on sales_channels.product_listing_variants to authenticated;
grant select on sales_channels.sync_jobs to authenticated;
grant select on sales_channels.sync_logs to authenticated;
grant select on sales_channels.webhook_events to authenticated;
grant select on sales_channels.external_orders to authenticated;
grant select on sales_channels.inventory_sync_events to authenticated;


-- ============================================================================
-- End of Migration 010 (sales_channels schema continued)
-- ============================================================================
