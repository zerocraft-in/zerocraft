# Commerce Template Schema

**Template version:** 1.0.0  
**Physical schema:** `public`  
**Installed into:** a customer-owned Supabase project only

The template is single-tenant at the organization level and multi-store inside
that tenant. Every business row carries `store_id`, and every policy resolves
access through `private.can_access_store(store_id)`.

## Identity resolution

Two identity paths are supported and both end at `public.tenant_members`:

| Path | Column | When |
| --- | --- | --- |
| Customer Supabase Auth | `local_user_id` | The user signs in to the customer project directly |
| Zerocraft platform assertion | `central_user_id` | Zerocraft issues a verified JWT (`iss`/`aud` checked against `tenant_context`) |

`private.current_member_id()` first tries `auth.uid()`, then the trusted platform
claim. `user_metadata` is never used for authorization.

At least one of `central_user_id` or `local_user_id` must be present. Email is a
convenience attribute, not an identity key.

## Tables by domain

### Core and tenant context

| Table | Purpose |
| --- | --- |
| `stores` | Stores inside the tenant; exactly one default |
| `tenant_context` | One-row projection of the Platform organization/store |
| `tenant_settings` | Currency, timezone, invoice numbering, low-stock threshold |
| `commerce_template_migrations` | Local applied-file ledger (service role only) |
| `store_counters` | Monotonic per-store counters (service role only) |

### Identity and access

| Table | Purpose |
| --- | --- |
| `roles` | `owner`, `admin`, `manager`, `accountant`, `staff` with rank |
| `permissions` | Permission-key catalogue |
| `role_permissions` | Role → permission mapping |
| `tenant_members` | Tenant users, role, status, store scope |
| `tenant_member_stores` | Explicit store access when `all_stores = false` |

### Catalog

| Table | Purpose |
| --- | --- |
| `products` | Title, handle, status, taxonomy GID, tags, SEO, shipping flags |
| `variants` | Canonical variant model with integer paise prices |
| `product_options` | Up to three options per product |
| `product_option_values` | Normalized option values |
| `variant_option_values` | Variant ↔ option-value mapping |
| `product_public_id_registry` | Collision-proof 13-digit public IDs |
| `collections`, `collection_products` | Manual/smart collection membership |
| `media`, `product_images`, `product_image_variants`, `media_references` | R2 metadata and references only |
| `metafields` | Typed JSON metadata with an allowlisted type set |
| `taxonomy_root_selections`, `taxonomy_pin` | Pinned taxonomy version and enabled categories |

`public.product_variants` is a **read-only view** over `public.variants` for
backward compatibility. There is no second writable variant table.

### Inventory

| Table | Purpose |
| --- | --- |
| `locations` | Warehouses, retail stores, pop-ups |
| `inventory_items` | One row per variant; tracking and cost |
| `inventory_levels` | On-hand/committed/incoming/safety stock per location |
| `inventory_movements` | Append-only movement ledger |

Writes go through `public.adjust_inventory(...)`, which records the movement and
updates the level atomically and rejects negative on-hand stock.

### Customers and orders

`customers`, `customer_addresses`, `orders`, `order_line_items`,
`order_addresses` (snapshots), `order_adjustments`, `order_events`.

`orders.financial_status` is recalculated from captured payments and refunds.
`orders.fulfillment_status` is recalculated from fulfillment line quantities.

### Payments, shipping, channels, POS

`payments`, `refunds`, `payment_events` (no card data; a trigger rejects common
PAN/CVV keys in metadata), `shipping_profiles`, `shipping_zones`,
`shipping_rates`, `fulfillments`, `fulfillment_line_items`, `sales_channels`,
`product_publications`, `pos_devices`, `pos_register_sessions`,
`pos_cash_movements`, `pos_settings`.

### Audit, webhooks, outbox

`audit_logs` is append-only and written by SECURITY DEFINER triggers. Clients
with `audit.view` may read rows for stores they can access. `webhook_endpoints`
stores only `signing_secret_ref`; the secret itself lives in the Platform secret
store. `webhook_deliveries` and `outbox_events` are internal queues.

## RLS model

1. Table privileges are granted to `authenticated`, then filtered by RLS.
2. Every store-scoped table has select/insert/update/delete policies that
   require `private.can_access_store(store_id)`.
3. Mutations also require an explicit permission key (for example
   `products.manage`, `orders.manage`, `pos.operate`).
4. Ledgers (`audit_logs`, `inventory_movements`, `payment_events`,
   `pos_cash_movements`, `webhook_deliveries`) have **no** client write policy
   and no write grant.
5. `service_role` bypasses RLS by design and is used only by server code and the
   provisioning Worker.

## Money and time

- Money: `bigint` minor units named `*_paise`, plus an ISO-4217 `currency`.
- Time: `timestamptz`, stored in UTC. Display timezone is tenant configuration.
- Percentages: `numeric(5,2)`, never floats.
