-- Store-only schema snapshot. Fresh Supabase projects only; never apply over an existing store.
-- No products, orders, customers, credentials, or Studio data are included.
begin;
set local check_function_bodies=false;
create type public.user_role as enum ('admin','manager','staff','client');

create table public.content_records (id uuid default gen_random_uuid() not null,
kind text not null,
title text not null,
handle text not null,
status text default 'draft'::text not null,
parent_id uuid,
data jsonb default '{}'::jsonb not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.menu_items (id uuid default gen_random_uuid() not null,
menu_id uuid not null,
label text not null,
href text not null,
"position" integer default 0 not null,
visible boolean default true not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.menus (id uuid default gen_random_uuid() not null,
name text not null,
location text default 'header'::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.pages (id uuid default gen_random_uuid() not null,
title text not null,
slug text not null,
excerpt text default ''::text not null,
content text default ''::text not null,
status text default 'draft'::text not null,
seo_title text default ''::text not null,
seo_description text default ''::text not null,
featured_image_url text default ''::text not null,
author_id uuid,
published_at timestamp with time zone,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.store_settings (setting_key text not null,
value jsonb default '{}'::jsonb not null,
updated_by uuid,
updated_at timestamp with time zone default now() not null);

create table public.ai_actions (id uuid default gen_random_uuid() not null,
action_type text not null,
title text not null,
description text default ''::text not null,
risk_level text default 'medium'::text not null,
status text default 'pending'::text not null,
payload jsonb default '{}'::jsonb not null,
result jsonb default '{}'::jsonb not null,
requested_by uuid not null,
reviewed_by uuid,
review_note text default ''::text not null,
idempotency_key text not null,
requested_at timestamp with time zone default now() not null,
reviewed_at timestamp with time zone,
executed_at timestamp with time zone,
updated_at timestamp with time zone default now() not null);

create table public.automation_failure_notifications (id uuid default gen_random_uuid() not null,
run_id uuid not null,
recipient_id uuid not null,
recipient text not null,
status text default 'sending'::text not null,
last_error text,
sent_at timestamp with time zone,
created_at timestamp with time zone default now() not null);

create table public.automation_runs (id uuid default gen_random_uuid() not null,
job_name text not null,
trigger text not null,
status text not null,
started_at timestamp with time zone default now() not null,
finished_at timestamp with time zone,
active_low_stock_count integer,
error_message text,
triggered_by uuid,
created_at timestamp with time zone default now() not null,
is_test boolean default false not null);

create table public.automation_settings (job_name text not null,
enabled boolean default true not null,
email_alerts_enabled boolean default true not null,
recipient_roles text[] default ARRAY['admin'::text, 'manager'::text] not null,
cooldown_minutes integer default 60 not null,
updated_by uuid,
updated_at timestamp with time zone default now() not null);

create table public.email_events (id uuid default gen_random_uuid() not null,
provider text default 'smtp'::text not null,
kind text not null,
recipient text not null,
subject text default ''::text not null,
status text default 'queued'::text not null,
attempts integer default 0 not null,
message_id text,
last_error text,
next_attempt_at timestamp with time zone,
sent_at timestamp with time zone,
metadata jsonb default '{}'::jsonb not null,
created_by uuid,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
is_test boolean default false not null);

create table public.features (feature_key text not null,
display_name text not null,
description text default ''::text not null,
enabled boolean default true not null,
updated_by uuid,
updated_at timestamp with time zone default now() not null);

create table public.email_audit_logs (id uuid default gen_random_uuid() not null,
actor_id uuid,
action text not null,
outcome text not null,
gmail_message_id text,
idempotency_key uuid,
detail_code text,
created_at timestamp with time zone default now() not null);

create table public.email_accounts (connection_id text not null,
email_address text not null,
encrypted_refresh_token text not null,
connected_by uuid not null,
connected_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.email_rate_limits (actor_id uuid not null,
action text not null,
window_start timestamp with time zone not null,
request_count integer default 0 not null);

create table public.email_sends (id uuid default gen_random_uuid() not null,
actor_id uuid not null,
idempotency_key uuid not null,
status text not null,
gmail_message_id text,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.integrations (provider text not null,
display_name text not null,
status text default 'connected'::text not null,
encrypted_credentials text,
last_verified_at timestamp with time zone,
updated_by uuid,
updated_at timestamp with time zone default now() not null,
enabled boolean default true not null,
last_error text,
metadata jsonb default '{}'::jsonb not null);

create table public.stock_alerts (id uuid default gen_random_uuid() not null,
location_id uuid not null,
variant_id uuid not null,
last_on_hand integer default 0 not null,
last_reserved integer default 0 not null,
last_reorder_point integer default 0 not null,
status text default 'active'::text not null,
first_detected_at timestamp with time zone default now() not null,
last_detected_at timestamp with time zone default now() not null,
resolved_at timestamp with time zone);

create table public.notification_preferences (user_id uuid not null,
automation_failure_enabled boolean default true not null,
low_stock_enabled boolean default true not null,
updated_at timestamp with time zone default now() not null);

create table public.report_runs (id uuid default gen_random_uuid() not null,
job_name text default 'studio-weekly-notification-report'::text not null,
status text default 'queued'::text not null,
scheduled_for timestamp with time zone default now() not null,
period_start timestamp with time zone default (now() - '7 days'::interval) not null,
period_end timestamp with time zone default now() not null,
started_at timestamp with time zone,
finished_at timestamp with time zone,
recipient_count integer default 0 not null,
notification_count integer default 0 not null,
error_message text,
triggered_by uuid,
created_at timestamp with time zone default now() not null);

create table public.report_settings (job_name text default 'studio-weekly-notification-report'::text not null,
enabled boolean default false not null,
weekday integer default 1 not null,
send_hour_utc integer default 9 not null,
recipient_roles text[] default ARRAY['admin'::text] not null,
updated_by uuid,
updated_at timestamp with time zone default now() not null);

create table public.permissions (key text not null,
label text not null,
description text default ''::text not null,
group_name text not null,
sort_order integer default 0 not null,
created_at timestamp with time zone default now() not null);

create table public.role_permissions (role text not null,
permission_key text not null,
allowed boolean default false not null,
updated_at timestamp with time zone default now() not null);

create table public.staff_sessions (id uuid not null,
user_id uuid not null,
device_label text default 'Unknown device'::text not null,
device_type text default 'desktop'::text not null,
browser text default 'Unknown browser'::text not null,
operating_system text default 'Unknown OS'::text not null,
user_agent text default ''::text not null,
ip_address text,
first_seen_at timestamp with time zone default now() not null,
last_seen_at timestamp with time zone default now() not null,
revoked_at timestamp with time zone,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.health_acknowledgements (id uuid default gen_random_uuid() not null,
failure_type text not null,
failure_id uuid not null,
status text default 'acknowledged'::text not null,
notes text,
acknowledged_by uuid,
resolved_by uuid,
acknowledged_at timestamp with time zone default now() not null,
resolved_at timestamp with time zone,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.health_incidents (id uuid default gen_random_uuid() not null,
fingerprint text not null,
status text default 'open'::text not null,
severity text not null,
component text not null,
first_seen_at timestamp with time zone default now() not null,
last_seen_at timestamp with time zone default now() not null,
resolved_at timestamp with time zone,
latest_message text default ''::text not null,
notification_sent_at timestamp with time zone,
notification_attempts integer default 0 not null,
last_error text,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.health_checks (id uuid default gen_random_uuid() not null,
overall text not null,
checks jsonb default '[]'::jsonb not null,
summary jsonb default '{}'::jsonb not null,
trigger text default 'dashboard'::text not null,
triggered_by uuid,
started_at timestamp with time zone default now() not null,
finished_at timestamp with time zone default now() not null,
created_at timestamp with time zone default now() not null);

create table public.health_settings (id boolean default true not null,
enabled boolean default true not null,
uptime_target numeric(5,2) default 99.00 not null,
failure_rate_max numeric(5,2) default 5.00 not null,
mttr_max_minutes integer default 60 not null,
notify_admins boolean default true not null,
updated_by uuid,
updated_at timestamp with time zone default now() not null);

create table public.staff_invites (id uuid default gen_random_uuid() not null,
email text not null,
role user_role default 'staff'::user_role not null,
auth_user_id uuid,
invited_by uuid not null,
status text default 'pending'::text not null,
expires_at timestamp with time zone default (now() + '7 days'::interval) not null,
created_at timestamp with time zone default now() not null,
accepted_at timestamp with time zone,
revoked_at timestamp with time zone);

create table public.staff_permissions (user_id uuid not null,
permission_key text not null,
allowed boolean not null,
updated_by uuid,
updated_at timestamp with time zone default now() not null);

create table public.customer_addresses (id uuid default gen_random_uuid() not null,
user_id uuid not null,
label text default 'Home'::text not null,
full_name text not null,
phone text not null,
line1 text not null,
line2 text default ''::text not null,
city text not null,
state text not null,
postal_code text not null,
country text default 'IN'::text not null,
is_default boolean default false not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.notifications (id uuid default gen_random_uuid() not null,
title text not null,
message text not null,
category text default 'system'::text not null,
type text default 'info'::text not null,
read boolean default false not null,
link text,
created_at timestamp with time zone default now(),
recipient_id uuid,
dedupe_key text,
metadata jsonb default '{}'::jsonb not null,
workspace text default 'studio'::text not null,
event_key text);

create table public.accounts (id uuid not null,
email text not null,
full_name text not null,
avatar_url text,
role user_role default 'client'::user_role not null,
phone text,
created_at timestamp with time zone default now(),
updated_at timestamp with time zone default now(),
is_active boolean default true not null);

create table public.audit_logs (id uuid default gen_random_uuid() not null,
actor_id uuid,
action text not null,
entity_type text not null,
entity_id uuid,
metadata jsonb default '{}'::jsonb not null,
created_at timestamp with time zone default now() not null);

create table public.bundle_items (bundle_id uuid not null,
product_id uuid not null,
quantity integer default 1 not null,
sort_order integer default 0 not null,
created_at timestamp with time zone default now() not null);

create table public.bundles (id uuid default gen_random_uuid() not null,
slug text not null,
name text not null,
description text default ''::text not null,
discount_percent numeric(5,2) default 15 not null,
image_url text default ''::text not null,
status text default 'draft'::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.cart_items (id uuid default gen_random_uuid() not null,
cart_id uuid not null,
variant_id uuid not null,
quantity integer not null,
customization jsonb default '{}'::jsonb not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.carts (id uuid default gen_random_uuid() not null,
user_id uuid,
guest_token text,
currency text default 'INR'::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.categories (id uuid default gen_random_uuid() not null,
name text not null,
slug text not null,
description text default ''::text not null,
image_url text default ''::text not null,
is_active boolean default true not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
deleted_at timestamp with time zone,
purge_after timestamp with time zone,
deleted_from_is_active boolean);

create table public.checkout_requests (id uuid default gen_random_uuid() not null,
customer_id uuid not null,
idempotency_key text not null,
request_fingerprint text not null,
order_id uuid,
created_at timestamp with time zone default now() not null,
completed_at timestamp with time zone);

create table public.collection_products (collection_id uuid not null,
product_id uuid not null,
sort_order integer default 0 not null,
created_at timestamp with time zone default now() not null);

create table public.collections (id uuid default gen_random_uuid() not null,
name text not null,
slug text not null,
tagline text default ''::text not null,
description text default ''::text not null,
image_url text default ''::text not null,
status text default 'draft'::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.customization_templates (id uuid default gen_random_uuid() not null,
product_id uuid,
name text not null,
slug text not null,
schema jsonb default '{}'::jsonb not null,
preview_url text default ''::text not null,
status text default 'draft'::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.customizations (id uuid default gen_random_uuid() not null,
customer_id uuid not null,
product_id uuid not null,
template_id uuid not null,
object_path text not null,
mime_type text not null,
byte_size bigint not null,
status text default 'ready'::text not null,
created_at timestamp with time zone default now() not null,
consumed_at timestamp with time zone);

create table public.inventory_levels (location_id uuid not null,
variant_id uuid not null,
on_hand integer default 0 not null,
reserved integer default 0 not null,
reorder_point integer default 0 not null,
updated_at timestamp with time zone default now() not null);

create table public.locations (id uuid default gen_random_uuid() not null,
name text not null,
code text not null,
is_active boolean default true not null,
created_at timestamp with time zone default now() not null);

create table public.inventory_movements (id uuid default gen_random_uuid() not null,
location_id uuid not null,
variant_id uuid,
quantity_delta integer not null,
reason text not null,
reference_type text,
reference_id uuid,
created_by uuid,
created_at timestamp with time zone default now() not null);

create table public.inventory_reservations (id uuid default gen_random_uuid() not null,
order_id uuid not null,
order_item_id uuid,
location_id uuid not null,
variant_id uuid not null,
quantity integer not null,
status text default 'reserved'::text not null,
created_at timestamp with time zone default now() not null,
released_at timestamp with time zone,
fulfilled_at timestamp with time zone,
expires_at timestamp with time zone,
release_reason text);

create table public.transfer_items (id uuid default gen_random_uuid() not null,
transfer_id uuid not null,
variant_id uuid,
quantity integer not null);

create table public.transfers (id uuid default gen_random_uuid() not null,
transfer_number text not null,
from_location_id uuid not null,
to_location_id uuid not null,
status text default 'draft'::text not null,
notes text default ''::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.files (storage_path text not null,
public_url text not null,
file_name text not null,
folder text not null,
alt_text text default ''::text not null,
mime_type text not null,
size_bytes bigint default 0 not null,
created_by uuid,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.order_items (id uuid default gen_random_uuid() not null,
order_id uuid not null,
product_id uuid,
variant_id uuid,
title text not null,
sku text default ''::text not null,
quantity integer not null,
unit_price_paise bigint,
currency text default 'INR'::text not null,
customization jsonb default '{}'::jsonb not null,
created_at timestamp with time zone default now() not null,
unit_price_minor bigint,
currency_code text);

create table public.orders (id uuid default gen_random_uuid() not null,
order_number text not null,
customer_name text not null,
customer_email text not null,
customer_phone text not null,
shipping_address jsonb not null,
items jsonb not null,
delivery_method text not null,
coupon_code text,
subtotal numeric(12,2) not null,
discount numeric(12,2) default 0 not null,
shipping_fee numeric(12,2) default 0 not null,
tax numeric(12,2) default 0 not null,
total numeric(12,2) not null,
currency text default 'USD'::text not null,
status text default 'pending'::text not null,
payment_status text default 'unpaid'::text not null,
payment_method text default 'cod'::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
customer_id uuid,
idempotency_key text,
payment_attempt_id uuid);

create table public.payment_attempts (id uuid default gen_random_uuid() not null,
order_id uuid not null,
customer_id uuid not null,
method_code text not null,
amount numeric(12,2) not null,
currency text not null,
idempotency_key text not null,
status text default 'awaiting_customer'::text not null,
provider_reference text default ''::text not null,
metadata jsonb default '{}'::jsonb not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.payment_methods (id uuid default gen_random_uuid() not null,
method_code text not null,
display_name text not null,
enabled boolean default false not null,
merchant_name text default ''::text not null,
upi_vpa text default ''::text not null,
upi_qr_image_url text default ''::text not null,
bank_name text default ''::text not null,
bank_account_name text default ''::text not null,
bank_account_number text default ''::text not null,
bank_ifsc text default ''::text not null,
instructions text default ''::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.payment_submissions (id uuid default gen_random_uuid() not null,
payment_attempt_id uuid not null,
order_id uuid not null,
customer_id uuid not null,
utr text not null,
amount numeric(12,2) not null,
paid_at timestamp with time zone,
evidence_path text default ''::text not null,
note text default ''::text not null,
status text default 'pending'::text not null,
reviewed_by uuid,
reviewed_at timestamp with time zone,
review_note text default ''::text not null,
created_at timestamp with time zone default now() not null);

create table public.digital_files (id uuid default gen_random_uuid() not null,
product_id uuid not null,
variant_id uuid,
storage_path text not null,
file_name text not null,
mime_type text not null,
size_bytes bigint not null,
sort_order integer default 0 not null,
created_at timestamp with time zone default now() not null);

create table public.product_media (id uuid default gen_random_uuid() not null,
product_id uuid not null,
variant_id uuid,
storage_path text not null,
public_url text not null,
alt_text text default ''::text not null,
media_type text default 'image'::text not null,
sort_order integer default 0 not null,
is_primary boolean default false not null,
created_at timestamp with time zone default now() not null);

create table public.variants (id uuid default gen_random_uuid() not null,
product_id uuid not null,
label text not null,
sku text not null,
options jsonb default '{}'::jsonb not null,
price numeric(12,2) not null,
stock integer,
is_active boolean default true not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
price_paise bigint,
currency_code text default 'INR'::text not null);

create table public.products (id uuid default gen_random_uuid() not null,
category_id uuid,
title text not null,
slug text not null,
description text default ''::text not null,
product_type text default 'physical'::text not null,
status text default 'draft'::text not null,
sku text not null,
price numeric(12,2) default 0 not null,
compare_at_price numeric(12,2),
currency text default 'USD'::text not null,
stock integer,
image_url text default ''::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
price_paise bigint,
compare_at_price_paise bigint,
currency_code text default 'INR'::text not null,
write_version bigint default 1 not null,
subcategory_id uuid,
design_origin text default 'original_zerocraft'::text not null,
rights_status text default 'not_applicable'::text not null,
digital_delivery jsonb default '{"mode": "instant", "download_limit": 0, "link_expiry_hours": 0}'::jsonb not null,
deleted_at timestamp with time zone,
purge_after timestamp with time zone,
deleted_from_status text);

create table public.purchase_order_items (id uuid default gen_random_uuid() not null,
purchase_order_id uuid not null,
variant_id uuid,
quantity_ordered integer not null,
quantity_received integer default 0 not null,
unit_cost_paise bigint default 0 not null,
created_at timestamp with time zone default now() not null);

create table public.purchase_orders (id uuid default gen_random_uuid() not null,
order_number text not null,
supplier_id uuid not null,
location_id uuid not null,
status text default 'draft'::text not null,
expected_at date,
notes text default ''::text not null,
currency text default 'INR'::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.deleted_files (storage_path text not null,
file_name text not null,
folder text not null,
mime_type text not null,
size_bytes bigint default 0 not null,
deleted_at timestamp with time zone default now() not null,
purge_after timestamp with time zone not null,
deleted_by uuid);

create table public.subcategories (id uuid default gen_random_uuid() not null,
category_id uuid not null,
name text not null,
slug text not null,
description text default ''::text not null,
image_url text default ''::text not null,
sort_order integer default 0 not null,
is_active boolean default true not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
deleted_at timestamp with time zone,
purge_after timestamp with time zone,
deleted_from_is_active boolean);

create table public.suppliers (id uuid default gen_random_uuid() not null,
name text not null,
email text default ''::text not null,
phone text default ''::text not null,
is_active boolean default true not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.option_values (id uuid default gen_random_uuid() not null,
option_id uuid not null,
value text not null,
swatch_hex text,
sort_order integer default 0 not null);

create table public.product_options (id uuid default gen_random_uuid() not null,
product_id uuid not null,
name text not null,
sort_order integer default 0 not null);

create table public.variant_option_values (variant_id uuid not null,
option_value_id uuid not null);

create table public.wishlist_items (wishlist_id uuid not null,
product_id uuid not null,
created_at timestamp with time zone default now() not null);

create table public.wishlists (id uuid default gen_random_uuid() not null,
user_id uuid not null,
created_at timestamp with time zone default now() not null);

create table public.banners (id uuid default gen_random_uuid() not null,
title text not null,
eyebrow text default ''::text not null,
body text default ''::text not null,
image_url text default ''::text not null,
href text default '/store/shop'::text not null,
sort_order integer default 0 not null,
is_published boolean default false not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

create table public.storefront_sections (id uuid default gen_random_uuid() not null,
section_key text not null,
title text default ''::text not null,
payload jsonb default '{}'::jsonb not null,
sort_order integer default 0 not null,
is_published boolean default false not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null);

CREATE OR REPLACE FUNCTION public.cancel_order_with_reservations(p_order_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer; v_status text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  select status into v_status from public.orders where id = p_order_id for update;
  if v_status is null then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order unavailable'; end if;
  if v_status = 'cancelled' then return 0; end if;
  if v_status not in ('pending', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order cannot be cancelled after fulfilment begins';
  end if;
  n := public.release_order_reservations(p_order_id, 'cancelled');
  update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id;
  return n;
end; $function$
;

CREATE OR REPLACE FUNCTION public.adjust_inventory(p_location_id uuid, p_variant_id uuid, p_on_hand integer, p_reorder_point integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_current public.inventory_levels%rowtype;
  v_delta integer;
begin
  if not public.is_member() then
    raise exception using errcode = '42501', message = 'Studio access required.';
  end if;

  if p_on_hand < 0 or p_reorder_point < 0 then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  select * into v_current
  from public.inventory_levels
  where location_id = p_location_id and variant_id = p_variant_id
  for update;

  if not found then
    v_current.on_hand := 0;
    v_current.reserved := 0;
  end if;

  if p_on_hand < coalesce(v_current.reserved, 0) then
    raise exception using errcode = 'P0001', message = 'INVENTORY_RESERVED';
  end if;

  v_delta := p_on_hand - coalesce(v_current.on_hand, 0);

  insert into public.inventory_levels(
    location_id, variant_id, on_hand, reserved, reorder_point, updated_at
  ) values (
    p_location_id, p_variant_id, p_on_hand, coalesce(v_current.reserved, 0), p_reorder_point, now()
  )
  on conflict (location_id, variant_id) do update set
    on_hand = excluded.on_hand,
    reserved = excluded.reserved,
    reorder_point = excluded.reorder_point,
    updated_at = excluded.updated_at;

  if v_delta <> 0 then
    insert into public.inventory_movements(
      location_id, variant_id, quantity_delta, reason, created_by
    ) values (
      p_location_id, p_variant_id, v_delta, 'commerce_adjustment', (select auth.uid())
    );
  end if;

  return jsonb_build_object(
    'location_id', p_location_id,
    'variant_id', p_variant_id,
    'on_hand', p_on_hand,
    'reserved', coalesce(v_current.reserved, 0),
    'reorder_point', p_reorder_point,
    'updated_at', now()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_products_to_category(p_category_id uuid, p_subcategory_id uuid, p_product_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_product_count integer;
begin
  if not public.is_member() then
    raise exception using errcode = '42501', message = 'Studio access required.';
  end if;

  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception using errcode = 'P0002', message = 'CATEGORY_NOT_FOUND';
  end if;

  if p_subcategory_id is not null and not exists (
    select 1
    from public.subcategories
    where id = p_subcategory_id and category_id = p_category_id
  ) then
    raise exception using errcode = 'P0002', message = 'SUBCATEGORY_NOT_FOUND';
  end if;

  select count(*) into v_product_count
  from public.products
  where id = any(coalesce(p_product_ids, '{}'::uuid[]));

  if v_product_count <> coalesce(cardinality(p_product_ids), 0) then
    raise exception using errcode = 'P0002', message = 'PRODUCT_NOT_FOUND';
  end if;

  if p_subcategory_id is null then
    update public.products
    set category_id = null, subcategory_id = null, updated_at = now()
    where category_id = p_category_id
      and id <> all(coalesce(p_product_ids, '{}'::uuid[]));
  else
    update public.products
    set subcategory_id = null, updated_at = now()
    where subcategory_id = p_subcategory_id
      and id <> all(coalesce(p_product_ids, '{}'::uuid[]));
  end if;

  update public.products
  set category_id = p_category_id,
      subcategory_id = p_subcategory_id,
      updated_at = now()
  where id = any(coalesce(p_product_ids, '{}'::uuid[]));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.emit_notification(p_title text, p_message text, p_category text, p_type text, p_link text, p_event_key text, p_workspace text DEFAULT 'studio'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  recipient record;
  inserted_count integer := 0;
begin
  for recipient in
    select id
    from public.accounts
    where role::text in ('admin', 'manager', 'staff')
      and coalesce(is_active, true)
  loop
    insert into public.notifications (
      title, message, category, type, read, link, recipient_id,
      dedupe_key, event_key, workspace, metadata
    ) values (
      left(coalesce(p_title, 'Workspace update'), 180),
      left(coalesce(p_message, ''), 1000),
      coalesce(nullif(p_category, ''), 'system'),
      case when p_type in ('info', 'success', 'warning', 'error') then p_type else 'info' end,
      false,
      p_link,
      recipient.id,
      case when p_event_key is null then null else p_event_key || ':' || recipient.id::text end,
      case when p_event_key is null then null else p_event_key || ':' || recipient.id::text end,
      coalesce(nullif(p_workspace, ''), 'studio'),
      coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (event_key) where event_key is not null do update set
      title = excluded.title,
      message = excluded.message,
      type = excluded.type,
      category = excluded.category,
      link = excluded.link,
      workspace = excluded.workspace,
      metadata = excluded.metadata,
      read = false;
    inserted_count := inserted_count + 1;
  end loop;
  return inserted_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_automation_health()
 RETURNS TABLE(job_name text, schedule text, active boolean, last_run_at timestamp with time zone, last_run_status text, last_run_message text, next_run_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
  select
    job.jobname::text,
    job.schedule::text,
    job.active,
    latest.start_time,
    latest.status::text,
    latest.return_message,
    case
      when job.active then date_trunc('hour', now()) +
        ((floor(extract(minute from now()) / 15)::int + 1) * interval '15 minutes')
      else null
    end
  from cron.job job
  left join lateral (
    select details.start_time, details.status, details.return_message
    from cron.job_run_details details
    where details.jobid = job.jobid
    order by details.start_time desc
    limit 1
  ) latest on true
  where job.jobname = 'studio-low-stock-alerts';
$function$
;

CREATE OR REPLACE FUNCTION public.get_notification_analytics()
 RETURNS TABLE(user_id uuid, email text, full_name text, total_count bigint, unread_count bigint, read_count bigint, last_notification_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  return query
    select p.id, p.email, p.full_name,
      count(n.id)::bigint,
      count(n.id) filter (where n.read = false)::bigint,
      count(n.id) filter (where n.read = true)::bigint,
      max(n.created_at)
    from public.accounts p
    left join public.notifications n on n.recipient_id = p.id
    where p.role::text in ('admin', 'manager', 'staff')
    group by p.id, p.email, p.full_name
    order by count(n.id) filter (where n.read = false) desc, p.email;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.gmail_consume_rate_limit(p_action text, p_limit integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := (select auth.uid());
  v_window timestamptz;
  v_count integer;
begin
  if v_actor is null or not public.is_admin()
     or p_action not in ('send', 'read', 'list', 'modify', 'draft', 'connect', 'attachment')
     or p_limit < 1 or p_window_seconds < 1 then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.email_rate_limits (actor_id, action, window_start, request_count)
  values (v_actor, p_action, v_window, 1)
  on conflict (actor_id, action, window_start) do update
    set request_count = public.email_rate_limits.request_count + 1
    where public.email_rate_limits.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.accounts p
    left join public.staff_permissions up
      on up.user_id = p.id and up.permission_key = p_permission
    left join public.role_permissions rp
      on rp.role = p.role::text and rp.permission_key = p_permission
    where p.id = (select auth.uid())
      and p.is_active
      and p.role::text in ('admin', 'manager', 'staff')
      and coalesce(up.allowed, rp.allowed, false)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.notify_record_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb; record_id text; record_name text; status_value text; event_key text;
begin
 r := to_jsonb(new);
 record_id := coalesce(r->>'id',r->>'order_number','unknown');
 record_name := coalesce(r->>'order_number',r->>'title',record_id);
 status_value := coalesce(r->>'status','updated');
 if tg_table_name='orders' then
  if tg_op='UPDATE' and new.status is not distinct from old.status and new.payment_status is not distinct from old.payment_status then return new; end if;
  event_key := 'order:'||record_id||':'||status_value||':'||coalesce(r->>'payment_status','');
  perform public.emit_notification('Order '||record_name||' '||status_value,'Order status: '||status_value,case when r->>'payment_status'='paid' then 'payments' else 'orders' end,'info','/store/orders',event_key,'store',r);
 elsif tg_table_name='payment_submissions' then
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
  perform public.emit_notification('Payment proof '||status_value,'A manual payment submission needs attention.','payments','info','/store/orders','payment-submission:'||record_id||':'||status_value,'store',r);
 elsif tg_table_name='inventory_levels' then
  if coalesce((r->>'on_hand')::integer,0)-coalesce((r->>'reserved')::integer,0)>coalesce((r->>'reorder_point')::integer,0) then return new; end if;
  perform public.emit_notification('Low stock requires attention','Inventory is at or below its reorder point.','inventory','warning','/store/inventory','inventory-low:'||coalesce(r->>'location_id','')||':'||coalesce(r->>'variant_id',''),'store',r);
 end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.permissions_for_current_user()
 RETURNS TABLE(permission_key text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select sp.key
  from public.permissions sp
  where public.has_permission(sp.key)
  order by sp.sort_order, sp.key;
$function$
;

CREATE OR REPLACE FUNCTION public.purge_expired_products()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  purged_count integer := 0;
begin
  delete from public.inventory_reservations
  where variant_id in (
    select v.id from public.variants v
    join public.products p on p.id = v.product_id
    where p.purge_after <= now()
  );

  delete from public.cart_items
  where variant_id in (
    select v.id from public.variants v
    join public.products p on p.id = v.product_id
    where p.purge_after <= now()
  );

  delete from public.bundle_items
  where product_id in (select id from public.products where purge_after <= now());

  delete from public.products where purge_after <= now();
  get diagnostics purged_count = row_count;
  return purged_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.purge_expired_store_categories()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  purged_count integer := 0;
  removed_categories integer := 0;
begin
  update public.products
  set category_id = null,
      subcategory_id = null,
      updated_at = now()
  where subcategory_id in (
    select id from public.subcategories
    where deleted_at is not null and purge_after <= now()
  );
  delete from public.subcategories
  where deleted_at is not null and purge_after <= now();
  get diagnostics purged_count = row_count;

  update public.products
  set category_id = null,
      subcategory_id = null,
      updated_at = now()
  where category_id in (
    select id from public.categories
    where deleted_at is not null and purge_after <= now()
  );

  delete from public.subcategories
  where category_id in (
    select id from public.categories
    where deleted_at is not null and purge_after <= now()
  );
  delete from public.categories
  where deleted_at is not null and purge_after <= now();
  get diagnostics removed_categories = row_count;

  return purged_count + removed_categories;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_weekly_notification_report()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  settings_row record;
  run_id uuid;
  current_weekday integer := extract(dow from now() at time zone 'utc');
  current_hour integer := extract(hour from now() at time zone 'utc');
begin
  select * into settings_row from public.report_settings
  where job_name = 'studio-weekly-notification-report';
  if not found or not settings_row.enabled
    or settings_row.weekday <> current_weekday
    or settings_row.send_hour_utc <> current_hour then
    return null;
  end if;

  if exists (
    select 1 from public.report_runs
    where job_name = settings_row.job_name
      and scheduled_for > now() - interval '20 hours'
      and status in ('queued', 'running', 'succeeded')
  ) then return null; end if;

  insert into public.report_runs (job_name, scheduled_for, period_start, period_end)
  values (settings_row.job_name, now(), now() - interval '7 days', now())
  returning id into run_id;
  return run_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.receive_inventory_transfer(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_transfer public.transfers%rowtype; v_item record; v_source public.inventory_levels%rowtype; v_total integer := 0;
begin
  if not public.is_member() then raise exception using errcode='42501',message='Studio access required.'; end if;
  select * into v_transfer from public.transfers where id=p_transfer_id for update;
  if not found then raise exception using errcode='P0002',message='Transfer not found.'; end if;
  if v_transfer.status <> 'in_transit' then raise exception using errcode='P0001',message='Only in-transit transfers can be received.'; end if;
  for v_item in select * from public.transfer_items where transfer_id=p_transfer_id loop
    select * into v_source from public.inventory_levels where location_id=v_transfer.from_location_id and variant_id=v_item.variant_id for update;
    if not found or v_source.on_hand-v_source.reserved < v_item.quantity then raise exception using errcode='P0001',message='Insufficient available stock for transfer.'; end if;
    update public.inventory_levels set on_hand=on_hand-v_item.quantity,updated_at=now() where location_id=v_transfer.from_location_id and variant_id=v_item.variant_id;
    insert into public.inventory_levels(location_id,variant_id,on_hand,reserved,reorder_point) values(v_transfer.to_location_id,v_item.variant_id,v_item.quantity,0,0)
      on conflict(location_id,variant_id) do update set on_hand=public.inventory_levels.on_hand+excluded.on_hand,updated_at=now();
    insert into public.inventory_movements(location_id,variant_id,quantity_delta,reason,reference_type,reference_id,created_by) values(v_transfer.from_location_id,v_item.variant_id,-v_item.quantity,'inventory_transfer_out','inventory_transfer',p_transfer_id,auth.uid()),(v_transfer.to_location_id,v_item.variant_id,v_item.quantity,'inventory_transfer_in','inventory_transfer',p_transfer_id,auth.uid());
    v_total := v_total + v_item.quantity;
  end loop;
  update public.transfers set status='received',updated_at=now() where id=p_transfer_id;
  return jsonb_build_object('transfer_id',p_transfer_id,'status','received','units',v_total);
end; $function$
;

CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_order_id uuid, p_receipts jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.purchase_orders%rowtype;
  v_receipt record;
  v_item public.purchase_order_items%rowtype;
  v_level public.inventory_levels%rowtype;
  v_total integer;
  v_received integer;
begin
  if not public.is_member() then
    raise exception using errcode = '42501', message = 'Studio access required.';
  end if;
  if jsonb_typeof(coalesce(p_receipts, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Receipts must be an array.';
  end if;
  select * into v_order from public.purchase_orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Purchase order not found.'; end if;
  if v_order.status in ('cancelled','received') then
    raise exception using errcode = 'P0001', message = 'This purchase order cannot receive more stock.';
  end if;
  for v_receipt in select * from jsonb_to_recordset(p_receipts) as x(item_id uuid, quantity integer) loop
    if v_receipt.quantity is null or v_receipt.quantity <= 0 then
      raise exception using errcode = '22023', message = 'Received quantity must be positive.';
    end if;
    select * into v_item from public.purchase_order_items where id = v_receipt.item_id and purchase_order_id = p_order_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'Purchase order item not found.'; end if;
    if v_item.quantity_received + v_receipt.quantity > v_item.quantity_ordered then
      raise exception using errcode = '22023', message = 'Received quantity cannot exceed ordered quantity.';
    end if;
    update public.purchase_order_items set quantity_received = quantity_received + v_receipt.quantity where id = v_item.id;
    select * into v_level from public.inventory_levels where location_id = v_order.location_id and variant_id = v_item.variant_id for update;
    if found then
      update public.inventory_levels set on_hand = on_hand + v_receipt.quantity, updated_at = now() where location_id = v_order.location_id and variant_id = v_item.variant_id;
    else
      insert into public.inventory_levels(location_id, variant_id, on_hand, reserved, reorder_point) values (v_order.location_id, v_item.variant_id, v_receipt.quantity, 0, 0);
    end if;
    insert into public.inventory_movements(location_id, variant_id, quantity_delta, reason, reference_type, reference_id, created_by)
      values (v_order.location_id, v_item.variant_id, v_receipt.quantity, 'purchase_order_receipt', 'purchase_order', p_order_id, auth.uid());
  end loop;
  select coalesce(sum(quantity_ordered), 0), coalesce(sum(quantity_received), 0) into v_total, v_received from public.purchase_order_items where purchase_order_id = p_order_id;
  update public.purchase_orders set status = case when v_received >= v_total then 'received' when v_received > 0 then 'partial' else status end, updated_at = now() where id = p_order_id;
  return jsonb_build_object('order_id', p_order_id, 'status', case when v_received >= v_total then 'received' when v_received > 0 then 'partial' else v_order.status end, 'received_units', v_received, 'ordered_units', v_total);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.replace_product_variants(p_product_id uuid, p_variants jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not public.is_member() then raise exception 'Studio access required.'; end if;
  if jsonb_typeof(p_variants) <> 'array' then raise exception 'Variants must be an array.'; end if;
  delete from public.variants where product_id = p_product_id;
  insert into public.variants (product_id, label, sku, options, price, stock, is_active)
  select p_product_id, v.label, v.sku, coalesce(v.options, '{}'::jsonb), v.price, v.stock, coalesce(v.is_active, true)
  from jsonb_to_recordset(p_variants) as v(label text, sku text, options jsonb, price numeric, stock integer, is_active boolean);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_store_category(p_category_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  category_record public.categories%rowtype;
begin
  if not public.has_permission('catalog.manage') then
    raise exception 'Catalog manage permission required' using errcode = '42501';
  end if;

  select * into category_record
  from public.categories
  where id = p_category_id and deleted_at is not null
  for update;

  if not found then
    raise exception 'Deleted category not found' using errcode = 'P0002';
  end if;
  if category_record.purge_after <= now() then
    raise exception 'The restore window has expired' using errcode = '22023';
  end if;

  update public.categories
  set is_active = deleted_from_is_active,
      deleted_from_is_active = null,
      deleted_at = null,
      purge_after = null,
      updated_at = now()
  where id = p_category_id;

  update public.subcategories
  set is_active = deleted_from_is_active,
      deleted_from_is_active = null,
      deleted_at = null,
      purge_after = null,
      updated_at = now()
  where category_id = p_category_id
    and deleted_at = category_record.deleted_at
    and purge_after > now();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_store_subcategory(p_subcategory_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  subcategory_record public.subcategories%rowtype;
begin
  if not public.has_permission('catalog.manage') then
    raise exception 'Catalog manage permission required' using errcode = '42501';
  end if;

  select * into subcategory_record
  from public.subcategories
  where id = p_subcategory_id and deleted_at is not null
  for update;

  if not found then
    raise exception 'Deleted subcategory not found' using errcode = 'P0002';
  end if;
  if subcategory_record.purge_after <= now() then
    raise exception 'The restore window has expired' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.categories
    where id = subcategory_record.category_id and deleted_at is not null
  ) then
    raise exception 'Restore the parent category first' using errcode = '22023';
  end if;

  update public.subcategories
  set is_active = deleted_from_is_active,
      deleted_from_is_active = null,
      deleted_at = null,
      purge_after = null,
      updated_at = now()
  where id = p_subcategory_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.save_product(p_action text, p_product_id uuid, p_expected_version bigint, p_product jsonb, p_variants jsonb, p_options jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_product_id uuid := p_product_id;
  v_expected_version bigint;
  v_new_version bigint;
  v_product record;
  v_row record;
  v_option record;
  v_value record;
  v_variant record;
  v_option_id uuid;
  v_option_value_id uuid;
  v_variant_id uuid;
  v_currency text;
  v_product_type text;
  v_product_price numeric;
  v_product_price_paise bigint;
  v_product_compare_paise bigint;
  v_variant_price numeric;
  v_variant_price_paise bigint;
  v_seen_ids uuid[] := '{}'::uuid[];
  v_seen_skus text[] := '{}'::text[];
  v_seen_combinations text[] := '{}'::text[];
  v_seen_option_names text[] := '{}'::text[];
  v_existing_ids uuid[] := '{}'::uuid[];
  v_seen_locations uuid[];
  v_normalized_options jsonb;
  v_option_name text;
  v_value_text text;
  v_signature text;
  v_value_list text[];
  v_existing boolean;
  v_inventory jsonb;
begin
  if not public.is_member() then
    raise exception using errcode = '42501', message = 'FORBIDDEN: Studio access required.';
  end if;
  if p_action not in ('create', 'edit') then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: action must be create or edit.';
  end if;
  if jsonb_typeof(p_product) <> 'object'
     or jsonb_typeof(p_variants) <> 'array'
     or jsonb_typeof(coalesce(p_options, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid JSON payload.';
  end if;
  if octet_length(p_product::text) > 20000
     or octet_length(p_variants::text) > 200000
     or octet_length(coalesce(p_options, '[]'::jsonb)::text) > 50000
     or jsonb_array_length(p_variants) > 60
     or jsonb_array_length(coalesce(p_options, '[]'::jsonb)) > 20 then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: payload exceeds limits.';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_product) as key
    where key not in ('category_id','title','slug','description','product_type','status',
      'sku','price','compare_at_price','currency','currency_code','price_paise',
      'compare_at_price_paise','stock','image_url','collection_ids')
  ) then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported product field.';
  end if;
  for v_row in select value from jsonb_array_elements(p_variants) loop
    if jsonb_typeof(v_row.value) <> 'object'
       or exists (
         select 1 from jsonb_object_keys(v_row.value) as key
         where key not in ('id','label','sku','options','price','price_paise','stock','is_active','inventory')
       )
       or (v_row.value ? 'id' and v_row.value->>'id' is not null and v_row.value->>'id' !~ '^[0-9a-fA-F-]{36}$')
       or (v_row.value ? 'inventory' and jsonb_typeof(v_row.value->'inventory') <> 'array') then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported or malformed variant field.';
    end if;
    for v_value in select value from jsonb_array_elements(coalesce(v_row.value->'inventory','[]'::jsonb)) loop
      if jsonb_typeof(v_value.value) <> 'object'
         or exists (
           select 1 from jsonb_object_keys(v_value.value) as key
           where key not in ('location_id','on_hand','reserved','reorder_point')
         )
         or v_value.value->>'location_id' is null
         or v_value.value->>'location_id' !~ '^[0-9a-fA-F-]{36}$' then
        raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported or malformed inventory field.';
      end if;
    end loop;
  end loop;
  for v_row in select value from jsonb_array_elements(coalesce(p_options,'[]'::jsonb)) loop
    if jsonb_typeof(v_row.value) <> 'object'
       or exists (
         select 1 from jsonb_object_keys(v_row.value) as key
         where key not in ('name','option_values','swatch_hex')
       ) then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported option field.';
    end if;
  end loop;

  if p_action = 'create' then
    if p_product_id is not null or p_expected_version is not null then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: create identity/version must be null.';
    end if;
  else
    if p_product_id is null or p_expected_version is null or p_expected_version < 1 then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: edit requires expected_version.';
    end if;
    select * into v_product from public.products where id = p_product_id for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'NOT_FOUND: product not found.';
    end if;
    if v_product.write_version <> p_expected_version then
      raise exception using errcode = '40001', message = 'STALE_VERSION: product changed since load.';
    end if;
    v_expected_version := p_expected_version;
  end if;

  v_currency := upper(nullif(trim(coalesce(p_product->>'currency_code', p_product->>'currency')), ''));
  if v_currency not in ('INR','USD') then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported currency.';
  end if;
  if p_product ? 'currency' and p_product ? 'currency_code'
     and upper(p_product->>'currency') <> upper(p_product->>'currency_code') then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: contradictory currency fields.';
  end if;
  if p_product->>'title' is null or length(trim(p_product->>'title')) not between 1 and 180
     or p_product->>'slug' is null or p_product->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_product->>'sku' is null or length(trim(p_product->>'sku')) = 0
     or p_product->>'product_type' not in ('physical','digital')
     or p_product->>'status' not in ('draft','active','archived') then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid product fields.';
  end if;
  v_product_type := p_product->>'product_type';
  if p_product->>'price' is null or p_product->>'price' !~ '^(0|[0-9]+)(\.[0-9]{1,2})?$' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid product price.';
  end if;
  v_product_price := (p_product->>'price')::numeric;
  if v_product_price > 9999999999.99 then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: product price exceeds supported range.';
  end if;
  if v_currency = 'INR' then
    if p_product->>'price_paise' is null or p_product->>'price_paise' !~ '^[0-9]+$'
       or (p_product->>'price_paise')::numeric > 9223372036854775807
       or (p_product->>'price_paise')::numeric <> v_product_price * 100 then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: INR price must match integer paise.';
    end if;
    v_product_price_paise := (p_product->>'price_paise')::bigint;
    if p_product->>'compare_at_price_paise' is not null then
      if p_product->>'compare_at_price' is null
         or p_product->>'compare_at_price' !~ '^(0|[0-9]+)(\.[0-9]{1,2})?$'
         or p_product->>'compare_at_price_paise' !~ '^[0-9]+$' then
        raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid INR compare-at price.';
      end if;
      v_product_compare_paise := (p_product->>'compare_at_price_paise')::bigint;
      if v_product_compare_paise::numeric <> (p_product->>'compare_at_price')::numeric * 100
         or v_product_compare_paise < v_product_price_paise then
        raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid INR compare-at relationship.';
      end if;
    elsif p_product->>'compare_at_price' is not null then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: INR compare-at paise is required.';
    end if;
  else
    if p_product->>'price_paise' is not null or p_product->>'compare_at_price_paise' is not null then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: USD cannot contain paise fields.';
    end if;
    if p_product->>'compare_at_price' is not null
       and (p_product->>'compare_at_price' !~ '^(0|[0-9]+)(\.[0-9]{1,2})?$'
         or (p_product->>'compare_at_price')::numeric < v_product_price) then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid USD compare-at relationship.';
    end if;
  end if;
  if p_product->>'category_id' is not null and p_product->>'category_id' <> ''
     and (p_product->>'category_id' !~ '^[0-9a-fA-F-]{36}$'
       or not exists (select 1 from public.categories where id = (p_product->>'category_id')::uuid)) then
    raise exception using errcode = '23503', message = 'VALIDATION_ERROR: category is invalid.';
  end if;

  if p_action = 'create' then
    insert into public.products(
      category_id,title,slug,description,product_type,status,sku,price,compare_at_price,
      currency,currency_code,price_paise,compare_at_price_paise,stock,image_url,write_version
    ) values (
      nullif(p_product->>'category_id','')::uuid,trim(p_product->>'title'),p_product->>'slug',
      coalesce(p_product->>'description',''),v_product_type,p_product->>'status',trim(p_product->>'sku'),
      v_product_price,nullif(p_product->>'compare_at_price','')::numeric,v_currency,v_currency,
      case when v_currency='INR' then v_product_price_paise end,
      case when v_currency='INR' then v_product_compare_paise end,
      nullif(p_product->>'stock','')::integer,coalesce(p_product->>'image_url',''),1
    ) returning id,write_version into v_product_id,v_new_version;
  else
    update public.products set
      category_id=nullif(p_product->>'category_id','')::uuid,title=trim(p_product->>'title'),slug=p_product->>'slug',
      description=coalesce(p_product->>'description',''),product_type=v_product_type,status=p_product->>'status',
      sku=trim(p_product->>'sku'),price=v_product_price,compare_at_price=nullif(p_product->>'compare_at_price','')::numeric,
      currency=v_currency,currency_code=v_currency,price_paise=case when v_currency='INR' then v_product_price_paise end,
      compare_at_price_paise=case when v_currency='INR' then v_product_compare_paise end,
      stock=nullif(p_product->>'stock','')::integer,image_url=coalesce(p_product->>'image_url',''),
      write_version=write_version+1,updated_at=now()
    where id=v_product_id and write_version=v_expected_version
    returning write_version into v_new_version;
    if not found then
      raise exception using errcode = '40001', message = 'STALE_VERSION: product changed during save.';
    end if;
  end if;

  -- Product -> variant -> inventory lock order.
  for v_row in select id from public.variants where product_id=v_product_id order by id for update loop
    v_existing_ids := array_append(v_existing_ids,v_row.id);
  end loop;
  for v_row in
    select il.location_id,il.variant_id from public.inventory_levels il
    join public.variants pv on pv.id=il.variant_id
    where pv.product_id=v_product_id order by il.location_id,il.variant_id for update of il
  loop null; end loop;

  -- Explicit option declarations. Variant payloads may also derive declarations
  -- for compatibility with the current Studio JSON shape.
  for v_option in select * from jsonb_to_recordset(coalesce(p_options,'[]'::jsonb)) as x(name text,option_values jsonb,swatch_hex text) loop
    v_option_name := case when lower(trim(v_option.name))='colour' then 'color' else lower(trim(v_option.name)) end;
    if v_option_name = any(v_seen_option_names)
       or length(v_option_name) not between 1 and 80
       or jsonb_typeof(v_option.option_values)<>'array' then
      raise exception using errcode='22023',message='VALIDATION_ERROR: invalid option definition.';
    end if;
    v_seen_option_names:=array_append(v_seen_option_names,v_option_name);
    select id into v_option_id from public.product_options where product_id=v_product_id and lower(name)=v_option_name for update;
    if not found then
      insert into public.product_options(product_id,name,sort_order) values(v_product_id,v_option_name,0) returning id into v_option_id;
    end if;
    for v_value in select value from jsonb_array_elements(v_option.option_values) loop
      if jsonb_typeof(v_value.value) <> 'string' then
        raise exception using errcode='22023',message='VALIDATION_ERROR: option values must be strings.';
      end if;
      v_value_text:=trim(v_value.value #>> '{}');
      if length(v_value_text) not between 1 and 120 then
        raise exception using errcode='22023',message='VALIDATION_ERROR: invalid option value.';
      end if;
      if not exists(select 1 from public.option_values where option_id=v_option_id and lower(value)=lower(v_value_text)) then
        insert into public.option_values(option_id,value,swatch_hex,sort_order) values(v_option_id,v_value_text,v_option.swatch_hex,0);
      end if;
    end loop;
  end loop;

  for v_variant in select * from jsonb_to_recordset(p_variants) as x(
    id uuid,label text,sku text,options jsonb,price numeric,price_paise bigint,stock integer,is_active boolean,inventory jsonb
  ) loop
    v_existing := v_variant.id is not null;
    if v_existing then
      if v_variant.id=any(v_seen_ids) then
        raise exception using errcode='23505',message='CONFLICT: duplicate variant ID.';
      end if;
      if not(v_variant.id=any(v_existing_ids)) then
        raise exception using errcode='23503',message='INVALID_VARIANT: variant belongs to another product.';
      end if;
      v_seen_ids:=array_append(v_seen_ids,v_variant.id);
    end if;
    if v_variant.label is null or length(trim(v_variant.label)) not between 1 and 100
       or v_variant.sku is null or length(trim(v_variant.sku))=0 or v_variant.price is null or v_variant.price<0
       or (v_currency='INR' and v_variant.price_paise is null) or (v_currency='USD' and v_variant.price_paise is not null)
       or (v_variant.stock is not null and v_variant.stock<0) or jsonb_typeof(coalesce(v_variant.options,'{}'::jsonb))<>'object'
       or v_variant.price::text !~ '^(0|[0-9]+)(\.[0-9]{1,2})?$' then
      raise exception using errcode='22023',message='VALIDATION_ERROR: invalid variant payload.';
    end if;
    if trim(v_variant.sku)=any(v_seen_skus) then
      raise exception using errcode='23505',message='DUPLICATE_SKU: duplicate variant SKU.';
    end if;
    v_seen_skus:=array_append(v_seen_skus,trim(v_variant.sku));
    v_variant_price:=v_variant.price;
    if v_currency='INR' then
      if v_variant.price_paise<0 or v_variant.price_paise::numeric>9223372036854775807
         or v_variant.price_paise::numeric<>v_variant_price*100 then
        raise exception using errcode='22023',message='VALIDATION_ERROR: invalid INR variant paise.';
      end if;
      v_variant_price_paise:=v_variant.price_paise;
    end if;
    if v_variant_price > 9999999999.99 then
      raise exception using errcode='22023',message='VALIDATION_ERROR: variant price exceeds supported range.';
    end if;

    v_normalized_options:='{}'::jsonb; v_signature:='';
    for v_option in select key,value from jsonb_each(coalesce(v_variant.options,'{}'::jsonb)) order by lower(key),key loop
      v_option_name:=case when lower(trim(v_option.key))='colour' then 'color' else lower(trim(v_option.key)) end;
      if v_option_name=any(coalesce((select array_agg(key) from jsonb_object_keys(v_normalized_options) as key),'{}'::text[])) then
        raise exception using errcode='23505',message='CONFLICT: duplicate normalized option name.';
      end if;
      if jsonb_typeof(v_option.value)='array'
         and exists (select 1 from jsonb_array_elements(v_option.value) as item where jsonb_typeof(item.value) <> 'string') then
        raise exception using errcode='22023',message='VALIDATION_ERROR: option arrays must contain strings.';
      elsif jsonb_typeof(v_option.value)='array' then
        select array_agg(trim(value) order by lower(trim(value)),trim(value)) into v_value_list from jsonb_array_elements_text(v_option.value);
      elsif jsonb_typeof(v_option.value)='string' then
        v_value_list:=array[trim(v_option.value #>> '{}')];
      else
        raise exception using errcode='22023',message='VALIDATION_ERROR: option values must be strings or arrays.';
      end if;
      if v_value_list is null or array_length(v_value_list,1)<1 or array_length(v_value_list,1)>20
         or exists(select 1 from unnest(v_value_list) as a group by lower(a) having count(*)>1) then
        raise exception using errcode='23505',message='CONFLICT: duplicate or invalid option values.';
      end if;
      select id into v_option_id from public.product_options where product_id=v_product_id and lower(name)=v_option_name for update;
      if not found then
        insert into public.product_options(product_id,name,sort_order) values(v_product_id,v_option_name,0) returning id into v_option_id;
      end if;
      foreach v_value_text in array v_value_list loop
        if not exists(select 1 from public.option_values where option_id=v_option_id and lower(value)=lower(v_value_text)) then
          insert into public.option_values(option_id,value,sort_order) values(v_option_id,v_value_text,0) returning id into v_option_value_id;
        else
          select id into v_option_value_id from public.option_values where option_id=v_option_id and lower(value)=lower(v_value_text) order by id limit 1;
        end if;
      end loop;
      v_normalized_options:=v_normalized_options||jsonb_build_object(v_option_name,case when jsonb_typeof(v_option.value)='array' then to_jsonb(v_value_list) else to_jsonb(v_value_list[1]) end);
      v_signature:=v_signature||v_option_name||'='||array_to_string(v_value_list,'|')||';';
    end loop;
    if v_signature=any(v_seen_combinations) then
      raise exception using errcode='23505',message='CONFLICT: duplicate variant option combination.';
    end if;
    v_seen_combinations:=array_append(v_seen_combinations,v_signature);

    if v_existing then
      if jsonb_array_length(coalesce(v_variant.inventory,'[]'::jsonb))>0 then
        raise exception using errcode='22023',message='VALIDATION_ERROR: existing inventory cannot be changed here.';
      end if;
      v_variant_id:=v_variant.id;
      update public.variants set label=trim(v_variant.label),sku=trim(v_variant.sku),options=v_normalized_options,
        price=v_variant_price,price_paise=case when v_currency='INR' then v_variant_price_paise end,currency_code=v_currency,
        stock=v_variant.stock,is_active=coalesce(v_variant.is_active,true),updated_at=now()
      where id=v_variant.id and product_id=v_product_id;
    else
      insert into public.variants(product_id,label,sku,options,price,price_paise,currency_code,stock,is_active)
      values(v_product_id,trim(v_variant.label),trim(v_variant.sku),v_normalized_options,v_variant_price,
        case when v_currency='INR' then v_variant_price_paise end,v_currency,v_variant.stock,coalesce(v_variant.is_active,true))
      returning id into v_variant_id;
      -- Preserve the Phase 3H-A new-ID seen-set fix.
      v_seen_ids:=array_append(v_seen_ids,v_variant_id);
    end if;

    delete from public.variant_option_values where variant_id=v_variant_id;
    for v_option in select key,value from jsonb_each(v_normalized_options) loop
      select id into v_option_id from public.product_options where product_id=v_product_id and lower(name)=v_option.key;
      if jsonb_typeof(v_option.value)='array' then
        for v_value in select value from jsonb_array_elements_text(v_option.value) loop
          select id into v_option_value_id from public.option_values where option_id=v_option_id and lower(value)=lower(trim(v_value.value)) order by id limit 1;
          insert into public.variant_option_values(variant_id,option_value_id) values(v_variant_id,v_option_value_id);
        end loop;
      else
        select id into v_option_value_id from public.option_values where option_id=v_option_id and lower(value)=lower(trim(v_option.value #>> '{}')) order by id limit 1;
        insert into public.variant_option_values(variant_id,option_value_id) values(v_variant_id,v_option_value_id);
      end if;
    end loop;

    v_inventory:=coalesce(v_variant.inventory,'[]'::jsonb);
    if v_product_type='digital' and jsonb_array_length(v_inventory)>0 then
      raise exception using errcode='22023',message='VALIDATION_ERROR: digital variants cannot receive inventory.';
    end if;
    if not v_existing and v_product_type='physical' and jsonb_array_length(v_inventory)<1 then
      raise exception using errcode='22023',message='VALIDATION_ERROR: new physical variants require inventory.';
    end if;
    if not v_existing then
      v_seen_locations:='{}'::uuid[];
      for v_row in select * from jsonb_to_recordset(v_inventory) as x(location_id uuid,on_hand integer,reserved integer,reorder_point integer) loop
        if v_row.location_id is null or v_row.location_id=any(v_seen_locations) or v_row.on_hand is null or v_row.on_hand<0
           or coalesce(v_row.reserved,0)<>0 or coalesce(v_row.reorder_point,0)<0
           or not exists(select 1 from public.locations where id=v_row.location_id) then
          raise exception using errcode='22023',message='VALIDATION_ERROR: invalid inventory initialization.';
        end if;
        v_seen_locations:=array_append(v_seen_locations,v_row.location_id);
        insert into public.inventory_levels(location_id,variant_id,on_hand,reserved,reorder_point)
        values(v_row.location_id,v_variant_id,v_row.on_hand,0,coalesce(v_row.reorder_point,0));
      end loop;
    end if;
  end loop;

  for v_row in select id from public.variants where product_id=v_product_id and not(id=any(v_seen_ids)) order by id for update loop
    if exists(select 1 from public.inventory_levels where variant_id=v_row.id and reserved>0)
       or public.variant_has_active_reservations(v_row.id)
       or exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id
                 where oi.variant_id=v_row.id and o.status in ('pending','confirmed','fulfilling')) then
      raise exception using errcode='40001',message='INVENTORY_RESERVED: variant cannot be archived while fulfillment is active.';
    end if;
    update public.variants set is_active=false,updated_at=now() where id=v_row.id;
  end loop;

  if p_product ? 'collection_ids' then
    if jsonb_typeof(p_product->'collection_ids')<>'array' or exists(
      select 1 from jsonb_array_elements_text(p_product->'collection_ids') as collection_id
      where collection_id !~ '^[0-9a-fA-F-]{36}$' or not exists(select 1 from public.collections where id=collection_id::uuid)
    ) then
      raise exception using errcode='23503',message='VALIDATION_ERROR: invalid collection.';
    end if;
    delete from public.collection_products where product_id=v_product_id;
    insert into public.collection_products(collection_id,product_id,sort_order)
    select collection_id::uuid,v_product_id,row_number() over()-1 from jsonb_array_elements_text(p_product->'collection_ids') as collection_id;
  end if;

  return jsonb_build_object('product_id',v_product_id,'version',v_new_version,
    'variants',coalesce((select jsonb_agg(jsonb_build_object('id',id,'is_active',is_active) order by id)
      from public.variants where product_id=v_product_id),'[]'::jsonb));
exception when unique_violation then
  raise exception using errcode='23505',message='CONFLICT: duplicate slug, SKU, option, combination, or inventory key.';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_store_category(p_category_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  deleted_time timestamptz := now();
  category_record public.categories%rowtype;
begin
  if not public.has_permission('catalog.manage') then
    raise exception 'Catalog manage permission required' using errcode = '42501';
  end if;

  select * into category_record
  from public.categories
  where id = p_category_id
  for update;

  if not found then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;
  if category_record.deleted_at is not null then
    return;
  end if;

  update public.categories
  set is_active = false,
      deleted_from_is_active = is_active,
      deleted_at = deleted_time,
      purge_after = deleted_time + interval '15 days',
      updated_at = deleted_time
  where id = p_category_id;

  update public.subcategories
  set is_active = false,
      deleted_from_is_active = is_active,
      deleted_at = deleted_time,
      purge_after = deleted_time + interval '15 days',
      updated_at = deleted_time
  where category_id = p_category_id and deleted_at is null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_store_subcategory(p_subcategory_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  deleted_time timestamptz := now();
begin
  if not public.has_permission('catalog.manage') then
    raise exception 'Catalog manage permission required' using errcode = '42501';
  end if;

  update public.subcategories
  set is_active = false,
      deleted_from_is_active = is_active,
      deleted_at = deleted_time,
      purge_after = deleted_time + interval '15 days',
      updated_at = deleted_time
  where id = p_subcategory_id and deleted_at is null;

  if not found then
    if exists (select 1 from public.subcategories where id = p_subcategory_id and deleted_at is not null) then
      return;
    end if;
    raise exception 'Subcategory not found' using errcode = 'P0002';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.order_summary()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'count', count(*),
    'pending', count(*) filter (where status = 'pending'),
    'paidByCurrency', coalesce((
      select jsonb_object_agg(revenue.currency, revenue.amount)
      from (
        select currency, sum(total) as amount
        from public.orders
        where payment_status = 'paid' and status <> 'cancelled'
        group by currency
      ) as revenue
    ), '{}'::jsonb)
  )
  from public.orders;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_low_stock_alerts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  level_row record;
  member_row record;
  active_key text;
  active_count integer := 0;
begin
  for level_row in
    select
      il.location_id,
      il.variant_id,
      il.on_hand,
      il.reserved,
      il.reorder_point,
      coalesce(l.name, 'Inventory location') as location_name,
      coalesce(v.label, 'Default variant') as variant_label,
      coalesce(p.title, 'Inventory item') as product_title
    from public.inventory_levels il
    left join public.locations l on l.id = il.location_id
    left join public.variants v on v.id = il.variant_id
    left join public.products p on p.id = v.product_id
    where il.on_hand - il.reserved <= il.reorder_point
  loop
    active_key := level_row.location_id::text || ':' || level_row.variant_id::text;
    active_count := active_count + 1;

    insert into public.stock_alerts (
      location_id, variant_id, last_on_hand, last_reserved, last_reorder_point,
      status, last_detected_at, resolved_at
    ) values (
      level_row.location_id, level_row.variant_id, level_row.on_hand,
      level_row.reserved, level_row.reorder_point, 'active', now(), null
    )
    on conflict (location_id, variant_id) do update set
      last_on_hand = excluded.last_on_hand,
      last_reserved = excluded.last_reserved,
      last_reorder_point = excluded.last_reorder_point,
      status = 'active',
      last_detected_at = now(),
      resolved_at = null;

    for member_row in
      select id
      from public.accounts
      where role::text in ('admin', 'manager', 'staff')
    loop
      insert into public.notifications (
        title, message, category, type, read, link, recipient_id,
        dedupe_key, metadata
      ) values (
        'Low stock: ' || level_row.product_title,
        level_row.variant_label || ' at ' || level_row.location_name ||
          ' has ' || greatest(0, level_row.on_hand - level_row.reserved) ||
          ' available units, at or below the reorder point of ' || level_row.reorder_point || '.',
        'system', 'warning', false, '/store/inventory', member_row.id,
        'low-stock:' || active_key || ':' || member_row.id::text,
        jsonb_build_object(
          'locationId', level_row.location_id,
          'variantId', level_row.variant_id,
          'onHand', level_row.on_hand,
          'reserved', level_row.reserved,
          'reorderPoint', level_row.reorder_point,
          'source', 'pg_cron'
        )
      )
      on conflict (dedupe_key) where dedupe_key is not null do update set
        title = excluded.title,
        message = excluded.message,
        type = excluded.type,
        read = false,
        metadata = excluded.metadata;
    end loop;
  end loop;

  update public.stock_alerts alert
  set status = 'resolved', resolved_at = now()
  where alert.status = 'active'
    and not exists (
      select 1
      from public.inventory_levels il
      where il.location_id = alert.location_id
        and il.variant_id = alert.variant_id
        and il.on_hand - il.reserved <= il.reorder_point
    );

  update public.notifications notification
  set read = true
  where notification.dedupe_key like 'low-stock:%'
    and notification.read = false
    and not exists (
      select 1
      from public.inventory_levels il
      where notification.dedupe_key like 'low-stock:' || il.location_id::text || ':' || il.variant_id::text || ':%'
        and il.on_hand - il.reserved <= il.reorder_point
    );

  return active_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_low_stock_alerts_scheduled()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  run_id uuid;
  started_at timestamptz := clock_timestamp();
  active_count integer := 0;
begin
  insert into public.automation_runs (job_name, trigger, status, started_at)
  values ('studio-low-stock-alerts', 'scheduled', 'running', started_at)
  returning id into run_id;

  begin
    active_count := public.sync_low_stock_alerts();
    update public.automation_runs
    set status = 'succeeded', finished_at = clock_timestamp(), active_low_stock_count = active_count
    where id = run_id;
  exception when others then
    update public.automation_runs
    set status = 'failed', finished_at = clock_timestamp(), error_message = left(sqlerrm, 1000)
    where id = run_id;
  end;

  return active_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_weekly_notification_report_worker()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  queued_id uuid;
  worker_url text;
  worker_secret text;
begin
  select public.queue_weekly_notification_report() into queued_id;
  if queued_id is null then return null; end if;
  select decrypted_secret into worker_url from vault.decrypted_secrets where name = 'zerocraft_weekly_report_worker_url' limit 1;
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name = 'zerocraft_weekly_report_worker_secret' limit 1;
  if worker_url is null or worker_secret is null then return queued_id; end if;
  perform net.http_post(
    url := worker_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || worker_secret),
    body := jsonb_build_object('runId', queued_id)
  );
  return queued_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.variant_has_active_reservations(p_variant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_has boolean := false;
begin
  if pg_catalog.to_regclass('public.inventory_reservations') is not null then
    execute $sql$
      select exists (
        select 1 from public.inventory_reservations
        where variant_id = $1 and status = 'reserved'
      )
    $sql$ into v_has using p_variant_id;
  end if;
  return v_has;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.accounts (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    case when lower(new.email) = 'ivd.maran@gmail.com' then 'admin'::public.user_role else 'client'::public.user_role end
  ) on conflict (id) do nothing;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_transactional_checkout(p_customer_id uuid, p_idempotency_key text, p_request_fingerprint text, p_checkout jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer_id uuid := p_customer_id;
  v_request public.checkout_requests%rowtype;
  v_product public.products%rowtype;
  v_variant public.variants%rowtype;
  v_raw_line jsonb;
  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_currency text;
  v_order_currency text;
  v_unit_major numeric(12,2);
  v_unit_paise bigint;
  v_unit_minor bigint;
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_order_id uuid;
  v_order_number text;
  v_order_item_id uuid;
  v_location_id uuid;
  v_on_hand integer;
  v_reserved integer;
  v_inventory_count integer;
  v_existing jsonb;
  v_customization_path text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'CHECKOUT_INVALID: trusted server required';
  end if;

  if v_customer_id is null
     or not exists (select 1 from auth.users where id = v_customer_id)
     or coalesce((select email from auth.users where id = v_customer_id), '') = '' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: customer unavailable';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{1,128}$' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid idempotency key';
  end if;
  if p_request_fingerprint is null or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid request fingerprint';
  end if;
  if jsonb_typeof(p_checkout) <> 'object'
     or jsonb_typeof(p_checkout->'items') <> 'array'
     or jsonb_typeof(p_checkout->'address') <> 'object'
     or not (p_checkout ? 'items')
     or not (p_checkout ? 'address')
     or exists (select 1 from jsonb_object_keys(p_checkout) as key where key not in ('items', 'address', 'delivery', 'paymentMethod')) then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid checkout payload';
  end if;
  if jsonb_array_length(p_checkout->'items') < 1 or jsonb_array_length(p_checkout->'items') > 30 then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid line count';
  end if;
  if coalesce(p_checkout->>'paymentMethod', '') <> 'cod'
     or coalesce(p_checkout->>'delivery', '') not in ('standard', 'express', 'overnight') then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: unsupported checkout option';
  end if;
  if length(coalesce(p_checkout->'address'->>'fullName', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'street', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'city', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'state', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'postalCode', '')) not between 1 and 160
     or length(coalesce(p_checkout->'address'->>'country', '')) not between 2 and 3
     or length(coalesce(p_checkout->'address'->>'phone', '')) not between 1 and 40 then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid delivery address';
  end if;

  for v_raw_line in select value from jsonb_array_elements(p_checkout->'items') loop
    if jsonb_typeof(v_raw_line) <> 'object'
       or coalesce(v_raw_line->>'productId', '') !~ '^[0-9a-fA-F-]{36}$'
       or coalesce(v_raw_line->>'quantity', '') !~ '^[0-9]+$'
       or (v_raw_line->>'quantity')::numeric not between 1 and 20
       or (v_raw_line ? 'variantId' and nullif(v_raw_line->>'variantId', '') is not null
           and (v_raw_line->>'variantId') !~ '^[0-9a-fA-F-]{36}$')
       or (v_raw_line ? 'customizationReference' and length(v_raw_line->>'customizationReference') > 300)
       or exists (select 1 from jsonb_object_keys(v_raw_line) as key
                  where key not in ('productId', 'variantId', 'quantity', 'customizationReference', 'color', 'size')) then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid cart line';
    end if;
  end loop;

  -- The unique customer/key row is the serialization point for retries.
  insert into public.checkout_requests(customer_id, idempotency_key, request_fingerprint)
  values (v_customer_id, p_idempotency_key, p_request_fingerprint)
  on conflict (customer_id, idempotency_key) do nothing;
  select * into v_request
    from public.checkout_requests
    where customer_id = v_customer_id and idempotency_key = p_idempotency_key
    for update;
  if v_request.request_fingerprint <> p_request_fingerprint then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT: request differs';
  end if;
  if v_request.order_id is not null then
    select jsonb_build_object(
      'order_id', o.id, 'order_number', o.order_number, 'status', o.status,
      'currency', o.currency, 'total', o.total, 'subtotal', o.subtotal,
      'discount', o.discount, 'shipping_fee', o.shipping_fee, 'tax', o.tax,
      'items', o.items, 'created_at', o.created_at, 'replayed', true
    ) into v_existing
    from public.orders o where o.id = v_request.order_id;
    if v_existing is not null then return v_existing; end if;
  end if;

  -- Sort every checkout by product/variant/customization before locking rows.
  -- This prevents two multi-line checkouts from taking inventory locks in
  -- opposite order and materially reduces deadlock risk.
  for v_line in
    select jsonb_build_object(
      'productId', x."productId", 'variantId', x."variantId",
      'customizationReference', x."customizationReference", 'color', x.color,
      'size', x.size, 'quantity', sum(x.quantity)
    )
    from jsonb_to_recordset(p_checkout->'items') as x(
      "productId" uuid, "variantId" uuid, quantity integer,
      "customizationReference" text, color text, size text
    )
    group by x."productId", x."variantId", x."customizationReference", x.color, x.size
    order by x."productId", x."variantId" nulls first, x."customizationReference" nulls first, x.color, x.size
  loop
    v_product_id := (v_line->>'productId')::uuid;
    v_variant_id := nullif(v_line->>'variantId', '')::uuid;
    v_quantity := (v_line->>'quantity')::integer;

    select * into v_product from public.products where id = v_product_id for update;
    if not found or v_product.status <> 'active' then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: product unavailable';
    end if;
    v_variant := null;
    if v_variant_id is not null then
      select * into v_variant from public.variants
        where id = v_variant_id and product_id = v_product_id for update;
      if not found or not v_variant.is_active then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: variant unavailable';
      end if;
      if nullif(v_line->>'color', '') is not null and not exists (
        select 1 from public.variant_option_values vv
        join public.option_values ov on ov.id = vv.option_value_id
        join public.product_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) in ('color', 'colour')
          and lower(ov.value) = lower(v_line->>'color')
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: color does not match variant';
      end if;
      if nullif(v_line->>'size', '') is not null and not exists (
        select 1 from public.variant_option_values vv
        join public.option_values ov on ov.id = vv.option_value_id
        join public.product_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) = 'size'
          and lower(ov.value) = lower(v_line->>'size')
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: size does not match variant';
      end if;
      if nullif(v_line->>'color', '') is null and exists (
        select 1 from public.variant_option_values vv
        join public.option_values ov on ov.id = vv.option_value_id
        join public.product_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) in ('color', 'colour')
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: color selection required';
      end if;
      if nullif(v_line->>'size', '') is null and exists (
        select 1 from public.variant_option_values vv
        join public.option_values ov on ov.id = vv.option_value_id
        join public.product_options vo on vo.id = ov.option_id
        where vv.variant_id = v_variant_id and lower(vo.name) = 'size'
      ) then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: size selection required';
      end if;
    elsif (select count(*) from public.variants where product_id = v_product_id and is_active) > 1 then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: variant required';
    end if;

    v_currency := upper(coalesce(nullif(v_variant.currency_code, ''), nullif(v_product.currency_code, ''), v_product.currency));
    if v_currency not in ('INR', 'USD') then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: unsupported currency';
    end if;
    if v_order_currency is null then v_order_currency := v_currency;
    elsif v_order_currency <> v_currency then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: mixed currencies';
    end if;
    if v_currency = 'INR' then
      v_unit_paise := coalesce(v_variant.price_paise, v_product.price_paise);
      if v_unit_paise is null or v_unit_paise < 0 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid INR price';
      end if;
      v_unit_minor := v_unit_paise;
      v_unit_major := v_unit_paise::numeric / 100;
    else
      v_unit_major := coalesce(v_variant.price, v_product.price);
      if v_unit_major is null or v_unit_major < 0 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: invalid USD price';
      end if;
      v_unit_minor := round(v_unit_major * 100)::bigint;
      v_unit_paise := null;
    end if;
    v_line_total := v_unit_major * v_quantity;
    if v_line_total > 9999999999.99 or v_subtotal > 9999999999.99 - v_line_total then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: order total exceeds supported range';
    end if;
    v_subtotal := v_subtotal + v_line_total;

    if v_product.product_type = 'physical' then
      if v_variant_id is null then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: physical product requires a variant';
      end if;
      select count(*) into v_inventory_count from public.inventory_levels where variant_id = v_variant_id;
      if v_inventory_count <> 1 then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: inventory allocation is unsupported';
      end if;
    end if;

    v_customization_path := nullif(v_line->>'customizationReference', '');
    if v_customization_path is not null and not exists (
      select 1 from public.customizations c
      join public.customization_templates t on t.id = c.template_id
      join storage.objects o on o.bucket_id = 'customer-customizations' and o.name = c.object_path
      where c.object_path = v_customization_path and c.customer_id = v_customer_id
        and c.product_id = v_product_id and c.status = 'ready'
        and t.product_id = v_product_id and t.status = 'published'
    ) then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: customization is not owned or valid for product';
    end if;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id, 'variantId', v_variant_id, 'title', v_product.title,
      'sku', coalesce(v_variant.sku, v_product.sku), 'quantity', v_quantity,
      'unitPrice', v_unit_major, 'unitPriceMinor', v_unit_minor, 'currency', v_currency,
      'productType', v_product.product_type, 'customizationReference', v_customization_path
    ));
  end loop;

  select extensions.gen_random_uuid(), 'ZC-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8))
    into v_order_id, v_order_number;
  insert into public.orders(
    id, order_number, customer_id, customer_name, customer_email, customer_phone,
    shipping_address, items, delivery_method, subtotal, discount, shipping_fee, tax,
    total, currency, status, payment_status, payment_method, idempotency_key
  ) values (
    v_order_id, v_order_number, v_customer_id,
    coalesce(p_checkout->'address'->>'fullName', ''),
    coalesce((select email from auth.users where id = v_customer_id), ''),
    coalesce(p_checkout->'address'->>'phone', ''), p_checkout->'address', v_lines,
    p_checkout->>'delivery', v_subtotal, 0, 0, 0, v_subtotal, v_order_currency,
    'pending', 'unpaid', 'cod', v_customer_id::text || ':' || p_idempotency_key
  );

  -- Order items, inventory reservations, and customization consumption are all
  -- inside this function transaction. Any exception rolls back every mutation.
  for v_line in select value from jsonb_array_elements(v_lines) loop
    insert into public.order_items(
      order_id, product_id, variant_id, title, sku, quantity,
      unit_price_paise, unit_price_minor, currency, currency_code, customization
    ) values (
      v_order_id, (v_line->>'productId')::uuid, nullif(v_line->>'variantId', '')::uuid,
      v_line->>'title', coalesce(v_line->>'sku', ''), (v_line->>'quantity')::integer,
      case when v_line->>'currency' = 'INR' then (v_line->>'unitPriceMinor')::bigint end,
      case when v_line->>'currency' = 'USD' then (v_line->>'unitPriceMinor')::bigint end,
      v_line->>'currency', v_line->>'currency',
      case when nullif(v_line->>'customizationReference', '') is null then '{}'::jsonb
        else jsonb_build_object('reference', v_line->>'customizationReference') end
    ) returning id into v_order_item_id;

    if v_line->>'productType' = 'physical' then
      select location_id, on_hand, reserved into v_location_id, v_on_hand, v_reserved
        from public.inventory_levels
        where variant_id = (v_line->>'variantId')::uuid
        for update;
      if not found or v_reserved + (v_line->>'quantity')::integer > v_on_hand then
        raise exception using errcode = 'P0001', message = 'OUT_OF_STOCK: insufficient inventory';
      end if;
      update public.inventory_levels
        set reserved = reserved + (v_line->>'quantity')::integer, updated_at = now()
        where location_id = v_location_id and variant_id = (v_line->>'variantId')::uuid;
      insert into public.inventory_reservations(
        order_id, order_item_id, location_id, variant_id, quantity, status, expires_at
      ) values (
        v_order_id, v_order_item_id, v_location_id, (v_line->>'variantId')::uuid,
        (v_line->>'quantity')::integer, 'reserved', now() + interval '30 minutes'
      );
    end if;

    v_customization_path := nullif(v_line->>'customizationReference', '');
    if v_customization_path is not null then
      update public.customizations
        set status = 'consumed', consumed_at = now()
        where object_path = v_customization_path
          and customer_id = v_customer_id
          and product_id = (v_line->>'productId')::uuid
          and status = 'ready';
      if not found then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_INVALID: customization was already consumed';
      end if;
    end if;
  end loop;

  update public.checkout_requests
    set order_id = v_order_id, completed_at = now() where id = v_request.id;
  return jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number, 'status', 'pending',
    'currency', v_order_currency, 'total', v_subtotal, 'subtotal', v_subtotal,
    'discount', 0, 'shipping_fee', 0, 'tax', 0, 'items', v_lines,
    'created_at', now(), 'replayed', false
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_transactional_checkout_with_payment(p_customer_id uuid, p_idempotency_key text, p_request_fingerprint text, p_checkout jsonb, p_payment_method text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb; v_attempt jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'PAYMENT_INVALID: trusted server required';
  end if;
  if p_payment_method not in ('cod', 'upi_qr', 'bank_transfer') then
    raise exception using errcode = '22023', message = 'PAYMENT_INVALID: unsupported payment method';
  end if;
  -- The underlying checkout function currently accepts COD as its settlement
  -- mode; manual methods are attached as a separate payment attempt below.
  -- This keeps order creation and payment verification states separate while
  -- allowing UPI/bank-transfer orders to be created safely.
  v_result := public.create_transactional_checkout(p_customer_id, p_idempotency_key, p_request_fingerprint, p_checkout || jsonb_build_object('paymentMethod', 'cod'));
  if p_payment_method <> 'cod' then
    v_attempt := public.prepare_manual_payment((v_result->>'order_id')::uuid, p_customer_id, p_payment_method, p_idempotency_key);
    v_result := v_result || jsonb_build_object('payment_attempt_id', v_attempt->>'id');
  end if;
  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_order_reservations(p_order_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record; n integer := 0; v_status text; v_active integer; v_unexpired integer;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  select status into v_status from public.orders where id = p_order_id for update;
  if v_status is null then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order unavailable'; end if;
  if v_status not in ('pending', 'confirmed') then return 0; end if;

  -- Do not partially expire an order. If any active reservation has not yet
  -- expired, leave every reservation untouched and keep the order open.
  select count(*) filter (where status = 'reserved'),
         count(*) filter (where status = 'reserved' and (expires_at is null or expires_at > now()))
    into v_active, v_unexpired
    from public.inventory_reservations where order_id = p_order_id;
  if v_active = 0 or v_unexpired > 0 then return 0; end if;

  for r in select id, location_id, variant_id, quantity from public.inventory_reservations
    where order_id = p_order_id and status = 'reserved' order by location_id, variant_id, id for update loop
    update public.inventory_levels set reserved = reserved - r.quantity, updated_at = now()
      where location_id = r.location_id and variant_id = r.variant_id and reserved >= r.quantity;
    if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: inventory invariant failed'; end if;
    update public.inventory_reservations set status = 'expired', released_at = now(), release_reason = 'expired'
      where id = r.id and status = 'reserved';
    n := n + 1;
  end loop;
  if n > 0 then
    update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id;
  end if;
  return n;
end; $function$
;

CREATE OR REPLACE FUNCTION public.fulfill_order_reservations(p_order_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record; n integer := 0; v_status text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  select status into v_status from public.orders where id = p_order_id for update;
  if v_status is null or v_status not in ('fulfilling', 'shipped', 'completed') then
    raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order is not fulfillable';
  end if;
  for r in select id, location_id, variant_id, quantity from public.inventory_reservations
    where order_id = p_order_id and status = 'reserved' order by location_id, variant_id, id for update loop
    update public.inventory_levels set on_hand = on_hand - r.quantity, reserved = reserved - r.quantity, updated_at = now()
      where location_id = r.location_id and variant_id = r.variant_id and on_hand >= r.quantity and reserved >= r.quantity;
    if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: inventory invariant failed'; end if;
    update public.inventory_reservations set status = 'fulfilled', fulfilled_at = now()
      where id = r.id and status = 'reserved';
    n := n + 1;
  end loop;
  return n;
end; $function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.accounts where id = (select auth.uid()) and is_active and role = 'admin');
$function$
;

CREATE OR REPLACE FUNCTION public.is_member()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.accounts where id = (select auth.uid()) and is_active and role in ('admin', 'manager', 'staff'));
$function$
;

CREATE OR REPLACE FUNCTION public.is_valid_customer_customization_registration(p_customer_id uuid, p_product_id uuid, p_template_id uuid, p_object_path text, p_status text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p_customer_id = auth.uid()
    and p_status = 'ready'
    and p_object_path ~ (
      '^' || p_customer_id::text || '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'
    )
    and exists (
      select 1
      from public.products p
      join public.customization_templates t on t.product_id = p.id
      where p.id = p_product_id
        and p.status = 'active'
        and t.id = p_template_id
        and t.status = 'published'
    );
$function$
;

CREATE OR REPLACE FUNCTION public.prepare_manual_payment(p_order_id uuid, p_customer_id uuid, p_method_code text, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_order record; v_attempt record;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'PAYMENT_INVALID: trusted server required';
  end if;
  if p_method_code not in ('upi_qr', 'bank_transfer') then
    raise exception using errcode = '22023', message = 'PAYMENT_INVALID: unsupported manual payment method';
  end if;
  select id, customer_id, total, currency, payment_status into v_order
    from public.orders where id = p_order_id for update;
  if not found or v_order.customer_id <> p_customer_id then
    raise exception using errcode = 'P0002', message = 'PAYMENT_INVALID: order unavailable';
  end if;
  select * into v_attempt from public.payment_attempts
    where order_id = p_order_id and idempotency_key = p_idempotency_key limit 1;
  if found then return jsonb_build_object('id', v_attempt.id, 'status', v_attempt.status, 'replayed', true); end if;
  insert into public.payment_attempts(order_id, customer_id, method_code, amount, currency, idempotency_key)
    values (v_order.id, p_customer_id, p_method_code, v_order.total, v_order.currency, p_idempotency_key)
    returning * into v_attempt;
  update public.orders set payment_method = p_method_code, payment_status = 'pending', payment_attempt_id = v_attempt.id, updated_at = now() where id = v_order.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (p_customer_id, 'payment_attempt_created', 'store_payment_attempt', v_attempt.id, jsonb_build_object('order_id', v_order.id, 'method_code', p_method_code));
  return jsonb_build_object('id', v_attempt.id, 'status', v_attempt.status, 'replayed', false);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.release_order_reservations(p_order_id uuid, p_reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record; n integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'RESERVATION_INVALID: trusted server required';
  end if;
  if p_reason not in ('payment_failed', 'cancelled', 'manual_release') then
    raise exception using errcode = '22023', message = 'RESERVATION_INVALID: invalid release reason';
  end if;
  perform 1 from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: order unavailable'; end if;
  for r in select id, location_id, variant_id, quantity from public.inventory_reservations
    where order_id = p_order_id and status = 'reserved' order by location_id, variant_id, id for update loop
    update public.inventory_levels set reserved = reserved - r.quantity, updated_at = now()
      where location_id = r.location_id and variant_id = r.variant_id and reserved >= r.quantity;
    if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_INVALID: inventory invariant failed'; end if;
    update public.inventory_reservations set status = 'released', released_at = now(), release_reason = p_reason
      where id = r.id and status = 'reserved';
    n := n + 1;
  end loop;
  return n;
end; $function$
;

CREATE OR REPLACE FUNCTION public.release_order_reservations(p_order_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return public.release_order_reservations(p_order_id, 'manual_release');
end; $function$
;

CREATE OR REPLACE FUNCTION public.submit_manual_payment_utr(p_attempt_id uuid, p_order_id uuid, p_customer_id uuid, p_utr text, p_amount numeric, p_paid_at timestamp with time zone, p_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_attempt record; v_submission record;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'PAYMENT_INVALID: trusted server required';
  end if;
  if p_utr !~ '^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$' or p_amount < 0 then
    raise exception using errcode = '22023', message = 'PAYMENT_INVALID: UTR or amount is invalid';
  end if;
  select * into v_attempt from public.payment_attempts where id = p_attempt_id and order_id = p_order_id and customer_id = p_customer_id for update;
  if not found or v_attempt.status not in ('awaiting_customer', 'proof_submitted') then
    raise exception using errcode = 'P0001', message = 'PAYMENT_INVALID: payment attempt is not open';
  end if;
  insert into public.payment_submissions(payment_attempt_id, order_id, customer_id, utr, amount, paid_at, note)
    values (p_attempt_id, p_order_id, p_customer_id, upper(trim(p_utr)), p_amount, p_paid_at, coalesce(p_note, ''))
    on conflict (payment_attempt_id, utr) do update set note = excluded.note
    returning * into v_submission;
  update public.payment_attempts set status = 'proof_submitted', updated_at = now() where id = p_attempt_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (p_customer_id, 'payment_proof_submitted', 'store_payment_submission', v_submission.id, jsonb_build_object('order_id', p_order_id, 'utr', upper(trim(p_utr))));
  return jsonb_build_object('id', v_submission.id, 'status', v_submission.status);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_manual_payment(p_submission_id uuid, p_decision text, p_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_submission record; v_status text; v_payment_status text;
begin
  if not public.is_admin() then raise exception using errcode = '42501', message = 'PAYMENT_FORBIDDEN: admin verification required'; end if;
  if p_decision not in ('approve', 'reject') then raise exception using errcode = '22023', message = 'PAYMENT_INVALID: decision is invalid'; end if;
  select * into v_submission from public.payment_submissions where id = p_submission_id for update;
  if not found or v_submission.status <> 'pending' then raise exception using errcode = 'P0001', message = 'PAYMENT_INVALID: submission is not pending'; end if;
  v_status := case when p_decision = 'approve' then 'paid' else 'rejected' end;
  v_payment_status := case when p_decision = 'approve' then 'paid' else 'unpaid' end;
  update public.payment_submissions set status = case when p_decision = 'approve' then 'approved' else 'rejected' end, reviewed_by = auth.uid(), reviewed_at = now(), review_note = coalesce(p_note, '') where id = p_submission_id;
  update public.payment_attempts set status = v_status, updated_at = now() where id = v_submission.payment_attempt_id;
  update public.orders set payment_status = v_payment_status, updated_at = now() where id = v_submission.order_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), case when p_decision = 'approve' then 'manual_payment_approved' else 'manual_payment_rejected' end, 'store_payment_submission', p_submission_id, jsonb_build_object('order_id', v_submission.order_id, 'attempt_id', v_submission.payment_attempt_id));
  return jsonb_build_object('id', p_submission_id, 'status', v_status, 'payment_status', v_payment_status);
end;
$function$
;

alter table content_records add constraint cms_content_records_check CHECK (((kind = ANY (ARRAY['articles'::text, 'entries'::text])) = (parent_id IS NOT NULL)));

alter table content_records add constraint cms_content_records_data_check CHECK ((jsonb_typeof(data) = 'object'::text));

alter table content_records add constraint cms_content_records_handle_check CHECK (((handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text) AND (length(handle) <= 120)));

alter table content_records add constraint cms_content_records_kind_check CHECK ((kind = ANY (ARRAY['folders'::text, 'menus'::text, 'redirects'::text, 'blogs'::text, 'articles'::text, 'definitions'::text, 'entries'::text])));

alter table content_records add constraint cms_content_records_pkey PRIMARY KEY (id);

alter table content_records add constraint cms_content_records_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text])));

alter table content_records add constraint cms_content_records_title_check CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 200)));

alter table menu_items add constraint cms_navigation_items_label_check CHECK (((length(TRIM(BOTH FROM label)) >= 1) AND (length(TRIM(BOTH FROM label)) <= 100)));

alter table menu_items add constraint cms_navigation_items_pkey PRIMARY KEY (id);

alter table menus add constraint cms_navigation_menus_name_key UNIQUE (name);

alter table menus add constraint cms_navigation_menus_pkey PRIMARY KEY (id);

alter table pages add constraint cms_pages_pkey PRIMARY KEY (id);

alter table pages add constraint cms_pages_slug_check CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text));

alter table pages add constraint cms_pages_slug_key UNIQUE (slug);

alter table pages add constraint cms_pages_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));

alter table pages add constraint cms_pages_title_check CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180)));

alter table store_settings add constraint cms_site_settings_pkey PRIMARY KEY (setting_key);

alter table customer_addresses add constraint customer_addresses_pkey PRIMARY KEY (id);

alter table notifications add constraint notifications_pkey PRIMARY KEY (id);

alter table accounts add constraint profiles_email_key UNIQUE (email);

alter table accounts add constraint profiles_pkey PRIMARY KEY (id);

alter table audit_logs add constraint store_audit_logs_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text));

alter table audit_logs add constraint store_audit_logs_pkey PRIMARY KEY (id);

alter table bundle_items add constraint store_bundle_items_pkey PRIMARY KEY (bundle_id, product_id);

alter table bundle_items add constraint store_bundle_items_quantity_check CHECK ((quantity > 0));

alter table bundle_items add constraint store_bundle_items_sort_order_check CHECK ((sort_order >= 0));

alter table bundles add constraint store_bundles_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent < (100)::numeric)));

alter table bundles add constraint store_bundles_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)));

alter table bundles add constraint store_bundles_pkey PRIMARY KEY (id);

alter table bundles add constraint store_bundles_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text));

alter table bundles add constraint store_bundles_slug_key UNIQUE (slug);

alter table bundles add constraint store_bundles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));

alter table cart_items add constraint store_cart_items_cart_id_variant_id_key UNIQUE (cart_id, variant_id);

alter table cart_items add constraint store_cart_items_customization_check CHECK ((jsonb_typeof(customization) = 'object'::text));

alter table cart_items add constraint store_cart_items_pkey PRIMARY KEY (id);

alter table cart_items add constraint store_cart_items_quantity_check CHECK ((quantity > 0));

alter table carts add constraint store_carts_check CHECK (((user_id IS NOT NULL) OR (guest_token IS NOT NULL)));

alter table carts add constraint store_carts_currency_check CHECK ((currency = 'INR'::text));

alter table carts add constraint store_carts_guest_token_key UNIQUE (guest_token);

alter table carts add constraint store_carts_pkey PRIMARY KEY (id);

alter table categories add constraint store_categories_delete_window_check CHECK ((((deleted_at IS NULL) AND (purge_after IS NULL) AND (deleted_from_is_active IS NULL)) OR ((deleted_at IS NOT NULL) AND (purge_after IS NOT NULL) AND (deleted_from_is_active IS NOT NULL) AND (purge_after >= (deleted_at + '15 days'::interval)))));

alter table categories add constraint store_categories_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 100)));

alter table categories add constraint store_categories_pkey PRIMARY KEY (id);

alter table categories add constraint store_categories_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text));

alter table categories add constraint store_categories_slug_key UNIQUE (slug);

alter table checkout_requests add constraint store_checkout_requests_customer_id_idempotency_key_key UNIQUE (customer_id, idempotency_key);

alter table checkout_requests add constraint store_checkout_requests_idempotency_key_check CHECK (((length(TRIM(BOTH FROM idempotency_key)) >= 1) AND (length(TRIM(BOTH FROM idempotency_key)) <= 128)));

alter table checkout_requests add constraint store_checkout_requests_pkey PRIMARY KEY (id);

alter table checkout_requests add constraint store_checkout_requests_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text));

alter table collection_products add constraint store_collection_products_pkey PRIMARY KEY (collection_id, product_id);

alter table collection_products add constraint store_collection_products_sort_order_check CHECK ((sort_order >= 0));

alter table collections add constraint store_collections_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)));

alter table collections add constraint store_collections_pkey PRIMARY KEY (id);

alter table collections add constraint store_collections_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text));

alter table collections add constraint store_collections_slug_key UNIQUE (slug);

alter table collections add constraint store_collections_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));

alter table customization_templates add constraint store_customization_templates_pkey PRIMARY KEY (id);

alter table customization_templates add constraint store_customization_templates_schema_check CHECK ((jsonb_typeof(schema) = 'object'::text));

alter table customization_templates add constraint store_customization_templates_slug_key UNIQUE (slug);

alter table customization_templates add constraint store_customization_templates_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));

alter table customizations add constraint store_customizations_byte_size_check CHECK (((byte_size > 0) AND (byte_size <= 26214400)));

alter table customizations add constraint store_customizations_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'application/pdf'::text])));

alter table customizations add constraint store_customizations_object_path_check CHECK ((object_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|png|webp|pdf)$'::text));

alter table customizations add constraint store_customizations_object_path_key UNIQUE (object_path);

alter table customizations add constraint store_customizations_pkey PRIMARY KEY (id);

alter table customizations add constraint store_customizations_status_check CHECK ((status = ANY (ARRAY['ready'::text, 'consumed'::text, 'rejected'::text])));

alter table inventory_levels add constraint store_inventory_levels_check CHECK (((reserved >= 0) AND (reserved <= on_hand)));

alter table inventory_levels add constraint store_inventory_levels_on_hand_check CHECK ((on_hand >= 0));

alter table inventory_levels add constraint store_inventory_levels_pkey PRIMARY KEY (location_id, variant_id);

alter table inventory_levels add constraint store_inventory_levels_reorder_point_check CHECK ((reorder_point >= 0));

alter table locations add constraint store_inventory_locations_code_key UNIQUE (code);

alter table locations add constraint store_inventory_locations_name_key UNIQUE (name);

alter table locations add constraint store_inventory_locations_pkey PRIMARY KEY (id);

alter table inventory_movements add constraint store_inventory_movements_pkey PRIMARY KEY (id);

alter table inventory_movements add constraint store_inventory_movements_quantity_delta_check CHECK ((quantity_delta <> 0));

alter table inventory_reservations add constraint store_inventory_reservations_check CHECK ((((status = 'reserved'::text) AND (released_at IS NULL) AND (fulfilled_at IS NULL)) OR ((status = 'released'::text) AND (released_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((status = 'fulfilled'::text) AND (released_at IS NULL) AND (fulfilled_at IS NOT NULL))));

alter table inventory_reservations add constraint store_inventory_reservations_lifecycle_check CHECK ((((status = 'reserved'::text) AND (released_at IS NULL) AND (fulfilled_at IS NULL)) OR ((status = 'released'::text) AND (released_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((status = 'expired'::text) AND (released_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((status = 'fulfilled'::text) AND (released_at IS NULL) AND (fulfilled_at IS NOT NULL))));

alter table inventory_reservations add constraint store_inventory_reservations_order_id_location_id_variant_i_key UNIQUE (order_id, location_id, variant_id);

alter table inventory_reservations add constraint store_inventory_reservations_pkey PRIMARY KEY (id);

alter table inventory_reservations add constraint store_inventory_reservations_quantity_check CHECK ((quantity > 0));

alter table inventory_reservations add constraint store_inventory_reservations_release_reason_check CHECK (((release_reason IS NULL) OR (release_reason = ANY (ARRAY['payment_failed'::text, 'cancelled'::text, 'manual_release'::text, 'expired'::text]))));

alter table inventory_reservations add constraint store_inventory_reservations_status_check CHECK ((status = ANY (ARRAY['reserved'::text, 'released'::text, 'expired'::text, 'fulfilled'::text])));

alter table transfer_items add constraint store_inventory_transfer_items_pkey PRIMARY KEY (id);

alter table transfer_items add constraint store_inventory_transfer_items_quantity_check CHECK ((quantity > 0));

alter table transfer_items add constraint store_inventory_transfer_items_transfer_id_variant_id_key UNIQUE (transfer_id, variant_id);

alter table transfers add constraint store_inventory_transfers_check CHECK ((from_location_id <> to_location_id));

alter table transfers add constraint store_inventory_transfers_pkey PRIMARY KEY (id);

alter table transfers add constraint store_inventory_transfers_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_transit'::text, 'received'::text, 'cancelled'::text])));

alter table transfers add constraint store_inventory_transfers_transfer_number_key UNIQUE (transfer_number);

alter table files add constraint store_media_assets_pkey PRIMARY KEY (storage_path);

alter table files add constraint store_media_assets_size_bytes_check CHECK ((size_bytes >= 0));

alter table order_items add constraint store_order_items_currency_check CHECK ((currency = ANY (ARRAY['INR'::text, 'USD'::text])));

alter table order_items add constraint store_order_items_money_snapshot_check CHECK ((((currency = 'INR'::text) AND (unit_price_paise IS NOT NULL) AND (unit_price_minor IS NULL)) OR ((currency = 'USD'::text) AND (unit_price_minor IS NOT NULL) AND (unit_price_paise IS NULL))));

alter table order_items add constraint store_order_items_pkey PRIMARY KEY (id);

alter table order_items add constraint store_order_items_quantity_check CHECK ((quantity > 0));

alter table order_items add constraint store_order_items_unit_price_paise_check CHECK ((unit_price_paise >= 0));

alter table orders add constraint store_orders_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));

alter table orders add constraint store_orders_delivery_method_check CHECK ((delivery_method = ANY (ARRAY['standard'::text, 'express'::text, 'overnight'::text])));

alter table orders add constraint store_orders_discount_check CHECK ((discount >= (0)::numeric));

alter table orders add constraint store_orders_order_number_key UNIQUE (order_number);

alter table orders add constraint store_orders_payment_method_check CHECK ((payment_method = ANY (ARRAY['cod'::text, 'upi_qr'::text, 'bank_transfer'::text])));

alter table orders add constraint store_orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])));

alter table orders add constraint store_orders_pkey PRIMARY KEY (id);

alter table orders add constraint store_orders_shipping_fee_check CHECK ((shipping_fee >= (0)::numeric));

alter table orders add constraint store_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'fulfilling'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text])));

alter table orders add constraint store_orders_subtotal_check CHECK ((subtotal >= (0)::numeric));

alter table orders add constraint store_orders_tax_check CHECK ((tax >= (0)::numeric));

alter table orders add constraint store_orders_total_check CHECK ((total >= (0)::numeric));

alter table payment_attempts add constraint store_payment_attempts_amount_check CHECK ((amount >= (0)::numeric));

alter table payment_attempts add constraint store_payment_attempts_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));

alter table payment_attempts add constraint store_payment_attempts_idempotency_key_check CHECK (((length(TRIM(BOTH FROM idempotency_key)) >= 1) AND (length(TRIM(BOTH FROM idempotency_key)) <= 128)));

alter table payment_attempts add constraint store_payment_attempts_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text));

alter table payment_attempts add constraint store_payment_attempts_method_code_check CHECK ((method_code = ANY (ARRAY['upi_qr'::text, 'bank_transfer'::text])));

alter table payment_attempts add constraint store_payment_attempts_order_id_idempotency_key_key UNIQUE (order_id, idempotency_key);

alter table payment_attempts add constraint store_payment_attempts_pkey PRIMARY KEY (id);

alter table payment_attempts add constraint store_payment_attempts_status_check CHECK ((status = ANY (ARRAY['awaiting_customer'::text, 'proof_submitted'::text, 'paid'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text])));

alter table payment_methods add constraint store_payment_methods_display_name_check CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 80)));

alter table payment_methods add constraint store_payment_methods_method_code_check CHECK ((method_code = ANY (ARRAY['upi_qr'::text, 'bank_transfer'::text])));

alter table payment_methods add constraint store_payment_methods_method_code_key UNIQUE (method_code);

alter table payment_methods add constraint store_payment_methods_pkey PRIMARY KEY (id);

alter table payment_submissions add constraint store_payment_submissions_amount_check CHECK ((amount >= (0)::numeric));

alter table payment_submissions add constraint store_payment_submissions_payment_attempt_id_utr_key UNIQUE (payment_attempt_id, utr);

alter table payment_submissions add constraint store_payment_submissions_pkey PRIMARY KEY (id);

alter table payment_submissions add constraint store_payment_submissions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

alter table payment_submissions add constraint store_payment_submissions_utr_check CHECK ((utr ~ '^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$'::text));

alter table digital_files add constraint store_product_digital_files_file_name_check CHECK (((length(TRIM(BOTH FROM file_name)) >= 1) AND (length(TRIM(BOTH FROM file_name)) <= 180)));

alter table digital_files add constraint store_product_digital_files_pkey PRIMARY KEY (id);

alter table digital_files add constraint store_product_digital_files_size_bytes_check CHECK (((size_bytes > 0) AND (size_bytes <= 262144000)));

alter table digital_files add constraint store_product_digital_files_sort_order_check CHECK ((sort_order >= 0));

alter table digital_files add constraint store_product_digital_files_storage_path_key UNIQUE (storage_path);

alter table product_media add constraint store_product_media_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text])));

alter table product_media add constraint store_product_media_pkey PRIMARY KEY (id);

alter table product_media add constraint store_product_media_product_id_storage_path_key UNIQUE (product_id, storage_path);

alter table product_media add constraint store_product_media_sort_order_check CHECK ((sort_order >= 0));

alter table variants add constraint variants_currency_amount_check check (
    (currency_code = 'INR' and price_paise is not distinct from round(price * 100)::bigint)
    or (currency_code = 'USD' and price_paise is null)
  );

alter table variants add constraint store_product_variants_label_check CHECK (((length(TRIM(BOTH FROM label)) >= 1) AND (length(TRIM(BOTH FROM label)) <= 100)));

alter table variants add constraint store_product_variants_options_check CHECK ((jsonb_typeof(options) = 'object'::text));

alter table variants add constraint store_product_variants_pkey PRIMARY KEY (id);

alter table variants add constraint store_product_variants_price_check CHECK ((price >= (0)::numeric));

alter table variants add constraint store_product_variants_sku_key UNIQUE (sku);

alter table variants add constraint store_product_variants_stock_check CHECK (((stock IS NULL) OR (stock >= 0)));

alter table products add constraint store_products_check CHECK (((compare_at_price IS NULL) OR (compare_at_price >= price)));

alter table products add constraint store_products_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));

alter table products add constraint store_products_delete_window_check CHECK ((((deleted_at IS NULL) AND (purge_after IS NULL) AND (deleted_from_status IS NULL)) OR ((deleted_at IS NOT NULL) AND (purge_after IS NOT NULL) AND (deleted_from_status IS NOT NULL) AND (purge_after >= (deleted_at + '15 days'::interval)))));

alter table products add constraint store_products_deleted_from_status_check CHECK (((deleted_from_status IS NULL) OR (deleted_from_status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))));

alter table products add constraint store_products_design_origin_check CHECK ((design_origin = ANY (ARRAY['original_zerocraft'::text, 'licensed'::text, 'fan_inspired'::text])));

alter table products add constraint store_products_digital_delivery_check CHECK ((jsonb_typeof(digital_delivery) = 'object'::text));

alter table products add constraint products_currency_amount_check check (
    currency = currency_code and (
      (currency = 'INR' and price_paise is not distinct from round(price * 100)::bigint
       and compare_at_price_paise is not distinct from round(compare_at_price * 100)::bigint)
      or (currency = 'USD' and price_paise is null and compare_at_price_paise is null)
    )
  );

alter table products add constraint store_products_pkey PRIMARY KEY (id);

alter table products add constraint store_products_price_check CHECK ((price >= (0)::numeric));

alter table products add constraint store_products_product_type_check CHECK ((product_type = ANY (ARRAY['physical'::text, 'digital'::text])));

alter table products add constraint store_products_rights_status_check CHECK ((rights_status = ANY (ARRAY['not_applicable'::text, 'approved_license'::text, 'review_required'::text])));

alter table products add constraint store_products_sku_key UNIQUE (sku);

alter table products add constraint store_products_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text));

alter table products add constraint store_products_slug_key UNIQUE (slug);

alter table products add constraint store_products_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])));

alter table products add constraint store_products_stock_check CHECK (((stock IS NULL) OR (stock >= 0)));

alter table products add constraint store_products_title_check CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180)));

alter table products add constraint store_products_write_version_positive CHECK ((write_version > 0));

alter table purchase_order_items add constraint store_purchase_order_items_check CHECK (((quantity_received >= 0) AND (quantity_received <= quantity_ordered)));

alter table purchase_order_items add constraint store_purchase_order_items_pkey PRIMARY KEY (id);

alter table purchase_order_items add constraint store_purchase_order_items_purchase_order_id_variant_id_key UNIQUE (purchase_order_id, variant_id);

alter table purchase_order_items add constraint store_purchase_order_items_quantity_ordered_check CHECK ((quantity_ordered > 0));

alter table purchase_order_items add constraint store_purchase_order_items_unit_cost_paise_check CHECK ((unit_cost_paise >= 0));

alter table purchase_orders add constraint store_purchase_orders_currency_check CHECK ((currency = 'INR'::text));

alter table purchase_orders add constraint store_purchase_orders_order_number_key UNIQUE (order_number);

alter table purchase_orders add constraint store_purchase_orders_pkey PRIMARY KEY (id);

alter table purchase_orders add constraint store_purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'ordered'::text, 'partial'::text, 'received'::text, 'cancelled'::text])));

alter table deleted_files add constraint store_recycle_bin_assets_check CHECK ((purge_after >= (deleted_at + '15 days'::interval)));

alter table deleted_files add constraint store_recycle_bin_assets_pkey PRIMARY KEY (storage_path);

alter table deleted_files add constraint store_recycle_bin_assets_size_bytes_check CHECK ((size_bytes >= 0));

alter table subcategories add constraint store_subcategories_category_id_slug_key UNIQUE (category_id, slug);

alter table subcategories add constraint store_subcategories_delete_window_check CHECK ((((deleted_at IS NULL) AND (purge_after IS NULL) AND (deleted_from_is_active IS NULL)) OR ((deleted_at IS NOT NULL) AND (purge_after IS NOT NULL) AND (deleted_from_is_active IS NOT NULL) AND (purge_after >= (deleted_at + '15 days'::interval)))));

alter table subcategories add constraint store_subcategories_id_category_id_key UNIQUE (id, category_id);

alter table subcategories add constraint store_subcategories_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 100)));

alter table subcategories add constraint store_subcategories_pkey PRIMARY KEY (id);

alter table subcategories add constraint store_subcategories_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text));

alter table subcategories add constraint store_subcategories_sort_order_check CHECK ((sort_order >= 0));

alter table suppliers add constraint store_suppliers_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160)));

alter table suppliers add constraint store_suppliers_name_key UNIQUE (name);

alter table suppliers add constraint store_suppliers_pkey PRIMARY KEY (id);

alter table option_values add constraint store_variant_option_values_option_id_value_key UNIQUE (option_id, value);

alter table option_values add constraint store_variant_option_values_pkey PRIMARY KEY (id);

alter table option_values add constraint store_variant_option_values_sort_order_check CHECK ((sort_order >= 0));

alter table option_values add constraint store_variant_option_values_value_check CHECK (((length(TRIM(BOTH FROM value)) >= 1) AND (length(TRIM(BOTH FROM value)) <= 120)));

alter table product_options add constraint store_variant_options_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80)));

alter table product_options add constraint store_variant_options_pkey PRIMARY KEY (id);

alter table product_options add constraint store_variant_options_product_id_name_key UNIQUE (product_id, name);

alter table product_options add constraint store_variant_options_sort_order_check CHECK ((sort_order >= 0));

alter table variant_option_values add constraint store_variant_values_pkey PRIMARY KEY (variant_id, option_value_id);

alter table wishlist_items add constraint store_wishlist_items_pkey PRIMARY KEY (wishlist_id, product_id);

alter table wishlists add constraint store_wishlists_pkey PRIMARY KEY (id);

alter table wishlists add constraint store_wishlists_user_id_key UNIQUE (user_id);

alter table banners add constraint storefront_banners_pkey PRIMARY KEY (id);

alter table storefront_sections add constraint storefront_sections_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text));

alter table storefront_sections add constraint storefront_sections_pkey PRIMARY KEY (id);

alter table storefront_sections add constraint storefront_sections_section_key_key UNIQUE (section_key);

alter table ai_actions add constraint studio_ai_action_requests_action_type_check CHECK ((action_type = ANY (ARRAY['archive_product'::text, 'update_order_status'::text, 'send_invoice'::text, 'prepare_discount'::text])));

alter table ai_actions add constraint studio_ai_action_requests_idempotency_key_key UNIQUE (idempotency_key);

alter table ai_actions add constraint studio_ai_action_requests_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text));

alter table ai_actions add constraint studio_ai_action_requests_pkey PRIMARY KEY (id);

alter table ai_actions add constraint studio_ai_action_requests_result_check CHECK ((jsonb_typeof(result) = 'object'::text));

alter table ai_actions add constraint studio_ai_action_requests_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));

alter table ai_actions add constraint studio_ai_action_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'executing'::text, 'executed'::text, 'failed'::text, 'cancelled'::text])));

alter table automation_failure_notifications add constraint studio_automation_failure_notifications_pkey PRIMARY KEY (id);

alter table automation_failure_notifications add constraint studio_automation_failure_notifications_run_id_recipient_id_key UNIQUE (run_id, recipient_id);

alter table automation_failure_notifications add constraint studio_automation_failure_notifications_status_check CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'failed'::text])));

alter table automation_runs add constraint studio_automation_runs_pkey PRIMARY KEY (id);

alter table automation_runs add constraint studio_automation_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text])));

alter table automation_runs add constraint studio_automation_runs_trigger_check CHECK ((trigger = ANY (ARRAY['scheduled'::text, 'manual'::text])));

alter table automation_settings add constraint studio_automation_settings_cooldown_minutes_check CHECK (((cooldown_minutes >= 5) AND (cooldown_minutes <= 10080)));

alter table automation_settings add constraint studio_automation_settings_pkey PRIMARY KEY (job_name);

alter table email_events add constraint studio_email_events_attempts_check CHECK ((attempts >= 0));

alter table email_events add constraint studio_email_events_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text));

alter table email_events add constraint studio_email_events_pkey PRIMARY KEY (id);

alter table email_events add constraint studio_email_events_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'dead_letter'::text])));

alter table features add constraint studio_features_pkey PRIMARY KEY (feature_key);

alter table email_audit_logs add constraint studio_gmail_audit_events_action_check CHECK ((action = ANY (ARRAY['connect'::text, 'disconnect'::text, 'list'::text, 'read'::text, 'modify'::text, 'draft'::text, 'send'::text, 'attachment'::text])));

alter table email_audit_logs add constraint studio_gmail_audit_events_outcome_check CHECK ((outcome = ANY (ARRAY['started'::text, 'succeeded'::text, 'failed'::text, 'unknown'::text])));

alter table email_audit_logs add constraint studio_gmail_audit_events_pkey PRIMARY KEY (id);

alter table email_accounts add constraint studio_gmail_connections_connection_id_check CHECK ((connection_id = 'workspace'::text));

alter table email_accounts add constraint studio_gmail_connections_pkey PRIMARY KEY (connection_id);

alter table email_rate_limits add constraint studio_gmail_rate_limits_action_check CHECK ((action = ANY (ARRAY['send'::text, 'read'::text, 'list'::text, 'modify'::text, 'draft'::text, 'connect'::text, 'attachment'::text])));

alter table email_rate_limits add constraint studio_gmail_rate_limits_pkey PRIMARY KEY (actor_id, action, window_start);

alter table email_rate_limits add constraint studio_gmail_rate_limits_request_count_check CHECK ((request_count >= 0));

alter table email_sends add constraint studio_gmail_sends_actor_id_idempotency_key_key UNIQUE (actor_id, idempotency_key);

alter table email_sends add constraint studio_gmail_sends_pkey PRIMARY KEY (id);

alter table email_sends add constraint studio_gmail_sends_status_check CHECK ((status = ANY (ARRAY['started'::text, 'sent'::text, 'failed'::text, 'unknown'::text])));

alter table integrations add constraint studio_integrations_pkey PRIMARY KEY (provider);

alter table integrations add constraint studio_integrations_provider_check CHECK ((provider = ANY (ARRAY['gemini'::text, 'supabase'::text, 'gmail'::text, 'whatsapp'::text, 'ga4'::text, 'search_console'::text, 'instagram'::text, 'google_business'::text])));

alter table integrations add constraint studio_integrations_status_check CHECK ((status = ANY (ARRAY['connected'::text, 'error'::text])));

alter table stock_alerts add constraint studio_low_stock_alerts_location_id_variant_id_key UNIQUE (location_id, variant_id);

alter table stock_alerts add constraint studio_low_stock_alerts_pkey PRIMARY KEY (id);

alter table stock_alerts add constraint studio_low_stock_alerts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text])));

alter table notification_preferences add constraint studio_notification_preferences_pkey PRIMARY KEY (user_id);

alter table report_runs add constraint studio_notification_report_runs_pkey PRIMARY KEY (id);

alter table report_runs add constraint studio_notification_report_runs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text])));

alter table report_settings add constraint studio_notification_report_settings_pkey PRIMARY KEY (job_name);

alter table report_settings add constraint studio_notification_report_settings_send_hour_utc_check CHECK (((send_hour_utc >= 0) AND (send_hour_utc <= 23)));

alter table report_settings add constraint studio_notification_report_settings_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6)));

alter table permissions add constraint studio_permissions_key_check CHECK ((key ~ '^[a-z][a-z0-9_.:-]{1,80}$'::text));

alter table permissions add constraint studio_permissions_pkey PRIMARY KEY (key);

alter table role_permissions add constraint studio_role_permissions_pkey PRIMARY KEY (role, permission_key);

alter table role_permissions add constraint studio_role_permissions_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'staff'::text])));

alter table staff_sessions add constraint studio_sessions_device_type_check CHECK ((device_type = ANY (ARRAY['desktop'::text, 'mobile'::text, 'tablet'::text, 'unknown'::text])));

alter table staff_sessions add constraint studio_sessions_pkey PRIMARY KEY (id);

alter table health_acknowledgements add constraint studio_system_health_failure_acknow_failure_type_failure_id_key UNIQUE (failure_type, failure_id);

alter table health_acknowledgements add constraint studio_system_health_failure_acknowledgement_failure_type_check CHECK ((failure_type = ANY (ARRAY['automation'::text, 'email'::text])));

alter table health_acknowledgements add constraint studio_system_health_failure_acknowledgements_pkey PRIMARY KEY (id);

alter table health_acknowledgements add constraint studio_system_health_failure_acknowledgements_status_check CHECK ((status = ANY (ARRAY['acknowledged'::text, 'resolved'::text])));

alter table health_incidents add constraint studio_system_health_incidents_fingerprint_key UNIQUE (fingerprint);

alter table health_incidents add constraint studio_system_health_incidents_notification_attempts_check CHECK ((notification_attempts >= 0));

alter table health_incidents add constraint studio_system_health_incidents_pkey PRIMARY KEY (id);

alter table health_incidents add constraint studio_system_health_incidents_severity_check CHECK ((severity = ANY (ARRAY['degraded'::text, 'critical'::text])));

alter table health_incidents add constraint studio_system_health_incidents_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])));

alter table health_checks add constraint studio_system_health_runs_checks_check CHECK ((jsonb_typeof(checks) = 'array'::text));

alter table health_checks add constraint studio_system_health_runs_overall_check CHECK ((overall = ANY (ARRAY['healthy'::text, 'degraded'::text, 'critical'::text])));

alter table health_checks add constraint studio_system_health_runs_pkey PRIMARY KEY (id);

alter table health_checks add constraint studio_system_health_runs_summary_check CHECK ((jsonb_typeof(summary) = 'object'::text));

alter table health_checks add constraint studio_system_health_runs_trigger_check CHECK ((trigger = ANY (ARRAY['dashboard'::text, 'diagnostic'::text, 'scheduled'::text])));

alter table health_settings add constraint studio_system_health_sla_settings_failure_rate_max_check CHECK (((failure_rate_max >= (0)::numeric) AND (failure_rate_max <= (100)::numeric)));

alter table health_settings add constraint studio_system_health_sla_settings_id_check CHECK (id);

alter table health_settings add constraint studio_system_health_sla_settings_mttr_max_minutes_check CHECK ((mttr_max_minutes >= 0));

alter table health_settings add constraint studio_system_health_sla_settings_pkey PRIMARY KEY (id);

alter table health_settings add constraint studio_system_health_sla_settings_uptime_target_check CHECK (((uptime_target >= (0)::numeric) AND (uptime_target <= (100)::numeric)));

alter table staff_invites add constraint studio_team_invites_pkey PRIMARY KEY (id);

alter table staff_invites add constraint studio_team_invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text, 'email_failed'::text])));

alter table staff_permissions add constraint studio_user_permissions_pkey PRIMARY KEY (user_id, permission_key);

CREATE UNIQUE INDEX cms_content_handle_unique ON public.content_records USING btree (kind, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), handle);

CREATE INDEX cms_content_parent_idx ON public.content_records USING btree (parent_id);

CREATE UNIQUE INDEX cms_content_redirect_source_unique ON public.content_records USING btree (((data ->> 'from'::text))) WHERE (kind = 'redirects'::text);

CREATE INDEX cms_navigation_items_menu_idx ON public.menu_items USING btree (menu_id, "position");

CREATE INDEX cms_pages_status_idx ON public.pages USING btree (status, updated_at DESC);

CREATE INDEX customer_addresses_user_idx ON public.customer_addresses USING btree (user_id, is_default DESC);

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at DESC);

CREATE UNIQUE INDEX notifications_dedupe_key_idx ON public.notifications USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL);

CREATE UNIQUE INDEX notifications_event_key_idx ON public.notifications USING btree (event_key) WHERE (event_key IS NOT NULL);

CREATE INDEX notifications_recipient_created_idx ON public.notifications USING btree (recipient_id, created_at DESC);

CREATE INDEX notifications_recipient_unread_idx ON public.notifications USING btree (recipient_id, read, created_at DESC);

CREATE INDEX notifications_unread_idx ON public.notifications USING btree (read, created_at DESC);

CREATE INDEX store_audit_logs_entity_idx ON public.audit_logs USING btree (entity_type, entity_id, created_at DESC);

CREATE INDEX store_bundle_items_product_idx ON public.bundle_items USING btree (product_id);

CREATE INDEX store_bundles_status_idx ON public.bundles USING btree (status, updated_at DESC);

CREATE INDEX store_cart_items_cart_idx ON public.cart_items USING btree (cart_id);

CREATE INDEX store_categories_recycle_bin_idx ON public.categories USING btree (purge_after) WHERE (deleted_at IS NOT NULL);

CREATE INDEX store_checkout_requests_order_idx ON public.checkout_requests USING btree (order_id);

CREATE INDEX store_collection_products_product_idx ON public.collection_products USING btree (product_id);

CREATE INDEX store_customizations_customer_idx ON public.customizations USING btree (customer_id, created_at DESC);

CREATE INDEX store_customizations_product_idx ON public.customizations USING btree (product_id, template_id);

CREATE INDEX store_inventory_levels_variant_idx ON public.inventory_levels USING btree (variant_id);

CREATE INDEX store_inventory_movements_variant_idx ON public.inventory_movements USING btree (variant_id, created_at DESC);

CREATE INDEX store_inventory_reservations_expiry_idx ON public.inventory_reservations USING btree (expires_at, status) WHERE (status = 'reserved'::text);

CREATE INDEX store_inventory_reservations_order_idx ON public.inventory_reservations USING btree (order_id, status);

CREATE INDEX store_inventory_reservations_variant_idx ON public.inventory_reservations USING btree (variant_id, location_id, status);

CREATE INDEX store_inventory_transfers_status_idx ON public.transfers USING btree (status, created_at DESC);

CREATE INDEX store_media_assets_folder_idx ON public.files USING btree (folder, updated_at DESC);

CREATE INDEX store_order_items_order_idx ON public.order_items USING btree (order_id);

CREATE INDEX store_orders_created_at_idx ON public.orders USING btree (created_at DESC);

CREATE INDEX store_orders_customer_idx ON public.orders USING btree (customer_id, created_at DESC);

CREATE UNIQUE INDEX store_orders_idempotency_key_idx ON public.orders USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);

CREATE INDEX store_orders_status_idx ON public.orders USING btree (status);

CREATE INDEX store_payment_attempts_customer_idx ON public.payment_attempts USING btree (customer_id, created_at DESC);

CREATE INDEX store_payment_attempts_order_idx ON public.payment_attempts USING btree (order_id, created_at DESC);

CREATE INDEX store_payment_submissions_status_idx ON public.payment_submissions USING btree (status, created_at DESC);

CREATE INDEX store_product_digital_files_product_idx ON public.digital_files USING btree (product_id, sort_order);

CREATE UNIQUE INDEX store_product_media_one_primary_idx ON public.product_media USING btree (product_id) WHERE is_primary;

CREATE INDEX store_product_media_product_idx ON public.product_media USING btree (product_id, sort_order);

CREATE INDEX store_products_category_idx ON public.products USING btree (category_id);

CREATE INDEX store_products_recycle_bin_idx ON public.products USING btree (purge_after) WHERE (deleted_at IS NOT NULL);

CREATE INDEX store_products_status_idx ON public.products USING btree (status);

CREATE INDEX store_products_subcategory_idx ON public.products USING btree (subcategory_id);

CREATE INDEX store_purchase_order_items_variant_idx ON public.purchase_order_items USING btree (variant_id);

CREATE INDEX store_purchase_orders_status_idx ON public.purchase_orders USING btree (status, expected_at);

CREATE INDEX store_recycle_bin_assets_purge_idx ON public.deleted_files USING btree (purge_after);

CREATE INDEX store_subcategories_category_idx ON public.subcategories USING btree (category_id, sort_order, name);

CREATE INDEX store_subcategories_recycle_bin_idx ON public.subcategories USING btree (purge_after) WHERE (deleted_at IS NOT NULL);

CREATE INDEX store_variants_product_idx ON public.variants USING btree (product_id);

CREATE INDEX studio_ai_actions_requested_by_idx ON public.ai_actions USING btree (requested_by, requested_at DESC);

CREATE INDEX studio_ai_actions_status_idx ON public.ai_actions USING btree (status, requested_at DESC);

CREATE INDEX studio_automation_failure_notifications_created_idx ON public.automation_failure_notifications USING btree (created_at DESC);

CREATE INDEX studio_automation_runs_health_idx ON public.automation_runs USING btree (is_test, status, created_at DESC);

CREATE INDEX studio_automation_runs_job_created_idx ON public.automation_runs USING btree (job_name, created_at DESC);

CREATE INDEX studio_email_events_health_idx ON public.email_events USING btree (is_test, status, created_at DESC);

CREATE INDEX studio_email_events_recipient_idx ON public.email_events USING btree (recipient, created_at DESC);

CREATE INDEX studio_email_events_status_idx ON public.email_events USING btree (status, next_attempt_at, created_at DESC);

CREATE INDEX studio_gmail_audit_events_actor_created_idx ON public.email_audit_logs USING btree (actor_id, created_at DESC);

CREATE INDEX studio_gmail_audit_events_created_idx ON public.email_audit_logs USING btree (created_at DESC);

CREATE INDEX studio_health_failure_ack_status_idx ON public.health_acknowledgements USING btree (status, updated_at DESC);

CREATE INDEX studio_low_stock_alerts_status_idx ON public.stock_alerts USING btree (status, last_detected_at DESC);

CREATE INDEX studio_notification_report_runs_created_idx ON public.report_runs USING btree (created_at DESC);

CREATE INDEX studio_sessions_active_idx ON public.staff_sessions USING btree (user_id, revoked_at) WHERE (revoked_at IS NULL);

CREATE INDEX studio_sessions_user_last_seen_idx ON public.staff_sessions USING btree (user_id, last_seen_at DESC);

CREATE INDEX studio_system_health_incidents_severity_idx ON public.health_incidents USING btree (severity, created_at DESC);

CREATE INDEX studio_system_health_incidents_status_idx ON public.health_incidents USING btree (status, last_seen_at DESC);

CREATE INDEX studio_system_health_runs_created_idx ON public.health_checks USING btree (created_at DESC);

CREATE INDEX studio_system_health_runs_overall_idx ON public.health_checks USING btree (overall, created_at DESC);

CREATE INDEX studio_team_invites_email_idx ON public.staff_invites USING btree (lower(email));

CREATE UNIQUE INDEX studio_team_invites_pending_email_idx ON public.staff_invites USING btree (lower(email)) WHERE (status = 'pending'::text);

CREATE INDEX studio_team_invites_status_idx ON public.staff_invites USING btree (status, created_at DESC);

CREATE INDEX studio_user_permissions_user_idx ON public.staff_permissions USING btree (user_id);

alter table content_records add constraint cms_content_records_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES content_records(id) ON DELETE RESTRICT;

alter table menu_items add constraint cms_navigation_items_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE;

alter table pages add constraint cms_pages_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table store_settings add constraint cms_site_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table customer_addresses add constraint customer_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table notifications add constraint notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table accounts add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table audit_logs add constraint store_audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table bundle_items add constraint store_bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE;

alter table bundle_items add constraint store_bundle_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

alter table cart_items add constraint store_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE;

alter table cart_items add constraint store_cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id);

alter table carts add constraint store_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table checkout_requests add constraint store_checkout_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table checkout_requests add constraint store_checkout_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

alter table collection_products add constraint store_collection_products_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE;

alter table collection_products add constraint store_collection_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table customization_templates add constraint store_customization_templates_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

alter table customizations add constraint store_customizations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table customizations add constraint store_customizations_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table customizations add constraint store_customizations_template_id_fkey FOREIGN KEY (template_id) REFERENCES customization_templates(id) ON DELETE RESTRICT;

alter table inventory_levels add constraint store_inventory_levels_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;

alter table inventory_levels add constraint store_inventory_levels_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE;

alter table inventory_movements add constraint store_inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table inventory_movements add constraint store_inventory_movements_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id);

alter table inventory_movements add constraint store_inventory_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE SET NULL;

alter table inventory_reservations add constraint store_inventory_reservations_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT;

alter table inventory_reservations add constraint store_inventory_reservations_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

alter table inventory_reservations add constraint store_inventory_reservations_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT;

alter table inventory_reservations add constraint store_inventory_reservations_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE RESTRICT;

alter table transfer_items add constraint store_inventory_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE;

alter table transfer_items add constraint store_inventory_transfer_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE SET NULL;

alter table transfers add constraint store_inventory_transfers_from_location_id_fkey FOREIGN KEY (from_location_id) REFERENCES locations(id);

alter table transfers add constraint store_inventory_transfers_to_location_id_fkey FOREIGN KEY (to_location_id) REFERENCES locations(id);

alter table files add constraint store_media_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table order_items add constraint store_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

alter table order_items add constraint store_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

alter table order_items add constraint store_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE SET NULL;

alter table orders add constraint store_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table orders add constraint store_orders_payment_attempt_fk FOREIGN KEY (payment_attempt_id) REFERENCES payment_attempts(id) ON DELETE SET NULL;

alter table payment_attempts add constraint store_payment_attempts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table payment_attempts add constraint store_payment_attempts_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

alter table payment_submissions add constraint store_payment_submissions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table payment_submissions add constraint store_payment_submissions_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

alter table payment_submissions add constraint store_payment_submissions_payment_attempt_id_fkey FOREIGN KEY (payment_attempt_id) REFERENCES payment_attempts(id) ON DELETE RESTRICT;

alter table payment_submissions add constraint store_payment_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table digital_files add constraint store_product_digital_files_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table digital_files add constraint store_product_digital_files_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE;

alter table product_media add constraint store_product_media_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table product_media add constraint store_product_media_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE;

alter table variants add constraint store_product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table products add constraint store_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

alter table products add constraint store_products_subcategory_parent_fk FOREIGN KEY (subcategory_id, category_id) REFERENCES subcategories(id, category_id) ON DELETE RESTRICT;

alter table purchase_order_items add constraint store_purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;

alter table purchase_order_items add constraint store_purchase_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE SET NULL;

alter table purchase_orders add constraint store_purchase_orders_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id);

alter table purchase_orders add constraint store_purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

alter table deleted_files add constraint store_recycle_bin_assets_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table subcategories add constraint store_subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;

alter table option_values add constraint store_variant_option_values_option_id_fkey FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE;

alter table product_options add constraint store_variant_options_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table variant_option_values add constraint store_variant_values_option_value_id_fkey FOREIGN KEY (option_value_id) REFERENCES option_values(id) ON DELETE CASCADE;

alter table variant_option_values add constraint store_variant_values_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE;

alter table wishlist_items add constraint store_wishlist_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table wishlist_items add constraint store_wishlist_items_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE;

alter table wishlists add constraint store_wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table ai_actions add constraint studio_ai_action_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table ai_actions add constraint studio_ai_action_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table automation_failure_notifications add constraint studio_automation_failure_notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table automation_failure_notifications add constraint studio_automation_failure_notifications_run_id_fkey FOREIGN KEY (run_id) REFERENCES automation_runs(id) ON DELETE CASCADE;

alter table automation_runs add constraint studio_automation_runs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table automation_settings add constraint studio_automation_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table email_events add constraint studio_email_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table features add constraint studio_features_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table email_audit_logs add constraint studio_gmail_audit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table email_accounts add constraint studio_gmail_connections_connected_by_fkey FOREIGN KEY (connected_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table email_rate_limits add constraint studio_gmail_rate_limits_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table email_sends add constraint studio_gmail_sends_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table integrations add constraint studio_integrations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table stock_alerts add constraint studio_low_stock_alerts_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;

alter table stock_alerts add constraint studio_low_stock_alerts_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE;

alter table notification_preferences add constraint studio_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table report_runs add constraint studio_notification_report_runs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table report_settings add constraint studio_notification_report_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table role_permissions add constraint studio_role_permissions_permission_key_fkey FOREIGN KEY (permission_key) REFERENCES permissions(key) ON DELETE CASCADE;

alter table staff_sessions add constraint studio_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table health_acknowledgements add constraint studio_system_health_failure_acknowledgeme_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table health_acknowledgements add constraint studio_system_health_failure_acknowledgements_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table health_checks add constraint studio_system_health_runs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table health_settings add constraint studio_system_health_sla_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table staff_invites add constraint studio_team_invites_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table staff_invites add constraint studio_team_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES accounts(id) ON DELETE RESTRICT;

alter table staff_permissions add constraint studio_user_permissions_permission_key_fkey FOREIGN KEY (permission_key) REFERENCES permissions(key) ON DELETE CASCADE;

alter table staff_permissions add constraint studio_user_permissions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES accounts(id) ON DELETE SET NULL;

alter table staff_permissions add constraint studio_user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE;

CREATE TRIGGER studio_notify_inventory AFTER INSERT OR UPDATE ON public.inventory_levels FOR EACH ROW EXECUTE FUNCTION notify_record_change();

CREATE TRIGGER studio_notify_payment_submissions AFTER INSERT OR UPDATE ON public.payment_submissions FOR EACH ROW EXECUTE FUNCTION notify_record_change();

CREATE TRIGGER studio_notify_store_orders AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION notify_record_change();

CREATE TRIGGER studio_profile_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_account();

alter table public.content_records enable row level security;

alter table public.menu_items enable row level security;

alter table public.menus enable row level security;

alter table public.pages enable row level security;

alter table public.store_settings enable row level security;

alter table public.ai_actions enable row level security;

alter table public.automation_failure_notifications enable row level security;

alter table public.automation_runs enable row level security;

alter table public.automation_settings enable row level security;

alter table public.email_events enable row level security;

alter table public.features enable row level security;

alter table public.email_audit_logs enable row level security;

alter table public.email_accounts enable row level security;

alter table public.email_rate_limits enable row level security;

alter table public.email_sends enable row level security;

alter table public.integrations enable row level security;

alter table public.stock_alerts enable row level security;

alter table public.notification_preferences enable row level security;

alter table public.report_runs enable row level security;

alter table public.report_settings enable row level security;

alter table public.permissions enable row level security;

alter table public.role_permissions enable row level security;

alter table public.staff_sessions enable row level security;

alter table public.health_acknowledgements enable row level security;

alter table public.health_incidents enable row level security;

alter table public.health_checks enable row level security;

alter table public.health_settings enable row level security;

alter table public.staff_invites enable row level security;

alter table public.staff_permissions enable row level security;

alter table public.customer_addresses enable row level security;

alter table public.notifications enable row level security;

alter table public.accounts enable row level security;

alter table public.audit_logs enable row level security;

alter table public.bundle_items enable row level security;

alter table public.bundles enable row level security;

alter table public.cart_items enable row level security;

alter table public.carts enable row level security;

alter table public.categories enable row level security;

alter table public.checkout_requests enable row level security;

alter table public.collection_products enable row level security;

alter table public.collections enable row level security;

alter table public.customization_templates enable row level security;

alter table public.customizations enable row level security;

alter table public.inventory_levels enable row level security;

alter table public.locations enable row level security;

alter table public.inventory_movements enable row level security;

alter table public.inventory_reservations enable row level security;

alter table public.transfer_items enable row level security;

alter table public.transfers enable row level security;

alter table public.files enable row level security;

alter table public.order_items enable row level security;

alter table public.orders enable row level security;

alter table public.payment_attempts enable row level security;

alter table public.payment_methods enable row level security;

alter table public.payment_submissions enable row level security;

alter table public.digital_files enable row level security;

alter table public.product_media enable row level security;

alter table public.variants enable row level security;

alter table public.products enable row level security;

alter table public.purchase_order_items enable row level security;

alter table public.purchase_orders enable row level security;

alter table public.deleted_files enable row level security;

alter table public.subcategories enable row level security;

alter table public.suppliers enable row level security;

alter table public.option_values enable row level security;

alter table public.product_options enable row level security;

alter table public.variant_option_values enable row level security;

alter table public.wishlist_items enable row level security;

alter table public.wishlists enable row level security;

alter table public.banners enable row level security;

alter table public.storefront_sections enable row level security;

create policy content_delete on public.content_records as PERMISSIVE for DELETE to authenticated using ((((kind <> 'folders'::text) AND has_permission('content.manage'::text)) OR ((kind = 'folders'::text) AND has_permission('catalog.manage'::text))));

create policy content_insert on public.content_records as PERMISSIVE for INSERT to authenticated with check ((((kind <> 'folders'::text) AND has_permission('content.manage'::text)) OR ((kind = 'folders'::text) AND has_permission('catalog.manage'::text))));

create policy content_read on public.content_records as PERMISSIVE for SELECT to authenticated using ((((kind <> 'folders'::text) AND has_permission('content.read'::text)) OR ((kind = 'folders'::text) AND has_permission('catalog.read'::text))));

create policy content_update on public.content_records as PERMISSIVE for UPDATE to authenticated using ((((kind <> 'folders'::text) AND has_permission('content.manage'::text)) OR ((kind = 'folders'::text) AND has_permission('catalog.manage'::text)))) with check ((((kind <> 'folders'::text) AND has_permission('content.manage'::text)) OR ((kind = 'folders'::text) AND has_permission('catalog.manage'::text))));

create policy "Studio manage navigation items" on public.menu_items as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Studio manage navigation menus" on public.menus as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Published pages are public" on public.pages as PERMISSIVE for SELECT to public using (((status = 'published'::text) OR is_member()));

create policy "Studio manage pages" on public.pages as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Studio manage site settings" on public.store_settings as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "AI actions create" on public.ai_actions as PERMISSIVE for INSERT to authenticated with check (((requested_by = ( SELECT auth.uid() AS uid)) AND has_permission('automations.read'::text)));

create policy "AI actions manage" on public.ai_actions as PERMISSIVE for UPDATE to authenticated using (has_permission('automations.manage'::text)) with check (has_permission('automations.manage'::text));

create policy "AI actions read" on public.ai_actions as PERMISSIVE for SELECT to authenticated using (((requested_by = ( SELECT auth.uid() AS uid)) OR has_permission('automations.manage'::text)));

create policy "Studio create automation failure notifications" on public.automation_failure_notifications as PERMISSIVE for INSERT to authenticated with check (is_member());

create policy "Studio read automation failure notifications" on public.automation_failure_notifications as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio update automation failure notifications" on public.automation_failure_notifications as PERMISSIVE for UPDATE to authenticated using (is_member()) with check (is_member());

create policy "Studio create automation runs" on public.automation_runs as PERMISSIVE for INSERT to authenticated with check ((is_member() AND ((triggered_by IS NULL) OR (triggered_by = ( SELECT auth.uid() AS uid)))));

create policy "Studio read automation runs" on public.automation_runs as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio admins manage automation settings" on public.automation_settings as PERMISSIVE for ALL to authenticated using (is_admin()) with check (is_admin());

create policy "Studio read automation settings" on public.automation_settings as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio create email events" on public.email_events as PERMISSIVE for INSERT to authenticated with check ((is_member() AND (created_by = ( SELECT auth.uid() AS uid))));

create policy "Studio read email events" on public.email_events as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio update email events" on public.email_events as PERMISSIVE for UPDATE to authenticated using (is_member()) with check (is_member());

create policy "Gmail audit admin insert" on public.email_audit_logs as PERMISSIVE for INSERT to authenticated with check ((is_admin() AND (actor_id = ( SELECT auth.uid() AS uid))));

create policy "Gmail audit admin read" on public.email_audit_logs as PERMISSIVE for SELECT to authenticated using (is_admin());

create policy "Studio manage low stock alerts" on public.stock_alerts as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Studio read notification preferences" on public.notification_preferences as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Users manage own notification preferences" on public.notification_preferences as PERMISSIVE for ALL to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Studio admins create notification report runs" on public.report_runs as PERMISSIVE for INSERT to authenticated with check (is_admin());

create policy "Studio admins update notification report runs" on public.report_runs as PERMISSIVE for UPDATE to authenticated using (is_admin()) with check (is_admin());

create policy "Studio read notification report runs" on public.report_runs as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio admins manage notification report settings" on public.report_settings as PERMISSIVE for ALL to authenticated using (is_admin()) with check (is_admin());

create policy "Studio read notification report settings" on public.report_settings as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio members read permissions" on public.permissions as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Admins manage role permissions" on public.role_permissions as PERMISSIVE for ALL to authenticated using (is_admin()) with check (is_admin());

create policy "Studio manage health failure acknowledgements" on public.health_acknowledgements as PERMISSIVE for ALL to authenticated using (has_permission('system_health.manage'::text)) with check (has_permission('system_health.manage'::text));

create policy "Studio read health failure acknowledgements" on public.health_acknowledgements as PERMISSIVE for SELECT to authenticated using (has_permission('system_health.read'::text));

create policy "Studio read system health incidents" on public.health_incidents as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio read system health runs" on public.health_checks as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio manage health SLA settings" on public.health_settings as PERMISSIVE for ALL to authenticated using (has_permission('system_health.manage'::text)) with check (has_permission('system_health.manage'::text));

create policy "Studio read health SLA settings" on public.health_settings as PERMISSIVE for SELECT to authenticated using (has_permission('system_health.read'::text));

create policy "Studio admins read team invites" on public.staff_invites as PERMISSIVE for SELECT to authenticated using (is_admin());

create policy "Admins manage user permission overrides" on public.staff_permissions as PERMISSIVE for ALL to authenticated using (is_admin()) with check (is_admin());

create policy "Users read own permission overrides" on public.staff_permissions as PERMISSIVE for SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR is_admin()));

create policy "Own customer addresses" on public.customer_addresses as PERMISSIVE for ALL to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Permission create notifications" on public.notifications as PERMISSIVE for INSERT to authenticated with check (has_permission('notifications.manage'::text));

create policy "Permission delete notifications" on public.notifications as PERMISSIVE for DELETE to authenticated using (has_permission('notifications.manage'::text));

create policy "Permission manage notifications" on public.notifications as PERMISSIVE for UPDATE to authenticated using (has_permission('notifications.manage'::text)) with check (has_permission('notifications.manage'::text));

create policy "Permission read notifications" on public.notifications as PERMISSIVE for SELECT to authenticated using ((has_permission('notifications.read'::text) AND (recipient_id = ( SELECT auth.uid() AS uid))));

create policy "Permission update own notifications" on public.notifications as PERMISSIVE for UPDATE to authenticated using ((has_permission('notifications.read'::text) AND (recipient_id = ( SELECT auth.uid() AS uid)))) with check ((has_permission('notifications.read'::text) AND (recipient_id = ( SELECT auth.uid() AS uid))));

create policy "Studio create notifications" on public.notifications as PERMISSIVE for INSERT to authenticated with check (is_member());

create policy "Studio delete own notifications" on public.notifications as PERMISSIVE for DELETE to authenticated using ((recipient_id = ( SELECT auth.uid() AS uid)));

create policy "Studio read own notifications" on public.notifications as PERMISSIVE for SELECT to authenticated using ((recipient_id = ( SELECT auth.uid() AS uid)));

create policy "Studio update own notifications" on public.notifications as PERMISSIVE for UPDATE to authenticated using ((recipient_id = ( SELECT auth.uid() AS uid))) with check ((recipient_id = ( SELECT auth.uid() AS uid)));

create policy "Customers delete unregistered customization objects" on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'customer-customizations'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'::text) AND (NOT (EXISTS ( SELECT 1
   FROM customizations c
  WHERE ((c.object_path = objects.name) AND (c.status = ANY (ARRAY['ready'::text, 'consumed'::text]))))))));

create policy "Customers read own customization objects" on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'customer-customizations'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'::text)));

create policy "Customers update unregistered customization objects" on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'customer-customizations'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'::text) AND (NOT (EXISTS ( SELECT 1
   FROM customizations c
  WHERE ((c.object_path = objects.name) AND (c.status = ANY (ARRAY['ready'::text, 'consumed'::text])))))))) with check (((bucket_id = 'customer-customizations'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'::text) AND (NOT (EXISTS ( SELECT 1
   FROM customizations c
  WHERE ((c.object_path = objects.name) AND (c.status = ANY (ARRAY['ready'::text, 'consumed'::text]))))))));

create policy "Customers upload own customization objects" on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'customer-customizations'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|pdf)$'::text)));

create policy "Public read product media objects" on storage.objects as PERMISSIVE for SELECT to anon,authenticated using (((bucket_id = 'product-media'::text) AND (EXISTS ( SELECT 1
   FROM (product_media m
     JOIN products p ON ((p.id = m.product_id)))
  WHERE ((m.storage_path = objects.name) AND (p.status = 'active'::text))))));

create policy "Studio access customization objects" on storage.objects as PERMISSIVE for ALL to authenticated using (((bucket_id = 'customer-customizations'::text) AND is_member())) with check (((bucket_id = 'customer-customizations'::text) AND is_member()));

create policy "Studio delete product media objects" on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'product-media'::text) AND is_member() AND ((storage.foldername(name))[1] = 'products'::text) AND (array_length(storage.foldername(name), 1) = 3) AND ((storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp)$'::text) AND (EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id)::text = (storage.foldername(objects.name))[2])))));

create policy "Studio manage digital product objects" on storage.objects as PERMISSIVE for ALL to authenticated using (((bucket_id = 'digital-products'::text) AND is_member())) with check (((bucket_id = 'digital-products'::text) AND is_member()));

create policy "Studio update product media objects" on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'product-media'::text) AND is_member() AND ((storage.foldername(name))[1] = 'products'::text) AND (array_length(storage.foldername(name), 1) = 3) AND ((storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp)$'::text) AND (EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id)::text = (storage.foldername(objects.name))[2]))))) with check (((bucket_id = 'product-media'::text) AND is_member() AND ((storage.foldername(name))[1] = 'products'::text) AND (array_length(storage.foldername(name), 1) = 3) AND ((storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp)$'::text) AND (EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id)::text = (storage.foldername(objects.name))[2])))));

create policy "Studio upload product media objects" on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'product-media'::text) AND is_member() AND ((storage.foldername(name))[1] = 'products'::text) AND (array_length(storage.foldername(name), 1) = 3) AND ((storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp)$'::text) AND (EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id)::text = (storage.foldername(objects.name))[2])))));

create policy "Profiles self or studio read" on public.accounts as PERMISSIVE for SELECT to authenticated using (((id = ( SELECT auth.uid() AS uid)) OR is_member()));

create policy "Studio admins manage accounts" on public.accounts as PERMISSIVE for UPDATE to authenticated using (is_admin()) with check (is_admin());

create policy "Studio read audit logs" on public.audit_logs as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio write audit logs" on public.audit_logs as PERMISSIVE for INSERT to authenticated with check ((is_member() AND (actor_id = ( SELECT auth.uid() AS uid))));

create policy "Public published bundle items" on public.bundle_items as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM bundles b
  WHERE ((b.id = bundle_items.bundle_id) AND (b.status = 'published'::text)))));

create policy "Studio manage bundle items" on public.bundle_items as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Public published bundles" on public.bundles as PERMISSIVE for SELECT to public using ((status = 'published'::text));

create policy "Studio manage bundles" on public.bundles as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Own cart items" on public.cart_items as PERMISSIVE for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));

create policy "Own carts" on public.carts as PERMISSIVE for ALL to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Active store categories or studio read" on public.categories as PERMISSIVE for SELECT to public using ((is_active OR is_member()));

create policy "Permission manage store categories" on public.categories as PERMISSIVE for ALL to authenticated using (has_permission('catalog.manage'::text)) with check (has_permission('catalog.manage'::text));

create policy "Public published collection products" on public.collection_products as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM collections c
  WHERE ((c.id = collection_products.collection_id) AND (c.status = 'published'::text)))));

create policy "Studio manage collection products" on public.collection_products as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Public published collections" on public.collections as PERMISSIVE for SELECT to public using ((status = 'published'::text));

create policy "Studio manage collections" on public.collections as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Public templates" on public.customization_templates as PERMISSIVE for SELECT to public using ((status = 'published'::text));

create policy "Studio manage templates" on public.customization_templates as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Customers read own customizations" on public.customizations as PERMISSIVE for SELECT to authenticated using ((customer_id = ( SELECT auth.uid() AS uid)));

create policy "Customers register valid own customizations" on public.customizations as PERMISSIVE for INSERT to authenticated with check (is_valid_customer_customization_registration(customer_id, product_id, template_id, object_path, status));

create policy "Permission delete inventory levels" on public.inventory_levels as PERMISSIVE for DELETE to authenticated using (has_permission('inventory.manage'::text));

create policy "Permission read inventory levels" on public.inventory_levels as PERMISSIVE for SELECT to authenticated using ((has_permission('inventory.read'::text) OR has_permission('inventory.manage'::text)));

create policy "Permission update inventory levels" on public.inventory_levels as PERMISSIVE for UPDATE to authenticated using (has_permission('inventory.manage'::text)) with check (has_permission('inventory.manage'::text));

create policy "Permission write inventory levels" on public.inventory_levels as PERMISSIVE for INSERT to authenticated with check (has_permission('inventory.manage'::text));

create policy "Permission delete inventory locations" on public.locations as PERMISSIVE for DELETE to authenticated using (has_permission('inventory.manage'::text));

create policy "Permission read inventory locations" on public.locations as PERMISSIVE for SELECT to authenticated using ((has_permission('inventory.read'::text) OR has_permission('inventory.manage'::text)));

create policy "Permission update inventory locations" on public.locations as PERMISSIVE for UPDATE to authenticated using (has_permission('inventory.manage'::text)) with check (has_permission('inventory.manage'::text));

create policy "Permission write inventory locations" on public.locations as PERMISSIVE for INSERT to authenticated with check (has_permission('inventory.manage'::text));

create policy "Permission read inventory movements" on public.inventory_movements as PERMISSIVE for SELECT to authenticated using ((has_permission('inventory.read'::text) OR has_permission('inventory.manage'::text)));

create policy "Permission write inventory movements" on public.inventory_movements as PERMISSIVE for INSERT to authenticated with check (has_permission('inventory.manage'::text));

create policy "Studio read inventory reservations" on public.inventory_reservations as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Permission manage inventory transfer items" on public.transfer_items as PERMISSIVE for ALL to authenticated using (has_permission('inventory.manage'::text)) with check (has_permission('inventory.manage'::text));

create policy "Permission manage inventory transfers" on public.transfers as PERMISSIVE for ALL to authenticated using (has_permission('inventory.manage'::text)) with check (has_permission('inventory.manage'::text));

create policy "Studio manage media assets" on public.files as PERMISSIVE for ALL to authenticated using (has_permission('catalog.manage'::text)) with check (has_permission('catalog.manage'::text));

create policy "Studio read media assets" on public.files as PERMISSIVE for SELECT to authenticated using (has_permission('catalog.read'::text));

create policy "Customer read own order items" on public.order_items as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.customer_id = ( SELECT auth.uid() AS uid))))));

create policy "Studio read order items" on public.order_items as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Customer read own orders" on public.orders as PERMISSIVE for SELECT to authenticated using ((customer_id = ( SELECT auth.uid() AS uid)));

create policy "Permission read store orders" on public.orders as PERMISSIVE for SELECT to authenticated using (has_permission('orders.read'::text));

create policy "Permission update order status" on public.orders as PERMISSIVE for UPDATE to authenticated using (has_permission('orders.manage'::text)) with check (has_permission('orders.manage'::text));

create policy "Customers read own payment attempts" on public.payment_attempts as PERMISSIVE for SELECT to authenticated using (((customer_id = ( SELECT auth.uid() AS uid)) OR is_member()));

create policy "Studio read payment attempts" on public.payment_attempts as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Public enabled payment methods" on public.payment_methods as PERMISSIVE for SELECT to public using ((enabled = true));

create policy "Studio admins manage payment methods" on public.payment_methods as PERMISSIVE for ALL to authenticated using (is_admin()) with check (is_admin());

create policy "Customers read own payment submissions" on public.payment_submissions as PERMISSIVE for SELECT to authenticated using (((customer_id = ( SELECT auth.uid() AS uid)) OR is_member()));

create policy "Studio read payment submissions" on public.payment_submissions as PERMISSIVE for SELECT to authenticated using (is_member());

create policy "Studio manage digital product files" on public.digital_files as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Public product media" on public.product_media as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_media.product_id) AND (p.status = 'active'::text)))));

create policy "Studio manage product media" on public.product_media as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Active variants of active products or studio read" on public.variants as PERMISSIVE for SELECT to public using ((is_member() OR (is_active AND (EXISTS ( SELECT 1
   FROM products product
  WHERE ((product.id = variants.product_id) AND (product.status = 'active'::text)))))));

create policy "Permission manage store variants" on public.variants as PERMISSIVE for ALL to authenticated using (has_permission('catalog.manage'::text)) with check (has_permission('catalog.manage'::text));

create policy "Active store products or studio read" on public.products as PERMISSIVE for SELECT to public using (((status = 'active'::text) OR is_member()));

create policy "Permission manage store products" on public.products as PERMISSIVE for ALL to authenticated using (has_permission('catalog.manage'::text)) with check (has_permission('catalog.manage'::text));

create policy "Studio manage purchase order items" on public.purchase_order_items as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Studio manage purchase orders" on public.purchase_orders as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Studio manage recycled store assets" on public.deleted_files as PERMISSIVE for ALL to authenticated using (has_permission('catalog.manage'::text)) with check (has_permission('catalog.manage'::text));

create policy "Studio read recycled store assets" on public.deleted_files as PERMISSIVE for SELECT to authenticated using (has_permission('catalog.read'::text));

create policy "Public active store subcategories" on public.subcategories as PERMISSIVE for SELECT to public using ((is_active AND (EXISTS ( SELECT 1
   FROM categories c
  WHERE ((c.id = subcategories.category_id) AND c.is_active)))));

create policy "Studio manage store subcategories" on public.subcategories as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Studio manage suppliers" on public.suppliers as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Public active variant option values" on public.option_values as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM (product_options o
     JOIN products p ON ((p.id = o.product_id)))
  WHERE ((o.id = option_values.option_id) AND (p.status = 'active'::text)))));

create policy "Studio manage variant option values" on public.option_values as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Public active variant options" on public.product_options as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_options.product_id) AND (p.status = 'active'::text)))));

create policy "Studio manage variant options" on public.product_options as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Public active variant values" on public.variant_option_values as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM (variants v
     JOIN products p ON ((p.id = v.product_id)))
  WHERE ((v.id = variant_option_values.variant_id) AND v.is_active AND (p.status = 'active'::text)))));

create policy "Studio manage variant values" on public.variant_option_values as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Own wishlist items" on public.wishlist_items as PERMISSIVE for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM wishlists w
  WHERE ((w.id = wishlist_items.wishlist_id) AND (w.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM wishlists w
  WHERE ((w.id = wishlist_items.wishlist_id) AND (w.user_id = ( SELECT auth.uid() AS uid))))));

create policy "Own wishlists" on public.wishlists as PERMISSIVE for ALL to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Public storefront banners" on public.banners as PERMISSIVE for SELECT to public using (is_published);

create policy "Studio manage storefront banners" on public.banners as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

create policy "Public storefront sections" on public.storefront_sections as PERMISSIVE for SELECT to public using (is_published);

create policy "Studio manage storefront sections" on public.storefront_sections as PERMISSIVE for ALL to authenticated using (is_member()) with check (is_member());

revoke all on public.content_records from anon,authenticated;

revoke all on public.menu_items from anon,authenticated;

revoke all on public.menus from anon,authenticated;

revoke all on public.pages from anon,authenticated;

revoke all on public.store_settings from anon,authenticated;

revoke all on public.ai_actions from anon,authenticated;

revoke all on public.automation_failure_notifications from anon,authenticated;

revoke all on public.automation_runs from anon,authenticated;

revoke all on public.automation_settings from anon,authenticated;

revoke all on public.email_events from anon,authenticated;

revoke all on public.features from anon,authenticated;

revoke all on public.email_audit_logs from anon,authenticated;

revoke all on public.email_accounts from anon,authenticated;

revoke all on public.email_rate_limits from anon,authenticated;

revoke all on public.email_sends from anon,authenticated;

revoke all on public.integrations from anon,authenticated;

revoke all on public.stock_alerts from anon,authenticated;

revoke all on public.notification_preferences from anon,authenticated;

revoke all on public.report_runs from anon,authenticated;

revoke all on public.report_settings from anon,authenticated;

revoke all on public.permissions from anon,authenticated;

revoke all on public.role_permissions from anon,authenticated;

revoke all on public.staff_sessions from anon,authenticated;

revoke all on public.health_acknowledgements from anon,authenticated;

revoke all on public.health_incidents from anon,authenticated;

revoke all on public.health_checks from anon,authenticated;

revoke all on public.health_settings from anon,authenticated;

revoke all on public.staff_invites from anon,authenticated;

revoke all on public.staff_permissions from anon,authenticated;

revoke all on public.customer_addresses from anon,authenticated;

revoke all on public.notifications from anon,authenticated;

revoke all on public.accounts from anon,authenticated;

revoke all on public.audit_logs from anon,authenticated;

revoke all on public.bundle_items from anon,authenticated;

revoke all on public.bundles from anon,authenticated;

revoke all on public.cart_items from anon,authenticated;

revoke all on public.carts from anon,authenticated;

revoke all on public.categories from anon,authenticated;

revoke all on public.checkout_requests from anon,authenticated;

revoke all on public.collection_products from anon,authenticated;

revoke all on public.collections from anon,authenticated;

revoke all on public.customization_templates from anon,authenticated;

revoke all on public.customizations from anon,authenticated;

revoke all on public.inventory_levels from anon,authenticated;

revoke all on public.locations from anon,authenticated;

revoke all on public.inventory_movements from anon,authenticated;

revoke all on public.inventory_reservations from anon,authenticated;

revoke all on public.transfer_items from anon,authenticated;

revoke all on public.transfers from anon,authenticated;

revoke all on public.files from anon,authenticated;

revoke all on public.order_items from anon,authenticated;

revoke all on public.orders from anon,authenticated;

revoke all on public.payment_attempts from anon,authenticated;

revoke all on public.payment_methods from anon,authenticated;

revoke all on public.payment_submissions from anon,authenticated;

revoke all on public.digital_files from anon,authenticated;

revoke all on public.product_media from anon,authenticated;

revoke all on public.variants from anon,authenticated;

revoke all on public.products from anon,authenticated;

revoke all on public.purchase_order_items from anon,authenticated;

revoke all on public.purchase_orders from anon,authenticated;

revoke all on public.deleted_files from anon,authenticated;

revoke all on public.subcategories from anon,authenticated;

revoke all on public.suppliers from anon,authenticated;

revoke all on public.option_values from anon,authenticated;

revoke all on public.product_options from anon,authenticated;

revoke all on public.variant_option_values from anon,authenticated;

revoke all on public.wishlist_items from anon,authenticated;

revoke all on public.wishlists from anon,authenticated;

revoke all on public.banners from anon,authenticated;

revoke all on public.storefront_sections from anon,authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.content_records to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.content_records to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.menu_items to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.menu_items to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.menu_items to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.menus to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.menus to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.menus to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.pages to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.pages to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.pages to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.store_settings to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.store_settings to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.store_settings to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.ai_actions to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.ai_actions to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.ai_actions to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.automation_failure_notifications to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.automation_failure_notifications to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.automation_failure_notifications to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.automation_runs to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.automation_runs to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.automation_runs to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.automation_settings to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.automation_settings to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.automation_settings to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.email_events to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.email_events to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.email_events to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.features to service_role;

grant INSERT,SELECT on public.email_audit_logs to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.email_audit_logs to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.email_accounts to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.email_rate_limits to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.email_sends to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.integrations to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.stock_alerts to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.stock_alerts to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.stock_alerts to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.notification_preferences to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.notification_preferences to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.notification_preferences to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.report_runs to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.report_runs to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.report_runs to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.report_settings to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.report_settings to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.report_settings to service_role;

grant SELECT on public.permissions to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.permissions to service_role;

grant SELECT on public.role_permissions to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.role_permissions to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.staff_sessions to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_acknowledgements to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_acknowledgements to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_acknowledgements to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_incidents to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_incidents to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_incidents to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_checks to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_checks to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_checks to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_settings to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_settings to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.health_settings to service_role;

grant SELECT on public.staff_invites to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.staff_invites to service_role;

grant DELETE,INSERT,SELECT,UPDATE on public.staff_permissions to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.staff_permissions to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.customer_addresses to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.customer_addresses to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.customer_addresses to service_role;

grant DELETE,INSERT,SELECT,UPDATE on public.notifications to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.notifications to service_role;

grant SELECT on public.accounts to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.accounts to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.audit_logs to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.audit_logs to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.audit_logs to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.bundle_items to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.bundle_items to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.bundle_items to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.bundles to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.bundles to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.bundles to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.cart_items to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.cart_items to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.cart_items to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.carts to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.carts to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.carts to service_role;

grant SELECT on public.categories to anon;

grant DELETE,INSERT,SELECT,UPDATE on public.categories to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.categories to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.checkout_requests to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.collection_products to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.collection_products to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.collection_products to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.collections to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.collections to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.collections to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.customization_templates to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.customization_templates to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.customization_templates to service_role;

grant INSERT,SELECT on public.customizations to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.customizations to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.inventory_levels to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.inventory_levels to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.inventory_levels to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.locations to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.locations to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.locations to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.inventory_movements to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.inventory_movements to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.inventory_movements to service_role;

grant SELECT on public.inventory_reservations to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.inventory_reservations to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.transfer_items to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.transfer_items to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.transfer_items to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.transfers to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.transfers to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.transfers to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.files to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.files to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.files to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.order_items to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.order_items to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.order_items to service_role;

grant SELECT on public.orders to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.orders to service_role;

grant SELECT on public.payment_attempts to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.payment_attempts to service_role;

grant SELECT on public.payment_methods to anon;

grant SELECT on public.payment_methods to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.payment_methods to service_role;

grant SELECT on public.payment_submissions to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.payment_submissions to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.digital_files to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.digital_files to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.digital_files to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.product_media to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.product_media to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.product_media to service_role;

grant SELECT on public.variants to anon;

grant DELETE,INSERT,SELECT,UPDATE on public.variants to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.variants to service_role;

grant SELECT on public.products to anon;

grant DELETE,INSERT,SELECT,UPDATE on public.products to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.products to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.purchase_order_items to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.purchase_order_items to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.purchase_order_items to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.purchase_orders to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.purchase_orders to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.purchase_orders to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.deleted_files to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.deleted_files to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.deleted_files to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.subcategories to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.subcategories to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.subcategories to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.suppliers to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.suppliers to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.suppliers to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.option_values to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.option_values to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.option_values to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.product_options to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.product_options to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.product_options to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.variant_option_values to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.variant_option_values to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.variant_option_values to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.wishlist_items to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.wishlist_items to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.wishlist_items to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.wishlists to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.wishlists to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.wishlists to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.banners to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.banners to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.banners to service_role;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.storefront_sections to anon;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.storefront_sections to authenticated;

grant DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on public.storefront_sections to service_role;

insert into public.permissions(key,label,description,group_name,sort_order) values ('dashboard.read','View dashboard','View the CMS overview and workspace metrics.','Workspace',10),('content.read','View content','View works, journal stories, and publishing data.','Content',20),('content.manage','Manage content','Create, edit, publish, and delete works and journal stories.','Content',21),('catalog.read','View catalog','View products, categories, and storefront configuration.','Commerce',50),('catalog.manage','Manage catalog','Create, edit, archive, and delete products and categories.','Commerce',51),('inventory.read','View inventory','View inventory locations and stock levels.','Commerce',60),('inventory.manage','Manage inventory','Adjust stock, reorder points, and inventory locations.','Commerce',61),('orders.read','View orders','View store orders and payment status.','Commerce',70),('orders.manage','Manage orders','Update order and fulfilment status.','Commerce',71),('reports.read','View reports','View operational, sales, and accounting reports.','Insights',80),('notifications.read','View notifications','View and acknowledge workspace notifications.','System',90),('notifications.manage','Manage notifications','Configure notifications and recipient preferences.','System',91),('automations.read','View automation health','View scheduled job health and run history.','System',100),('automations.manage','Manage automations','Change automation settings and trigger manual runs.','System',101),('audit.read','View audit log','Review security and operational audit events.','System',110),('audit.write','Write audit events','Record audit events from Studio actions.','System',111),('team.read','View team','View team members and invitation history.','Team',120),('team.manage','Manage team','Invite, suspend, remove, and change team access.','Team',121),('settings.manage','Manage settings','Change workspace and integration settings.','System',130),('billing.read','View billing','View transactions, subscriptions, and disputes.','Finance',140),('billing.manage','Manage billing','Manage payment and billing records.','Finance',141),('system_health.read','View system health','View infrastructure, database, storage, SMTP, and automation health.','System',150),('system_health.manage','Run system diagnostics','Run on-demand read-only system diagnostics and record the result.','System',151),('email.read','Access email workspace','Read and organize the connected Gmail mailbox.','Workspace',15),('email.manage','Manage email workspace','Connect the Gmail account and send or manage messages.','Workspace',16),('customers.read','View clients','View the client directory.','Customers',30),('customers.manage','Manage clients','Create, edit, and delete client records.','Customers',31);

insert into public.role_permissions(role,permission_key,allowed) values ('admin','dashboard.read','t'),('admin','content.read','t'),('admin','content.manage','t'),('admin','catalog.read','t'),('admin','catalog.manage','t'),('admin','inventory.read','t'),('admin','inventory.manage','t'),('admin','orders.read','t'),('admin','orders.manage','t'),('admin','reports.read','t'),('admin','notifications.read','t'),('admin','notifications.manage','t'),('admin','automations.read','t'),('admin','automations.manage','t'),('admin','audit.read','t'),('admin','audit.write','t'),('admin','team.read','t'),('admin','team.manage','t'),('admin','settings.manage','t'),('admin','billing.read','t'),('admin','billing.manage','t'),('manager','dashboard.read','t'),('manager','content.read','t'),('manager','content.manage','t'),('manager','catalog.read','t'),('manager','catalog.manage','t'),('manager','inventory.read','t'),('manager','inventory.manage','t'),('manager','orders.read','t'),('manager','orders.manage','t'),('manager','reports.read','t'),('manager','notifications.read','t'),('manager','notifications.manage','t'),('manager','automations.read','t'),('manager','audit.read','t'),('manager','audit.write','t'),('manager','billing.read','t'),('staff','dashboard.read','t'),('staff','content.read','t'),('staff','content.manage','t'),('staff','catalog.read','t'),('staff','inventory.read','t'),('staff','orders.read','t'),('staff','notifications.read','t'),('staff','automations.read','t'),('staff','audit.write','t'),('admin','system_health.read','t'),('admin','system_health.manage','t'),('manager','system_health.read','t'),('manager','system_health.manage','t'),('admin','email.read','t'),('admin','email.manage','t'),('admin','customers.read','t'),('admin','customers.manage','t'),('manager','customers.read','t'),('manager','customers.manage','t'),('staff','customers.read','t');

insert into public.features(feature_key,display_name,description,enabled) values ('commerce','Commerce','Store, catalogue, inventory and orders.','t'),('email','Email workspace','Inbox, drafts and studio email delivery.','t'),('automation','Automation hub','Triggers, webhooks, retries and notifications.','t'),('analytics','Growth & analytics','GA4, Search Console and attribution reporting.','f'),('search_console','Search Console','Search queries, indexing signals and sitemap health.','t'),('content','Store content','Store pages, menus, blog posts, and media.','t');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('product-media','product-media','t','10485760','{image/jpeg,image/png,image/webp}'::text[]),('customer-customizations','customer-customizations','f','26214400','{image/jpeg,image/png,image/webp,application/pdf}'::text[]),('digital-products','digital-products','f','262144000','{application/pdf,application/zip,application/x-zip-compressed,application/octet-stream,audio/mpeg,video/mp4,text/plain}'::text[]) on conflict(id) do nothing;
revoke all on function public.order_summary() from public,anon,authenticated;
grant execute on function public.order_summary() to anon;
grant execute on function public.order_summary() to authenticated;
grant execute on function public.order_summary() to service_role;
revoke all on function public.replace_product_variants(p_product_id uuid, p_variants jsonb) from public,anon,authenticated;
grant execute on function public.replace_product_variants(p_product_id uuid, p_variants jsonb) to anon;
grant execute on function public.replace_product_variants(p_product_id uuid, p_variants jsonb) to authenticated;
grant execute on function public.replace_product_variants(p_product_id uuid, p_variants jsonb) to service_role;
revoke all on function public.is_admin() from public,anon,authenticated;
grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;
revoke all on function public.create_account() from public,anon,authenticated;
grant execute on function public.create_account() to service_role;
revoke all on function public.is_member() from public,anon,authenticated;
grant execute on function public.is_member() to anon;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_member() to service_role;
revoke all on function public.is_valid_customer_customization_registration(p_customer_id uuid, p_product_id uuid, p_template_id uuid, p_object_path text, p_status text) from public,anon,authenticated;
grant execute on function public.is_valid_customer_customization_registration(p_customer_id uuid, p_product_id uuid, p_template_id uuid, p_object_path text, p_status text) to authenticated;
grant execute on function public.is_valid_customer_customization_registration(p_customer_id uuid, p_product_id uuid, p_template_id uuid, p_object_path text, p_status text) to service_role;
revoke all on function public.create_transactional_checkout(p_customer_id uuid, p_idempotency_key text, p_request_fingerprint text, p_checkout jsonb) from public,anon,authenticated;
grant execute on function public.create_transactional_checkout(p_customer_id uuid, p_idempotency_key text, p_request_fingerprint text, p_checkout jsonb) to service_role;
revoke all on function public.variant_has_active_reservations(p_variant_id uuid) from public,anon,authenticated;
grant execute on function public.variant_has_active_reservations(p_variant_id uuid) to service_role;
revoke all on function public.save_product(p_action text, p_product_id uuid, p_expected_version bigint, p_product jsonb, p_variants jsonb, p_options jsonb) from public,anon,authenticated;
grant execute on function public.save_product(p_action text, p_product_id uuid, p_expected_version bigint, p_product jsonb, p_variants jsonb, p_options jsonb) to authenticated;
grant execute on function public.save_product(p_action text, p_product_id uuid, p_expected_version bigint, p_product jsonb, p_variants jsonb, p_options jsonb) to service_role;
revoke all on function public.release_order_reservations(p_order_id uuid) from public,anon,authenticated;
grant execute on function public.release_order_reservations(p_order_id uuid) to service_role;
revoke all on function public.receive_inventory_transfer(p_transfer_id uuid) from public,anon,authenticated;
grant execute on function public.receive_inventory_transfer(p_transfer_id uuid) to anon;
grant execute on function public.receive_inventory_transfer(p_transfer_id uuid) to authenticated;
grant execute on function public.receive_inventory_transfer(p_transfer_id uuid) to service_role;
revoke all on function public.release_order_reservations(p_order_id uuid, p_reason text) from public,anon,authenticated;
grant execute on function public.release_order_reservations(p_order_id uuid, p_reason text) to service_role;
revoke all on function public.expire_order_reservations(p_order_id uuid) from public,anon,authenticated;
grant execute on function public.expire_order_reservations(p_order_id uuid) to service_role;
revoke all on function public.fulfill_order_reservations(p_order_id uuid) from public,anon,authenticated;
grant execute on function public.fulfill_order_reservations(p_order_id uuid) to service_role;
revoke all on function public.cancel_order_with_reservations(p_order_id uuid) from public,anon,authenticated;
grant execute on function public.cancel_order_with_reservations(p_order_id uuid) to service_role;
revoke all on function public.permissions_for_current_user() from public,anon,authenticated;
grant execute on function public.permissions_for_current_user() to anon;
grant execute on function public.permissions_for_current_user() to authenticated;
grant execute on function public.permissions_for_current_user() to service_role;
revoke all on function public.assign_products_to_category(p_category_id uuid, p_subcategory_id uuid, p_product_ids uuid[]) from public,anon,authenticated;
grant execute on function public.assign_products_to_category(p_category_id uuid, p_subcategory_id uuid, p_product_ids uuid[]) to authenticated;
grant execute on function public.assign_products_to_category(p_category_id uuid, p_subcategory_id uuid, p_product_ids uuid[]) to service_role;
revoke all on function public.adjust_inventory(p_location_id uuid, p_variant_id uuid, p_on_hand integer, p_reorder_point integer) from public,anon,authenticated;
grant execute on function public.adjust_inventory(p_location_id uuid, p_variant_id uuid, p_on_hand integer, p_reorder_point integer) to authenticated;
grant execute on function public.adjust_inventory(p_location_id uuid, p_variant_id uuid, p_on_hand integer, p_reorder_point integer) to service_role;
revoke all on function public.get_automation_health() from public,anon,authenticated;
grant execute on function public.get_automation_health() to anon;
grant execute on function public.get_automation_health() to authenticated;
grant execute on function public.get_automation_health() to service_role;
revoke all on function public.has_permission(p_permission text) from public,anon,authenticated;
grant execute on function public.has_permission(p_permission text) to anon;
grant execute on function public.has_permission(p_permission text) to authenticated;
grant execute on function public.has_permission(p_permission text) to service_role;
revoke all on function public.prepare_manual_payment(p_order_id uuid, p_customer_id uuid, p_method_code text, p_idempotency_key text) from public,anon,authenticated;
grant execute on function public.prepare_manual_payment(p_order_id uuid, p_customer_id uuid, p_method_code text, p_idempotency_key text) to service_role;
revoke all on function public.create_transactional_checkout_with_payment(p_customer_id uuid, p_idempotency_key text, p_request_fingerprint text, p_checkout jsonb, p_payment_method text) from public,anon,authenticated;
grant execute on function public.create_transactional_checkout_with_payment(p_customer_id uuid, p_idempotency_key text, p_request_fingerprint text, p_checkout jsonb, p_payment_method text) to service_role;
revoke all on function public.submit_manual_payment_utr(p_attempt_id uuid, p_order_id uuid, p_customer_id uuid, p_utr text, p_amount numeric, p_paid_at timestamp with time zone, p_note text) from public,anon,authenticated;
grant execute on function public.submit_manual_payment_utr(p_attempt_id uuid, p_order_id uuid, p_customer_id uuid, p_utr text, p_amount numeric, p_paid_at timestamp with time zone, p_note text) to service_role;
revoke all on function public.verify_manual_payment(p_submission_id uuid, p_decision text, p_note text) from public,anon,authenticated;
grant execute on function public.verify_manual_payment(p_submission_id uuid, p_decision text, p_note text) to authenticated;
grant execute on function public.verify_manual_payment(p_submission_id uuid, p_decision text, p_note text) to service_role;
revoke all on function public.purge_expired_products() from public,anon,authenticated;
grant execute on function public.purge_expired_products() to anon;
grant execute on function public.purge_expired_products() to authenticated;
grant execute on function public.purge_expired_products() to service_role;
revoke all on function public.soft_delete_store_subcategory(p_subcategory_id uuid) from public,anon,authenticated;
grant execute on function public.soft_delete_store_subcategory(p_subcategory_id uuid) to anon;
grant execute on function public.soft_delete_store_subcategory(p_subcategory_id uuid) to authenticated;
grant execute on function public.soft_delete_store_subcategory(p_subcategory_id uuid) to service_role;
revoke all on function public.gmail_consume_rate_limit(p_action text, p_limit integer, p_window_seconds integer) from public,anon,authenticated;
grant execute on function public.gmail_consume_rate_limit(p_action text, p_limit integer, p_window_seconds integer) to anon;
grant execute on function public.gmail_consume_rate_limit(p_action text, p_limit integer, p_window_seconds integer) to authenticated;
grant execute on function public.gmail_consume_rate_limit(p_action text, p_limit integer, p_window_seconds integer) to service_role;
revoke all on function public.emit_notification(p_title text, p_message text, p_category text, p_type text, p_link text, p_event_key text, p_workspace text, p_metadata jsonb) from public,anon,authenticated;
grant execute on function public.emit_notification(p_title text, p_message text, p_category text, p_type text, p_link text, p_event_key text, p_workspace text, p_metadata jsonb) to service_role;
revoke all on function public.purge_expired_store_categories() from public,anon,authenticated;
grant execute on function public.purge_expired_store_categories() to anon;
grant execute on function public.purge_expired_store_categories() to authenticated;
grant execute on function public.purge_expired_store_categories() to service_role;
revoke all on function public.receive_purchase_order(p_order_id uuid, p_receipts jsonb) from public,anon,authenticated;
grant execute on function public.receive_purchase_order(p_order_id uuid, p_receipts jsonb) to anon;
grant execute on function public.receive_purchase_order(p_order_id uuid, p_receipts jsonb) to authenticated;
grant execute on function public.receive_purchase_order(p_order_id uuid, p_receipts jsonb) to service_role;
revoke all on function public.sync_low_stock_alerts() from public,anon,authenticated;
grant execute on function public.sync_low_stock_alerts() to anon;
grant execute on function public.sync_low_stock_alerts() to authenticated;
grant execute on function public.sync_low_stock_alerts() to service_role;
revoke all on function public.sync_low_stock_alerts_scheduled() from public,anon,authenticated;
grant execute on function public.sync_low_stock_alerts_scheduled() to anon;
grant execute on function public.sync_low_stock_alerts_scheduled() to authenticated;
grant execute on function public.sync_low_stock_alerts_scheduled() to service_role;
revoke all on function public.trigger_weekly_notification_report_worker() from public,anon,authenticated;
grant execute on function public.trigger_weekly_notification_report_worker() to anon;
grant execute on function public.trigger_weekly_notification_report_worker() to authenticated;
grant execute on function public.trigger_weekly_notification_report_worker() to service_role;
revoke all on function public.soft_delete_store_category(p_category_id uuid) from public,anon,authenticated;
grant execute on function public.soft_delete_store_category(p_category_id uuid) to anon;
grant execute on function public.soft_delete_store_category(p_category_id uuid) to authenticated;
grant execute on function public.soft_delete_store_category(p_category_id uuid) to service_role;
revoke all on function public.get_notification_analytics() from public,anon,authenticated;
grant execute on function public.get_notification_analytics() to anon;
grant execute on function public.get_notification_analytics() to authenticated;
grant execute on function public.get_notification_analytics() to service_role;
revoke all on function public.queue_weekly_notification_report() from public,anon,authenticated;
grant execute on function public.queue_weekly_notification_report() to anon;
grant execute on function public.queue_weekly_notification_report() to authenticated;
grant execute on function public.queue_weekly_notification_report() to service_role;
revoke all on function public.restore_store_category(p_category_id uuid) from public,anon,authenticated;
grant execute on function public.restore_store_category(p_category_id uuid) to anon;
grant execute on function public.restore_store_category(p_category_id uuid) to authenticated;
grant execute on function public.restore_store_category(p_category_id uuid) to service_role;
revoke all on function public.restore_store_subcategory(p_subcategory_id uuid) from public,anon,authenticated;
grant execute on function public.restore_store_subcategory(p_subcategory_id uuid) to anon;
grant execute on function public.restore_store_subcategory(p_subcategory_id uuid) to authenticated;
grant execute on function public.restore_store_subcategory(p_subcategory_id uuid) to service_role;
revoke all on function public.notify_record_change() from public,anon,authenticated;
grant execute on function public.notify_record_change() to service_role;
notify pgrst, 'reload schema';
commit;

-- Product workspace catalog management (20261102)
alter table public.products
  add column if not exists vendor text not null default '',
  add column if not exists merchandise_type text not null default '',
  add column if not exists tags text[] not null default '{}',
  add column if not exists sales_channels text[] not null default '{online_store}',
  add column if not exists catalogs text[] not null default '{General}',
  add column if not exists is_listed boolean not null default true;
alter table public.products add constraint products_known_channels check (sales_channels <@ array['online_store','point_of_sale']::text[]);

-- Metadata-only bulk writes never rewrite variants, prices, or inventory.
create or replace function public.manage_product_selection(p_ids uuid[], p_action text, p_values text[] default '{}', p_edits jsonb default '[]')
returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare affected integer; edit jsonb; target uuid;
begin
  if not public.has_permission('catalog.manage') then raise exception 'Catalog management permission required' using errcode='42501'; end if;
  if cardinality(p_ids) < 1 or cardinality(p_ids) > 500 then raise exception 'Select between 1 and 500 products'; end if;
  perform 1 from public.products where id=any(p_ids) order by id for update;
  if (select count(*) from public.products where id=any(p_ids) and deleted_at is null) <> cardinality(p_ids) then raise exception 'Selection changed. Reload and select available products.'; end if;
  if p_action='status' then
    if cardinality(p_values)<>1 or p_values[1] not in ('active','draft','archived') then raise exception 'Invalid status'; end if;
    if p_values[1]='active' and exists(select 1 from public.products p where p.id=any(p_ids) and (p.rights_status='review_required' or not exists(select 1 from public.categories c join public.subcategories s on s.category_id=c.id where c.id=p.category_id and s.id=p.subcategory_id and c.is_active and s.is_active and c.deleted_at is null and s.deleted_at is null))) then raise exception 'Active products require approved rights and an active category and subcategory'; end if;
    update public.products set status=p_values[1],updated_at=now(),write_version=write_version+1 where id=any(p_ids);
  elsif p_action='delete' then
    update public.products set deleted_from_status=status,status='archived',deleted_at=now(),purge_after=now()+interval '15 days',updated_at=now(),write_version=write_version+1 where id=any(p_ids);
  elsif p_action in ('unlist','list') then
    update public.products set is_listed=(p_action='list'),updated_at=now(),write_version=write_version+1 where id=any(p_ids);
  elsif p_action in ('add_tags','remove_tags','include_channels','exclude_channels','include_catalogs','exclude_catalogs') then
    if cardinality(p_values)<1 or cardinality(p_values)>50 or exists(select 1 from unnest(p_values) v where length(trim(v))=0 or length(v)>100) then raise exception 'Choose 1–50 values up to 100 characters'; end if;
    if p_action in ('include_channels','exclude_channels') and not p_values <@ array['online_store','point_of_sale']::text[] then raise exception 'Invalid sales channel'; end if;
    update public.products p set
      tags=case when p_action='add_tags' then array(select distinct v from unnest(p.tags||p_values) v order by v) when p_action='remove_tags' then array(select v from unnest(p.tags) v where not v=any(p_values)) else p.tags end,
      sales_channels=case when p_action='include_channels' then array(select distinct v from unnest(p.sales_channels||p_values) v order by v) when p_action='exclude_channels' then array(select v from unnest(p.sales_channels) v where not v=any(p_values)) else p.sales_channels end,
      catalogs=case when p_action='include_catalogs' then array(select distinct v from unnest(p.catalogs||p_values) v order by v) when p_action='exclude_catalogs' then array(select v from unnest(p.catalogs) v where not v=any(p_values)) else p.catalogs end,
      updated_at=now(),write_version=write_version+1 where p.id=any(p_ids);
  elsif p_action in ('add_collections','remove_collections') then
    if cardinality(p_values)<1 or exists(select 1 from unnest(p_values) v where not exists(select 1 from public.collections c where c.id::text=v)) then raise exception 'Choose existing collections'; end if;
    if p_action='add_collections' then
      insert into public.collection_products(collection_id,product_id) select v::uuid,p from unnest(p_values) v cross join unnest(p_ids) p on conflict do nothing;
    else delete from public.collection_products where product_id=any(p_ids) and collection_id::text=any(p_values); end if;
  elsif p_action='edit' then
    if jsonb_typeof(p_edits)<>'array' or jsonb_array_length(p_edits)<>cardinality(p_ids) then raise exception 'Provide one edit per selected product'; end if;
    for edit in select * from jsonb_array_elements(p_edits) loop
      target:=(edit->>'id')::uuid;
      if not target=any(p_ids) or length(trim(coalesce(edit->>'title','')))=0 or length(edit->>'title')>255 or length(coalesce(edit->>'vendor',''))>100 or length(coalesce(edit->>'merchandise_type',''))>100 then raise exception 'Check product titles, vendors, and product types'; end if;
      update public.products set title=trim(edit->>'title'),vendor=trim(coalesce(edit->>'vendor','')),merchandise_type=trim(coalesce(edit->>'merchandise_type','')),updated_at=now(),write_version=write_version+1 where id=target;
    end loop;
  else raise exception 'Unknown product action'; end if;
  affected:=cardinality(p_ids);
  insert into public.audit_logs(actor_id,action,entity_type,metadata) values(auth.uid(),'catalog.bulk_'||p_action,'product',jsonb_build_object('product_ids',p_ids,'values',p_values,'count',affected));
  return affected;
end $$;
revoke all on function public.manage_product_selection(uuid[],text,text[],jsonb) from public,anon;
grant execute on function public.manage_product_selection(uuid[],text,text[],jsonb) to authenticated;

create or replace function public.product_inventory_analytics(p_days integer default 30, p_currency text default 'INR')
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not public.has_permission('catalog.read') then raise exception 'Catalog access required' using errcode='42501'; end if;
 if p_days not in (1,7,30) then raise exception 'Invalid analytics period'; end if;
 with stock as (
  select p.id,p.title,p.product_type,case when p.product_type='digital' then null
   when exists(select 1 from public.variants v where v.product_id=p.id and v.is_active) then
    (select sum(coalesce((select sum(greatest(0,l.on_hand-l.reserved)) from public.inventory_levels l where l.variant_id=v.id),v.stock,0)) from public.variants v where v.product_id=p.id and v.is_active)
   else p.stock end::numeric as available
  from public.products p where p.deleted_at is null
 ), sold as (
  select oi.product_id,sum(oi.quantity)::numeric units,sum(oi.quantity*coalesce(oi.unit_price_minor,oi.unit_price_paise))/100.0 revenue
  from public.order_items oi join public.orders o on o.id=oi.order_id
  where o.payment_status='paid' and o.status not in ('cancelled','refunded') and o.created_at >= (date_trunc('day',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') - (p_days-1)*interval '1 day'
   and coalesce(oi.currency_code,oi.currency)=p_currency group by oi.product_id
 ), ranked as (
 select s.*,coalesce(d.units,0) units,coalesce(d.revenue,0) revenue,
 coalesce(sum(d.revenue) over(order by d.revenue desc nulls last,s.id rows between unbounded preceding and 1 preceding),0)/nullif(sum(d.revenue) over(),0) share
 from stock s left join sold d on d.product_id=s.id
 ), detail as (
 select *,case when share<0.8 then 'A' when share<0.95 then 'B' else 'C' end grade,
 case when available is not null and available+units>0 then round(100*units/(available+units),2) end sell_through,
 case when available is not null and units>0 then round(available/(units/p_days),1) end days_remaining from ranked
 ) select jsonb_build_object('days',p_days,'currency',p_currency,'sellThrough',round(avg(sell_through),2),'daysRemaining',round(avg(days_remaining),1),'cRevenue',coalesce(sum(revenue) filter(where grade='C'),0),'products',coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'stock',available,'units',units,'revenue',revenue,'grade',grade,'sellThrough',sell_through,'daysRemaining',days_remaining)),'[]')) into result from detail;
 return result;
end $$;
revoke all on function public.product_inventory_analytics(integer,text) from public,anon;
grant execute on function public.product_inventory_analytics(integer,text) to authenticated;
notify pgrst,'reload schema';

create policy product_online_publication on public.products as restrictive for select to anon,authenticated
using (public.is_member() or (status='active' and deleted_at is null and sales_channels @> array['online_store']::text[]));
-- Keep checkout authoritative even when called with a service-role client.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.create_transactional_checkout(uuid,text,text,jsonb)'::regprocedure) into definition;
 if position('if not found or v_product.status <> ''active'' then' in definition)=0 then raise exception 'Review checkout validation before applying channel enforcement'; end if;
 definition:=replace(definition,'if not found or v_product.status <> ''active'' then','if not found or v_product.status <> ''active'' or v_product.deleted_at is not null or not (v_product.sales_channels @> array[''online_store'']::text[]) then');
 execute definition;
end $$;
notify pgrst,'reload schema';

do $$
declare definition text;
begin
 select pg_get_functiondef('public.manage_product_selection(uuid[],text,text[],jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'if cardinality(p_ids) < 1 or cardinality(p_ids) > 500 then','if p_ids is null or cardinality(p_ids) < 1 or cardinality(p_ids) > 500 or (select count(distinct id) from unnest(p_ids) id) <> cardinality(p_ids) then');
 definition:=replace(definition,'if jsonb_typeof(p_edits)<>''array'' or jsonb_array_length(p_edits)<>cardinality(p_ids) then','if p_edits is null or jsonb_typeof(p_edits)<>''array'' or jsonb_array_length(p_edits)<>cardinality(p_ids) or (select count(distinct item->>''id'') from jsonb_array_elements(p_edits) item) <> cardinality(p_ids) then');
 definition:=replace(definition,'if not target=any(p_ids) or','if target is null or not target=any(p_ids) or');
 execute definition;
end $$;
notify pgrst,'reload schema';
