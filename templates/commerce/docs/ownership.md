# Commerce Template Ownership

This document states who owns each database and what may cross the boundary.

## Two databases, two owners

| Database | Owner | Holds |
| --- | --- | --- |
| Zerocraft Platform DB | Zerocraft | Central users, organizations, memberships, invitations, stores, OAuth connections, tenant mappings, jobs, template versions, audit |
| Customer commerce DB | The customer | One tenant's commerce data, installed from this template |

The Platform DB never stores a customer's products, orders, customers or
inventory. The customer DB never stores Platform users, OAuth tokens, jobs or
Platform audit logs.

## Data flow

```text
Browser → Admin app (Zerocraft) → Platform DB (identity, orgs, jobs)
                                      │
                                      ├─ OAuth token (encrypted, server only)
                                      └─ Supabase Management API
                                                │
                                      Customer Supabase project
                                      └─ commerce template schema
```

The customer application can read business data from its own project using the
customer's publishable key and an end-user JWT. It must never receive a
`service_role` key.

## What is deliberately shared by reference

| Value | Stored where | Notes |
| --- | --- | --- |
| Zerocraft organization id | `tenant_context.organization_id` | Not a foreign key; separate identity domain |
| Zerocraft store id | `stores.central_store_ref` | Reconciliation key |
| Zerocraft user id | `tenant_members.central_user_id` | Matched only after `iss`/`aud` verification |
| Taxonomy version and GIDs | `taxonomy_pin`, `taxonomy_root_selections`, `products.category_gid` | The catalogue itself stays in R2 |
| Media object key | `media.r2_key` | Bytes stay in R2 |
| Webhook signing secret | `webhook_endpoints.signing_secret_ref` | Secret value stays in Platform storage |

## Prohibited

- Copying Platform `organizations`, `profiles`, `audit_logs` or OAuth tables into
  a customer database.
- Storing service-role keys, database passwords, OAuth tokens, or webhook
  secrets in a customer database.
- Storing full Shopify taxonomy data per tenant.
- Reconstructing or fabricating the unrecoverable Platform migrations listed in
  `docs/architecture/database-ownership.md`.
- Installing the template into the Zerocraft Platform project
  (`ftcvyhlzeyqceosdqyxn` or any ref listed in `template.config.json`).

## Data deletion

Deleting a store cascades to its commerce rows. Deleting the tenant project is
performed by the customer through Supabase. Zerocraft removes the platform-side
mapping and revokes the OAuth token, but never silently deletes a project.
