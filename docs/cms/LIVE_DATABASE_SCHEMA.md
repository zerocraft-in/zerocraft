# Live database schema inventory

> Historical snapshot: this inventory predates the approved simple-name migration applied on November 1, 2026. Current public schema has 72 tables (71 application tables plus `schema_versions`). See `packages/supabase/store-identifier-map.json` for exact table/RPC renames. Verified preserved counts: products 59, variants 155, categories 22, orders 10, accounts 4. All 72 public tables have RLS enabled. A private pre-rename backup exists in `zc_backup_20261101_simple_names`.

Read from the connected Supabase project on November 1, 2026. This report contains schema metadata only, not table records.

## Schemas

| Schema | Tables | Views |
|---|---:|---:|
| auth | 27 | 0 |
| cron | 2 | 0 |
| extensions | 0 | 2 |
| graphql | 0 | 0 |
| graphql_public | 0 | 0 |
| net | 2 | 0 |
| public | 71 | 0 |
| realtime | 10 | 0 |
| storage | 8 | 0 |
| supabase_migrations | 1 | 0 |
| vault | 1 | 1 |
| zc_backup_20261101_store_only | 82 | 0 |

## Tables, columns and constraints

### auth

#### auth.audit_log_entries

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| instance_id | uuid | yes | — |
| id | uuid | no | — |
| payload | json | yes | — |
| created_at | timestamp with time zone | yes | — |
| ip_address | character varying(64) | no | ''::character varying |

Constraints:

- `audit_log_entries_pkey`: `PRIMARY KEY (id)`

#### auth.custom_oauth_providers

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| provider_type | text | no | — |
| identifier | text | no | — |
| name | text | no | — |
| client_id | text | no | — |
| client_secret | text | no | — |
| acceptable_client_ids | text[] | no | '{}'::text[] |
| scopes | text[] | no | '{}'::text[] |
| pkce_enabled | boolean | no | true |
| attribute_mapping | jsonb | no | '{}'::jsonb |
| authorization_params | jsonb | no | '{}'::jsonb |
| enabled | boolean | no | true |
| email_optional | boolean | no | false |
| issuer | text | yes | — |
| discovery_url | text | yes | — |
| skip_nonce_check | boolean | no | false |
| cached_discovery | jsonb | yes | — |
| discovery_cached_at | timestamp with time zone | yes | — |
| authorization_url | text | yes | — |
| token_url | text | yes | — |
| userinfo_url | text | yes | — |
| jwks_uri | text | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| custom_claims_allowlist | text[] | no | '{}'::text[] |

Constraints:

- `custom_oauth_providers_authorization_url_https`: `CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text)))`
- `custom_oauth_providers_authorization_url_length`: `CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048)))`
- `custom_oauth_providers_client_id_length`: `CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512)))`
- `custom_oauth_providers_discovery_url_length`: `CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048)))`
- `custom_oauth_providers_identifier_format`: `CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text))`
- `custom_oauth_providers_identifier_key`: `UNIQUE (identifier)`
- `custom_oauth_providers_issuer_length`: `CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048))))`
- `custom_oauth_providers_jwks_uri_https`: `CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text)))`
- `custom_oauth_providers_jwks_uri_length`: `CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048)))`
- `custom_oauth_providers_name_length`: `CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100)))`
- `custom_oauth_providers_oauth2_requires_endpoints`: `CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL))))`
- `custom_oauth_providers_oidc_discovery_url_https`: `CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text)))`
- `custom_oauth_providers_oidc_issuer_https`: `CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text)))`
- `custom_oauth_providers_oidc_requires_issuer`: `CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL)))`
- `custom_oauth_providers_pkey`: `PRIMARY KEY (id)`
- `custom_oauth_providers_provider_type_check`: `CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text])))`
- `custom_oauth_providers_token_url_https`: `CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text)))`
- `custom_oauth_providers_token_url_length`: `CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048)))`
- `custom_oauth_providers_userinfo_url_https`: `CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text)))`
- `custom_oauth_providers_userinfo_url_length`: `CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))`

#### auth.flow_state

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| user_id | uuid | yes | — |
| auth_code | text | yes | — |
| code_challenge_method | auth.code_challenge_method | yes | — |
| code_challenge | text | yes | — |
| provider_type | text | no | — |
| provider_access_token | text | yes | — |
| provider_refresh_token | text | yes | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |
| authentication_method | text | no | — |
| auth_code_issued_at | timestamp with time zone | yes | — |
| invite_token | text | yes | — |
| referrer | text | yes | — |
| oauth_client_state_id | uuid | yes | — |
| linking_target_id | uuid | yes | — |
| email_optional | boolean | no | false |

Constraints:

- `flow_state_pkey`: `PRIMARY KEY (id)`

#### auth.identities

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| provider_id | text | no | — |
| user_id | uuid | no | — |
| identity_data | jsonb | no | — |
| provider | text | no | — |
| last_sign_in_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |
| email | text | yes | lower((identity_data ->> 'email'::text)) |
| id | uuid | no | gen_random_uuid() |

Constraints:

- `identities_pkey`: `PRIMARY KEY (id)`
- `identities_provider_id_provider_unique`: `UNIQUE (provider_id, provider)`
- `identities_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### auth.instances

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| uuid | uuid | yes | — |
| raw_base_config | text | yes | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |

Constraints:

- `instances_pkey`: `PRIMARY KEY (id)`

#### auth.mfa_amr_claims

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| session_id | uuid | no | — |
| created_at | timestamp with time zone | no | — |
| updated_at | timestamp with time zone | no | — |
| authentication_method | text | no | — |
| id | uuid | no | — |

Constraints:

- `amr_id_pk`: `PRIMARY KEY (id)`
- `mfa_amr_claims_session_id_authentication_method_pkey`: `UNIQUE (session_id, authentication_method)`
- `mfa_amr_claims_session_id_fkey`: `FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE`

#### auth.mfa_challenges

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| factor_id | uuid | no | — |
| created_at | timestamp with time zone | no | — |
| verified_at | timestamp with time zone | yes | — |
| ip_address | inet | no | — |
| otp_code | text | yes | — |
| web_authn_session_data | jsonb | yes | — |

Constraints:

- `mfa_challenges_auth_factor_id_fkey`: `FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE`
- `mfa_challenges_pkey`: `PRIMARY KEY (id)`

#### auth.mfa_factors

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| user_id | uuid | no | — |
| friendly_name | text | yes | — |
| factor_type | auth.factor_type | no | — |
| status | auth.factor_status | no | — |
| created_at | timestamp with time zone | no | — |
| updated_at | timestamp with time zone | no | — |
| secret | text | yes | — |
| phone | text | yes | — |
| last_challenged_at | timestamp with time zone | yes | — |
| web_authn_credential | jsonb | yes | — |
| web_authn_aaguid | uuid | yes | — |
| last_webauthn_challenge_data | jsonb | yes | — |

Constraints:

- `mfa_factors_last_challenged_at_key`: `UNIQUE (last_challenged_at)`
- `mfa_factors_pkey`: `PRIMARY KEY (id)`
- `mfa_factors_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### auth.mfa_recovery_code_sets

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| user_id | uuid | no | — |
| mfa_factor_id | uuid | no | — |
| failed_verification_count | integer | no | 0 |
| verification_locked_until | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `mfa_recovery_code_sets_failed_verification_count_check`: `CHECK ((failed_verification_count >= 0))`
- `mfa_recovery_code_sets_mfa_factor_id_fkey`: `FOREIGN KEY (mfa_factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE`
- `mfa_recovery_code_sets_mfa_factor_id_key`: `UNIQUE (mfa_factor_id)`
- `mfa_recovery_code_sets_pkey`: `PRIMARY KEY (id)`
- `mfa_recovery_code_sets_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `mfa_recovery_code_sets_user_id_key`: `UNIQUE (user_id)`

#### auth.mfa_recovery_codes

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| mfa_recovery_code_set_id | uuid | no | — |
| code_hash | text | no | — |
| consumed_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `mfa_recovery_codes_mfa_recovery_code_set_id_fkey`: `FOREIGN KEY (mfa_recovery_code_set_id) REFERENCES auth.mfa_recovery_code_sets(id) ON DELETE CASCADE`
- `mfa_recovery_codes_pkey`: `PRIMARY KEY (id)`

#### auth.oauth_authorizations

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| authorization_id | text | no | — |
| client_id | uuid | no | — |
| user_id | uuid | yes | — |
| redirect_uri | text | no | — |
| scope | text | no | — |
| state | text | yes | — |
| resource | text | yes | — |
| code_challenge | text | yes | — |
| code_challenge_method | auth.code_challenge_method | yes | — |
| response_type | auth.oauth_response_type | no | 'code'::auth.oauth_response_type |
| status | auth.oauth_authorization_status | no | 'pending'::auth.oauth_authorization_status |
| authorization_code | text | yes | — |
| created_at | timestamp with time zone | no | now() |
| expires_at | timestamp with time zone | no | (now() + '00:03:00'::interval) |
| approved_at | timestamp with time zone | yes | — |
| nonce | text | yes | — |

Constraints:

- `oauth_authorizations_authorization_code_key`: `UNIQUE (authorization_code)`
- `oauth_authorizations_authorization_code_length`: `CHECK ((char_length(authorization_code) <= 255))`
- `oauth_authorizations_authorization_id_key`: `UNIQUE (authorization_id)`
- `oauth_authorizations_client_id_fkey`: `FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE`
- `oauth_authorizations_code_challenge_length`: `CHECK ((char_length(code_challenge) <= 128))`
- `oauth_authorizations_expires_at_future`: `CHECK ((expires_at > created_at))`
- `oauth_authorizations_nonce_length`: `CHECK ((char_length(nonce) <= 255))`
- `oauth_authorizations_pkey`: `PRIMARY KEY (id)`
- `oauth_authorizations_redirect_uri_length`: `CHECK ((char_length(redirect_uri) <= 2048))`
- `oauth_authorizations_resource_length`: `CHECK ((char_length(resource) <= 2048))`
- `oauth_authorizations_scope_length`: `CHECK ((char_length(scope) <= 4096))`
- `oauth_authorizations_state_length`: `CHECK ((char_length(state) <= 4096))`
- `oauth_authorizations_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### auth.oauth_client_states

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| provider_type | text | no | — |
| code_verifier | text | yes | — |
| created_at | timestamp with time zone | no | — |

Constraints:

- `oauth_client_states_pkey`: `PRIMARY KEY (id)`

#### auth.oauth_clients

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| client_secret_hash | text | yes | — |
| registration_type | auth.oauth_registration_type | no | — |
| redirect_uris | text | no | — |
| grant_types | text | no | — |
| client_name | text | yes | — |
| client_uri | text | yes | — |
| logo_uri | text | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| deleted_at | timestamp with time zone | yes | — |
| client_type | auth.oauth_client_type | no | 'confidential'::auth.oauth_client_type |
| token_endpoint_auth_method | text | no | — |

Constraints:

- `oauth_clients_client_name_length`: `CHECK ((char_length(client_name) <= 1024))`
- `oauth_clients_client_uri_length`: `CHECK ((char_length(client_uri) <= 2048))`
- `oauth_clients_logo_uri_length`: `CHECK ((char_length(logo_uri) <= 2048))`
- `oauth_clients_pkey`: `PRIMARY KEY (id)`
- `oauth_clients_token_endpoint_auth_method_check`: `CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))`

#### auth.oauth_consents

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| user_id | uuid | no | — |
| client_id | uuid | no | — |
| scopes | text | no | — |
| granted_at | timestamp with time zone | no | now() |
| revoked_at | timestamp with time zone | yes | — |

Constraints:

- `oauth_consents_client_id_fkey`: `FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE`
- `oauth_consents_pkey`: `PRIMARY KEY (id)`
- `oauth_consents_revoked_after_granted`: `CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at)))`
- `oauth_consents_scopes_length`: `CHECK ((char_length(scopes) <= 2048))`
- `oauth_consents_scopes_not_empty`: `CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))`
- `oauth_consents_user_client_unique`: `UNIQUE (user_id, client_id)`
- `oauth_consents_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### auth.one_time_tokens

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| user_id | uuid | no | — |
| token_type | auth.one_time_token_type | no | — |
| token_hash | text | no | — |
| relates_to | text | no | — |
| created_at | timestamp without time zone | no | now() |
| updated_at | timestamp without time zone | no | now() |
| expires_at | timestamp with time zone | yes | — |

Constraints:

- `one_time_tokens_pkey`: `PRIMARY KEY (id)`
- `one_time_tokens_token_hash_check`: `CHECK ((char_length(token_hash) > 0))`
- `one_time_tokens_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### auth.refresh_tokens

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| instance_id | uuid | yes | — |
| id | bigint | no | nextval('auth.refresh_tokens_id_seq'::regclass) |
| token | character varying(255) | yes | — |
| user_id | character varying(255) | yes | — |
| revoked | boolean | yes | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |
| parent | character varying(255) | yes | — |
| session_id | uuid | yes | — |

Constraints:

- `refresh_tokens_pkey`: `PRIMARY KEY (id)`
- `refresh_tokens_session_id_fkey`: `FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE`
- `refresh_tokens_token_unique`: `UNIQUE (token)`

#### auth.saml_providers

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| sso_provider_id | uuid | no | — |
| entity_id | text | no | — |
| metadata_xml | text | no | — |
| metadata_url | text | yes | — |
| attribute_mapping | jsonb | yes | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |
| name_id_format | text | yes | — |

Constraints:

- `entity_id not empty`: `CHECK ((char_length(entity_id) > 0))`
- `metadata_url not empty`: `CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0)))`
- `metadata_xml not empty`: `CHECK ((char_length(metadata_xml) > 0))`
- `saml_providers_entity_id_key`: `UNIQUE (entity_id)`
- `saml_providers_pkey`: `PRIMARY KEY (id)`
- `saml_providers_sso_provider_id_fkey`: `FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE`

#### auth.saml_relay_states

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| sso_provider_id | uuid | no | — |
| request_id | text | no | — |
| for_email | text | yes | — |
| redirect_to | text | yes | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |
| flow_state_id | uuid | yes | — |

Constraints:

- `request_id not empty`: `CHECK ((char_length(request_id) > 0))`
- `saml_relay_states_flow_state_id_fkey`: `FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE`
- `saml_relay_states_pkey`: `PRIMARY KEY (id)`
- `saml_relay_states_sso_provider_id_fkey`: `FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE`

#### auth.schema_migrations

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| version | character varying(255) | no | — |

Constraints:

- `schema_migrations_pkey`: `PRIMARY KEY (version)`

#### auth.scim_tokens

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| sso_provider_id | uuid | no | — |
| token_hash | text | no | — |
| prefix | text | no | — |
| created_at | timestamp with time zone | no | now() |
| expires_at | timestamp with time zone | yes | — |
| revoked_at | timestamp with time zone | yes | — |
| last_used_at | timestamp with time zone | yes | — |

Constraints:

- `scim_tokens_expires_at_future`: `CHECK (((expires_at IS NULL) OR (expires_at > created_at)))`
- `scim_tokens_pkey`: `PRIMARY KEY (id)`
- `scim_tokens_revoked_after_created`: `CHECK (((revoked_at IS NULL) OR (revoked_at >= created_at)))`
- `scim_tokens_sso_provider_id_fkey`: `FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE`
- `scim_tokens_token_hash_check`: `CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text))`

#### auth.scim_users

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| sso_provider_id | uuid | no | — |
| user_id | uuid | yes | — |
| resource | jsonb | no | — |
| user_name | text | no | lower((resource ->> 'userName'::text)) |
| external_id | text | yes | (resource ->> 'externalId'::text) |
| active | boolean | no | COALESCE(((resource ->> 'active'::text))::boolean, true) |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| deleted_at | timestamp with time zone | yes | — |

Constraints:

- `scim_users_pkey`: `PRIMARY KEY (id)`
- `scim_users_sso_provider_id_fkey`: `FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE`
- `scim_users_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL`

#### auth.sessions

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| user_id | uuid | no | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |
| factor_id | uuid | yes | — |
| aal | auth.aal_level | yes | — |
| not_after | timestamp with time zone | yes | — |
| refreshed_at | timestamp without time zone | yes | — |
| user_agent | text | yes | — |
| ip | inet | yes | — |
| tag | text | yes | — |
| oauth_client_id | uuid | yes | — |
| refresh_token_hmac_key | text | yes | — |
| refresh_token_counter | bigint | yes | — |
| scopes | text | yes | — |

Constraints:

- `sessions_oauth_client_id_fkey`: `FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE`
- `sessions_pkey`: `PRIMARY KEY (id)`
- `sessions_scopes_length`: `CHECK ((char_length(scopes) <= 4096))`
- `sessions_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### auth.sso_domains

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| sso_provider_id | uuid | no | — |
| domain | text | no | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |

Constraints:

- `domain not empty`: `CHECK ((char_length(domain) > 0))`
- `sso_domains_pkey`: `PRIMARY KEY (id)`
- `sso_domains_sso_provider_id_fkey`: `FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE`

#### auth.sso_providers

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| resource_id | text | yes | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |
| disabled | boolean | yes | — |

Constraints:

- `resource_id not empty`: `CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))`
- `sso_providers_pkey`: `PRIMARY KEY (id)`

#### auth.users

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| instance_id | uuid | yes | — |
| id | uuid | no | — |
| aud | character varying(255) | yes | — |
| role | character varying(255) | yes | — |
| email | character varying(255) | yes | — |
| encrypted_password | character varying(255) | yes | — |
| email_confirmed_at | timestamp with time zone | yes | — |
| invited_at | timestamp with time zone | yes | — |
| confirmation_token | character varying(255) | yes | — |
| confirmation_sent_at | timestamp with time zone | yes | — |
| recovery_token | character varying(255) | yes | — |
| recovery_sent_at | timestamp with time zone | yes | — |
| email_change_token_new | character varying(255) | yes | — |
| email_change | character varying(255) | yes | — |
| email_change_sent_at | timestamp with time zone | yes | — |
| last_sign_in_at | timestamp with time zone | yes | — |
| raw_app_meta_data | jsonb | yes | — |
| raw_user_meta_data | jsonb | yes | — |
| is_super_admin | boolean | yes | — |
| created_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | yes | — |
| phone | text | yes | NULL::character varying |
| phone_confirmed_at | timestamp with time zone | yes | — |
| phone_change | text | yes | ''::character varying |
| phone_change_token | character varying(255) | yes | ''::character varying |
| phone_change_sent_at | timestamp with time zone | yes | — |
| confirmed_at | timestamp with time zone | yes | LEAST(email_confirmed_at, phone_confirmed_at) |
| email_change_token_current | character varying(255) | yes | ''::character varying |
| email_change_confirm_status | smallint | yes | 0 |
| banned_until | timestamp with time zone | yes | — |
| reauthentication_token | character varying(255) | yes | ''::character varying |
| reauthentication_sent_at | timestamp with time zone | yes | — |
| is_sso_user | boolean | no | false |
| deleted_at | timestamp with time zone | yes | — |
| is_anonymous | boolean | no | false |

Constraints:

- `users_email_change_confirm_status_check`: `CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))`
- `users_phone_key`: `UNIQUE (phone)`
- `users_pkey`: `PRIMARY KEY (id)`

#### auth.webauthn_challenges

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | yes | — |
| challenge_type | text | no | — |
| session_data | jsonb | no | — |
| created_at | timestamp with time zone | no | now() |
| expires_at | timestamp with time zone | no | — |

Constraints:

- `webauthn_challenges_challenge_type_check`: `CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))`
- `webauthn_challenges_pkey`: `PRIMARY KEY (id)`
- `webauthn_challenges_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### auth.webauthn_credentials

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no | — |
| credential_id | bytea | no | — |
| public_key | bytea | no | — |
| attestation_type | text | no | ''::text |
| aaguid | uuid | yes | — |
| sign_count | bigint | no | 0 |
| transports | jsonb | no | '[]'::jsonb |
| backup_eligible | boolean | no | false |
| backed_up | boolean | no | false |
| friendly_name | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| last_used_at | timestamp with time zone | yes | — |

Constraints:

- `webauthn_credentials_pkey`: `PRIMARY KEY (id)`
- `webauthn_credentials_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### cron

#### cron.job

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| jobid | bigint | no | nextval('cron.jobid_seq'::regclass) |
| schedule | text | no | — |
| command | text | no | — |
| nodename | text | no | 'localhost'::text |
| nodeport | integer | no | inet_server_port() |
| database | text | no | current_database() |
| username | text | no | CURRENT_USER |
| active | boolean | no | true |
| jobname | text | yes | — |

Constraints:

- `job_pkey`: `PRIMARY KEY (jobid)`
- `jobname_username_uniq`: `UNIQUE (jobname, username)`

#### cron.job_run_details

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| jobid | bigint | yes | — |
| runid | bigint | no | nextval('cron.runid_seq'::regclass) |
| job_pid | integer | yes | — |
| database | text | yes | — |
| username | text | yes | — |
| command | text | yes | — |
| status | text | yes | — |
| return_message | text | yes | — |
| start_time | timestamp with time zone | yes | — |
| end_time | timestamp with time zone | yes | — |

Constraints:

- `job_run_details_pkey`: `PRIMARY KEY (runid)`

### net

#### net._http_response

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | yes | — |
| status_code | integer | yes | — |
| content_type | text | yes | — |
| headers | jsonb | yes | — |
| content | text | yes | — |
| timed_out | boolean | yes | — |
| error_msg | text | yes | — |
| created | timestamp with time zone | no | now() |

#### net.http_request_queue

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | no | nextval('net.http_request_queue_id_seq'::regclass) |
| method | net.http_method | no | — |
| url | text | no | — |
| headers | jsonb | yes | — |
| body | bytea | yes | — |
| timeout_milliseconds | integer | no | — |

### public

#### public.cms_content_records

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| kind | text | no | — |
| title | text | no | — |
| handle | text | no | — |
| status | text | no | 'draft'::text |
| parent_id | uuid | yes | — |
| data | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_content_records_check`: `CHECK (((kind = ANY (ARRAY['articles'::text, 'entries'::text])) = (parent_id IS NOT NULL)))`
- `cms_content_records_data_check`: `CHECK ((jsonb_typeof(data) = 'object'::text))`
- `cms_content_records_handle_check`: `CHECK (((handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text) AND (length(handle) <= 120)))`
- `cms_content_records_kind_check`: `CHECK ((kind = ANY (ARRAY['folders'::text, 'menus'::text, 'redirects'::text, 'blogs'::text, 'articles'::text, 'definitions'::text, 'entries'::text])))`
- `cms_content_records_parent_id_fkey`: `FOREIGN KEY (parent_id) REFERENCES cms_content_records(id) ON DELETE RESTRICT`
- `cms_content_records_pkey`: `PRIMARY KEY (id)`
- `cms_content_records_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text])))`
- `cms_content_records_title_check`: `CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 200)))`

#### public.cms_navigation_items

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| menu_id | uuid | no | — |
| label | text | no | — |
| href | text | no | — |
| position | integer | no | 0 |
| visible | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_navigation_items_label_check`: `CHECK (((length(TRIM(BOTH FROM label)) >= 1) AND (length(TRIM(BOTH FROM label)) <= 100)))`
- `cms_navigation_items_menu_id_fkey`: `FOREIGN KEY (menu_id) REFERENCES cms_navigation_menus(id) ON DELETE CASCADE`
- `cms_navigation_items_pkey`: `PRIMARY KEY (id)`

#### public.cms_navigation_menus

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| location | text | no | 'header'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_navigation_menus_name_key`: `UNIQUE (name)`
- `cms_navigation_menus_pkey`: `PRIMARY KEY (id)`

#### public.cms_pages

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| title | text | no | — |
| slug | text | no | — |
| excerpt | text | no | ''::text |
| content | text | no | ''::text |
| status | text | no | 'draft'::text |
| seo_title | text | no | ''::text |
| seo_description | text | no | ''::text |
| featured_image_url | text | no | ''::text |
| author_id | uuid | yes | — |
| published_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_pages_author_id_fkey`: `FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL`
- `cms_pages_pkey`: `PRIMARY KEY (id)`
- `cms_pages_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text))`
- `cms_pages_slug_key`: `UNIQUE (slug)`
- `cms_pages_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`
- `cms_pages_title_check`: `CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180)))`

#### public.cms_site_settings

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| setting_key | text | no | — |
| value | jsonb | no | '{}'::jsonb |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_site_settings_pkey`: `PRIMARY KEY (setting_key)`
- `cms_site_settings_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL`

#### public.commerce_ai_action_requests

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| action_type | text | no | — |
| title | text | no | — |
| description | text | no | ''::text |
| risk_level | text | no | 'medium'::text |
| status | text | no | 'pending'::text |
| payload | jsonb | no | '{}'::jsonb |
| result | jsonb | no | '{}'::jsonb |
| requested_by | uuid | no | — |
| reviewed_by | uuid | yes | — |
| review_note | text | no | ''::text |
| idempotency_key | text | no | — |
| requested_at | timestamp with time zone | no | now() |
| reviewed_at | timestamp with time zone | yes | — |
| executed_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_ai_action_requests_action_type_check`: `CHECK ((action_type = ANY (ARRAY['archive_product'::text, 'update_order_status'::text, 'send_invoice'::text, 'prepare_discount'::text])))`
- `studio_ai_action_requests_idempotency_key_key`: `UNIQUE (idempotency_key)`
- `studio_ai_action_requests_payload_check`: `CHECK ((jsonb_typeof(payload) = 'object'::text))`
- `studio_ai_action_requests_pkey`: `PRIMARY KEY (id)`
- `studio_ai_action_requests_requested_by_fkey`: `FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE CASCADE`
- `studio_ai_action_requests_result_check`: `CHECK ((jsonb_typeof(result) = 'object'::text))`
- `studio_ai_action_requests_reviewed_by_fkey`: `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `studio_ai_action_requests_risk_level_check`: `CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))`
- `studio_ai_action_requests_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'executing'::text, 'executed'::text, 'failed'::text, 'cancelled'::text])))`

#### public.commerce_automation_failure_notifications

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| run_id | uuid | no | — |
| recipient_id | uuid | no | — |
| recipient | text | no | — |
| status | text | no | 'sending'::text |
| last_error | text | yes | — |
| sent_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_automation_failure_notifications_pkey`: `PRIMARY KEY (id)`
- `studio_automation_failure_notifications_recipient_id_fkey`: `FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `studio_automation_failure_notifications_run_id_fkey`: `FOREIGN KEY (run_id) REFERENCES commerce_automation_runs(id) ON DELETE CASCADE`
- `studio_automation_failure_notifications_run_id_recipient_id_key`: `UNIQUE (run_id, recipient_id)`
- `studio_automation_failure_notifications_status_check`: `CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'failed'::text])))`

#### public.commerce_automation_runs

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| job_name | text | no | — |
| trigger | text | no | — |
| status | text | no | — |
| started_at | timestamp with time zone | no | now() |
| finished_at | timestamp with time zone | yes | — |
| active_low_stock_count | integer | yes | — |
| error_message | text | yes | — |
| triggered_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |
| is_test | boolean | no | false |

Constraints:

- `studio_automation_runs_pkey`: `PRIMARY KEY (id)`
- `studio_automation_runs_status_check`: `CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text])))`
- `studio_automation_runs_trigger_check`: `CHECK ((trigger = ANY (ARRAY['scheduled'::text, 'manual'::text])))`
- `studio_automation_runs_triggered_by_fkey`: `FOREIGN KEY (triggered_by) REFERENCES auth.users(id) ON DELETE SET NULL`

#### public.commerce_automation_settings

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| job_name | text | no | — |
| enabled | boolean | no | true |
| email_alerts_enabled | boolean | no | true |
| recipient_roles | text[] | no | ARRAY['admin'::text, 'manager'::text] |
| cooldown_minutes | integer | no | 60 |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_automation_settings_cooldown_minutes_check`: `CHECK (((cooldown_minutes >= 5) AND (cooldown_minutes <= 10080)))`
- `studio_automation_settings_pkey`: `PRIMARY KEY (job_name)`
- `studio_automation_settings_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL`

#### public.commerce_email_events

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| provider | text | no | 'smtp'::text |
| kind | text | no | — |
| recipient | text | no | — |
| subject | text | no | ''::text |
| status | text | no | 'queued'::text |
| attempts | integer | no | 0 |
| message_id | text | yes | — |
| last_error | text | yes | — |
| next_attempt_at | timestamp with time zone | yes | — |
| sent_at | timestamp with time zone | yes | — |
| metadata | jsonb | no | '{}'::jsonb |
| created_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| is_test | boolean | no | false |

Constraints:

- `studio_email_events_attempts_check`: `CHECK ((attempts >= 0))`
- `studio_email_events_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `studio_email_events_metadata_check`: `CHECK ((jsonb_typeof(metadata) = 'object'::text))`
- `studio_email_events_pkey`: `PRIMARY KEY (id)`
- `studio_email_events_status_check`: `CHECK ((status = ANY (ARRAY['queued'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'dead_letter'::text])))`

#### public.commerce_features

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| feature_key | text | no | — |
| display_name | text | no | — |
| description | text | no | ''::text |
| enabled | boolean | no | true |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_features_pkey`: `PRIMARY KEY (feature_key)`
- `studio_features_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL`

#### public.commerce_gmail_audit_events

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| actor_id | uuid | yes | — |
| action | text | no | — |
| outcome | text | no | — |
| gmail_message_id | text | yes | — |
| idempotency_key | uuid | yes | — |
| detail_code | text | yes | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_gmail_audit_events_action_check`: `CHECK ((action = ANY (ARRAY['connect'::text, 'disconnect'::text, 'list'::text, 'read'::text, 'modify'::text, 'draft'::text, 'send'::text, 'attachment'::text])))`
- `studio_gmail_audit_events_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL`
- `studio_gmail_audit_events_outcome_check`: `CHECK ((outcome = ANY (ARRAY['started'::text, 'succeeded'::text, 'failed'::text, 'unknown'::text])))`
- `studio_gmail_audit_events_pkey`: `PRIMARY KEY (id)`

#### public.commerce_gmail_connections

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| connection_id | text | no | — |
| email_address | text | no | — |
| encrypted_refresh_token | text | no | — |
| connected_by | uuid | no | — |
| connected_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_gmail_connections_connected_by_fkey`: `FOREIGN KEY (connected_by) REFERENCES auth.users(id) ON DELETE RESTRICT`
- `studio_gmail_connections_connection_id_check`: `CHECK ((connection_id = 'workspace'::text))`
- `studio_gmail_connections_pkey`: `PRIMARY KEY (connection_id)`

#### public.commerce_gmail_rate_limits

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| actor_id | uuid | no | — |
| action | text | no | — |
| window_start | timestamp with time zone | no | — |
| request_count | integer | no | 0 |

Constraints:

- `studio_gmail_rate_limits_action_check`: `CHECK ((action = ANY (ARRAY['send'::text, 'read'::text, 'list'::text, 'modify'::text, 'draft'::text, 'connect'::text, 'attachment'::text])))`
- `studio_gmail_rate_limits_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `studio_gmail_rate_limits_pkey`: `PRIMARY KEY (actor_id, action, window_start)`
- `studio_gmail_rate_limits_request_count_check`: `CHECK ((request_count >= 0))`

#### public.commerce_gmail_sends

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| actor_id | uuid | no | — |
| idempotency_key | uuid | no | — |
| status | text | no | — |
| gmail_message_id | text | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_gmail_sends_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `studio_gmail_sends_actor_id_idempotency_key_key`: `UNIQUE (actor_id, idempotency_key)`
- `studio_gmail_sends_pkey`: `PRIMARY KEY (id)`
- `studio_gmail_sends_status_check`: `CHECK ((status = ANY (ARRAY['started'::text, 'sent'::text, 'failed'::text, 'unknown'::text])))`

#### public.commerce_integrations

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| provider | text | no | — |
| display_name | text | no | — |
| status | text | no | 'connected'::text |
| encrypted_credentials | text | yes | — |
| last_verified_at | timestamp with time zone | yes | — |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |
| enabled | boolean | no | true |
| last_error | text | yes | — |
| metadata | jsonb | no | '{}'::jsonb |

Constraints:

- `studio_integrations_pkey`: `PRIMARY KEY (provider)`
- `studio_integrations_provider_check`: `CHECK ((provider = ANY (ARRAY['gemini'::text, 'supabase'::text, 'gmail'::text, 'whatsapp'::text, 'ga4'::text, 'search_console'::text, 'instagram'::text, 'google_business'::text])))`
- `studio_integrations_status_check`: `CHECK ((status = ANY (ARRAY['connected'::text, 'error'::text])))`
- `studio_integrations_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL`

#### public.commerce_low_stock_alerts

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| location_id | uuid | no | — |
| variant_id | uuid | no | — |
| last_on_hand | integer | no | 0 |
| last_reserved | integer | no | 0 |
| last_reorder_point | integer | no | 0 |
| status | text | no | 'active'::text |
| first_detected_at | timestamp with time zone | no | now() |
| last_detected_at | timestamp with time zone | no | now() |
| resolved_at | timestamp with time zone | yes | — |

Constraints:

- `studio_low_stock_alerts_location_id_fkey`: `FOREIGN KEY (location_id) REFERENCES store_inventory_locations(id) ON DELETE CASCADE`
- `studio_low_stock_alerts_location_id_variant_id_key`: `UNIQUE (location_id, variant_id)`
- `studio_low_stock_alerts_pkey`: `PRIMARY KEY (id)`
- `studio_low_stock_alerts_status_check`: `CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text])))`
- `studio_low_stock_alerts_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE CASCADE`

#### public.commerce_notification_preferences

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| user_id | uuid | no | — |
| automation_failure_enabled | boolean | no | true |
| low_stock_enabled | boolean | no | true |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_notification_preferences_pkey`: `PRIMARY KEY (user_id)`
- `studio_notification_preferences_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### public.commerce_notification_report_runs

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| job_name | text | no | 'studio-weekly-notification-report'::text |
| status | text | no | 'queued'::text |
| scheduled_for | timestamp with time zone | no | now() |
| period_start | timestamp with time zone | no | (now() - '7 days'::interval) |
| period_end | timestamp with time zone | no | now() |
| started_at | timestamp with time zone | yes | — |
| finished_at | timestamp with time zone | yes | — |
| recipient_count | integer | no | 0 |
| notification_count | integer | no | 0 |
| error_message | text | yes | — |
| triggered_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_notification_report_runs_pkey`: `PRIMARY KEY (id)`
- `studio_notification_report_runs_status_check`: `CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text])))`
- `studio_notification_report_runs_triggered_by_fkey`: `FOREIGN KEY (triggered_by) REFERENCES auth.users(id) ON DELETE SET NULL`

#### public.commerce_notification_report_settings

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| job_name | text | no | 'studio-weekly-notification-report'::text |
| enabled | boolean | no | false |
| weekday | integer | no | 1 |
| send_hour_utc | integer | no | 9 |
| recipient_roles | text[] | no | ARRAY['admin'::text] |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_notification_report_settings_pkey`: `PRIMARY KEY (job_name)`
- `studio_notification_report_settings_send_hour_utc_check`: `CHECK (((send_hour_utc >= 0) AND (send_hour_utc <= 23)))`
- `studio_notification_report_settings_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `studio_notification_report_settings_weekday_check`: `CHECK (((weekday >= 0) AND (weekday <= 6)))`

#### public.commerce_permissions

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| key | text | no | — |
| label | text | no | — |
| description | text | no | ''::text |
| group_name | text | no | — |
| sort_order | integer | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_permissions_key_check`: `CHECK ((key ~ '^[a-z][a-z0-9_.:-]{1,80}$'::text))`
- `studio_permissions_pkey`: `PRIMARY KEY (key)`

#### public.commerce_role_permissions

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| role | text | no | — |
| permission_key | text | no | — |
| allowed | boolean | no | false |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_role_permissions_permission_key_fkey`: `FOREIGN KEY (permission_key) REFERENCES commerce_permissions(key) ON DELETE CASCADE`
- `studio_role_permissions_pkey`: `PRIMARY KEY (role, permission_key)`
- `studio_role_permissions_role_check`: `CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'staff'::text])))`

#### public.commerce_sessions

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| user_id | uuid | no | — |
| device_label | text | no | 'Unknown device'::text |
| device_type | text | no | 'desktop'::text |
| browser | text | no | 'Unknown browser'::text |
| operating_system | text | no | 'Unknown OS'::text |
| user_agent | text | no | ''::text |
| ip_address | text | yes | — |
| first_seen_at | timestamp with time zone | no | now() |
| last_seen_at | timestamp with time zone | no | now() |
| revoked_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_sessions_device_type_check`: `CHECK ((device_type = ANY (ARRAY['desktop'::text, 'mobile'::text, 'tablet'::text, 'unknown'::text])))`
- `studio_sessions_pkey`: `PRIMARY KEY (id)`
- `studio_sessions_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### public.commerce_system_health_failure_acknowledgements

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| failure_type | text | no | — |
| failure_id | uuid | no | — |
| status | text | no | 'acknowledged'::text |
| notes | text | yes | — |
| acknowledged_by | uuid | yes | — |
| resolved_by | uuid | yes | — |
| acknowledged_at | timestamp with time zone | no | now() |
| resolved_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_system_health_failure_acknow_failure_type_failure_id_key`: `UNIQUE (failure_type, failure_id)`
- `studio_system_health_failure_acknowledgeme_acknowledged_by_fkey`: `FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `studio_system_health_failure_acknowledgement_failure_type_check`: `CHECK ((failure_type = ANY (ARRAY['automation'::text, 'email'::text])))`
- `studio_system_health_failure_acknowledgements_pkey`: `PRIMARY KEY (id)`
- `studio_system_health_failure_acknowledgements_resolved_by_fkey`: `FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `studio_system_health_failure_acknowledgements_status_check`: `CHECK ((status = ANY (ARRAY['acknowledged'::text, 'resolved'::text])))`

#### public.commerce_system_health_incidents

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| fingerprint | text | no | — |
| status | text | no | 'open'::text |
| severity | text | no | — |
| component | text | no | — |
| first_seen_at | timestamp with time zone | no | now() |
| last_seen_at | timestamp with time zone | no | now() |
| resolved_at | timestamp with time zone | yes | — |
| latest_message | text | no | ''::text |
| notification_sent_at | timestamp with time zone | yes | — |
| notification_attempts | integer | no | 0 |
| last_error | text | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_system_health_incidents_fingerprint_key`: `UNIQUE (fingerprint)`
- `studio_system_health_incidents_notification_attempts_check`: `CHECK ((notification_attempts >= 0))`
- `studio_system_health_incidents_pkey`: `PRIMARY KEY (id)`
- `studio_system_health_incidents_severity_check`: `CHECK ((severity = ANY (ARRAY['degraded'::text, 'critical'::text])))`
- `studio_system_health_incidents_status_check`: `CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))`

#### public.commerce_system_health_runs

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| overall | text | no | — |
| checks | jsonb | no | '[]'::jsonb |
| summary | jsonb | no | '{}'::jsonb |
| trigger | text | no | 'dashboard'::text |
| triggered_by | uuid | yes | — |
| started_at | timestamp with time zone | no | now() |
| finished_at | timestamp with time zone | no | now() |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_system_health_runs_checks_check`: `CHECK ((jsonb_typeof(checks) = 'array'::text))`
- `studio_system_health_runs_overall_check`: `CHECK ((overall = ANY (ARRAY['healthy'::text, 'degraded'::text, 'critical'::text])))`
- `studio_system_health_runs_pkey`: `PRIMARY KEY (id)`
- `studio_system_health_runs_summary_check`: `CHECK ((jsonb_typeof(summary) = 'object'::text))`
- `studio_system_health_runs_trigger_check`: `CHECK ((trigger = ANY (ARRAY['dashboard'::text, 'diagnostic'::text, 'scheduled'::text])))`
- `studio_system_health_runs_triggered_by_fkey`: `FOREIGN KEY (triggered_by) REFERENCES auth.users(id) ON DELETE SET NULL`

#### public.commerce_system_health_sla_settings

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | boolean | no | true |
| enabled | boolean | no | true |
| uptime_target | numeric(5,2) | no | 99.00 |
| failure_rate_max | numeric(5,2) | no | 5.00 |
| mttr_max_minutes | integer | no | 60 |
| notify_admins | boolean | no | true |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_system_health_sla_settings_failure_rate_max_check`: `CHECK (((failure_rate_max >= (0)::numeric) AND (failure_rate_max <= (100)::numeric)))`
- `studio_system_health_sla_settings_id_check`: `CHECK (id)`
- `studio_system_health_sla_settings_mttr_max_minutes_check`: `CHECK ((mttr_max_minutes >= 0))`
- `studio_system_health_sla_settings_pkey`: `PRIMARY KEY (id)`
- `studio_system_health_sla_settings_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `studio_system_health_sla_settings_uptime_target_check`: `CHECK (((uptime_target >= (0)::numeric) AND (uptime_target <= (100)::numeric)))`

#### public.commerce_team_invites

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| email | text | no | — |
| role | user_role | no | 'staff'::user_role |
| auth_user_id | uuid | yes | — |
| invited_by | uuid | no | — |
| status | text | no | 'pending'::text |
| expires_at | timestamp with time zone | no | (now() + '7 days'::interval) |
| created_at | timestamp with time zone | no | now() |
| accepted_at | timestamp with time zone | yes | — |
| revoked_at | timestamp with time zone | yes | — |

Constraints:

- `studio_team_invites_auth_user_id_fkey`: `FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL`
- `studio_team_invites_invited_by_fkey`: `FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE RESTRICT`
- `studio_team_invites_pkey`: `PRIMARY KEY (id)`
- `studio_team_invites_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text, 'email_failed'::text])))`

#### public.commerce_user_permissions

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| user_id | uuid | no | — |
| permission_key | text | no | — |
| allowed | boolean | no | — |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_user_permissions_permission_key_fkey`: `FOREIGN KEY (permission_key) REFERENCES commerce_permissions(key) ON DELETE CASCADE`
- `studio_user_permissions_pkey`: `PRIMARY KEY (user_id, permission_key)`
- `studio_user_permissions_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL`
- `studio_user_permissions_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE`

#### public.customer_addresses

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no | — |
| label | text | no | 'Home'::text |
| full_name | text | no | — |
| phone | text | no | — |
| line1 | text | no | — |
| line2 | text | no | ''::text |
| city | text | no | — |
| state | text | no | — |
| postal_code | text | no | — |
| country | text | no | 'IN'::text |
| is_default | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `customer_addresses_pkey`: `PRIMARY KEY (id)`
- `customer_addresses_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### public.notifications

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| title | text | no | — |
| message | text | no | — |
| category | text | no | 'system'::text |
| type | text | no | 'info'::text |
| read | boolean | no | false |
| link | text | yes | — |
| created_at | timestamp with time zone | yes | now() |
| recipient_id | uuid | yes | — |
| dedupe_key | text | yes | — |
| metadata | jsonb | no | '{}'::jsonb |
| workspace | text | no | 'studio'::text |
| event_key | text | yes | — |

Constraints:

- `notifications_pkey`: `PRIMARY KEY (id)`
- `notifications_recipient_id_fkey`: `FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### public.profiles

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| email | text | no | — |
| full_name | text | no | — |
| avatar_url | text | yes | — |
| role | user_role | no | 'client'::user_role |
| phone | text | yes | — |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| is_active | boolean | no | true |

Constraints:

- `profiles_email_key`: `UNIQUE (email)`
- `profiles_id_fkey`: `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `profiles_pkey`: `PRIMARY KEY (id)`

#### public.store_audit_logs

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| actor_id | uuid | yes | — |
| action | text | no | — |
| entity_type | text | no | — |
| entity_id | uuid | yes | — |
| metadata | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_audit_logs_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL`
- `store_audit_logs_metadata_check`: `CHECK ((jsonb_typeof(metadata) = 'object'::text))`
- `store_audit_logs_pkey`: `PRIMARY KEY (id)`

#### public.store_bundle_items

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| bundle_id | uuid | no | — |
| product_id | uuid | no | — |
| quantity | integer | no | 1 |
| sort_order | integer | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_bundle_items_bundle_id_fkey`: `FOREIGN KEY (bundle_id) REFERENCES store_bundles(id) ON DELETE CASCADE`
- `store_bundle_items_pkey`: `PRIMARY KEY (bundle_id, product_id)`
- `store_bundle_items_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE RESTRICT`
- `store_bundle_items_quantity_check`: `CHECK ((quantity > 0))`
- `store_bundle_items_sort_order_check`: `CHECK ((sort_order >= 0))`

#### public.store_bundles

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| slug | text | no | — |
| name | text | no | — |
| description | text | no | ''::text |
| discount_percent | numeric(5,2) | no | 15 |
| image_url | text | no | ''::text |
| status | text | no | 'draft'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_bundles_discount_percent_check`: `CHECK (((discount_percent >= (0)::numeric) AND (discount_percent < (100)::numeric)))`
- `store_bundles_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)))`
- `store_bundles_pkey`: `PRIMARY KEY (id)`
- `store_bundles_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_bundles_slug_key`: `UNIQUE (slug)`
- `store_bundles_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`

#### public.store_cart_items

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| cart_id | uuid | no | — |
| variant_id | uuid | no | — |
| quantity | integer | no | — |
| customization | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_cart_items_cart_id_fkey`: `FOREIGN KEY (cart_id) REFERENCES store_carts(id) ON DELETE CASCADE`
- `store_cart_items_cart_id_variant_id_key`: `UNIQUE (cart_id, variant_id)`
- `store_cart_items_customization_check`: `CHECK ((jsonb_typeof(customization) = 'object'::text))`
- `store_cart_items_pkey`: `PRIMARY KEY (id)`
- `store_cart_items_quantity_check`: `CHECK ((quantity > 0))`
- `store_cart_items_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id)`

#### public.store_carts

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | yes | — |
| guest_token | text | yes | — |
| currency | text | no | 'INR'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_carts_check`: `CHECK (((user_id IS NOT NULL) OR (guest_token IS NOT NULL)))`
- `store_carts_currency_check`: `CHECK ((currency = 'INR'::text))`
- `store_carts_guest_token_key`: `UNIQUE (guest_token)`
- `store_carts_pkey`: `PRIMARY KEY (id)`
- `store_carts_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

#### public.store_categories

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| slug | text | no | — |
| description | text | no | ''::text |
| image_url | text | no | ''::text |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| deleted_at | timestamp with time zone | yes | — |
| purge_after | timestamp with time zone | yes | — |
| deleted_from_is_active | boolean | yes | — |

Constraints:

- `store_categories_delete_window_check`: `CHECK ((((deleted_at IS NULL) AND (purge_after IS NULL) AND (deleted_from_is_active IS NULL)) OR ((deleted_at IS NOT NULL) AND (purge_after IS NOT NULL) AND (deleted_from_is_active IS NOT NULL) AND (purge_after >= (deleted_at + '15 days'::interval)))))`
- `store_categories_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 100)))`
- `store_categories_pkey`: `PRIMARY KEY (id)`
- `store_categories_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_categories_slug_key`: `UNIQUE (slug)`

#### public.store_checkout_requests

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | — |
| idempotency_key | text | no | — |
| request_fingerprint | text | no | — |
| order_id | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |
| completed_at | timestamp with time zone | yes | — |

Constraints:

- `store_checkout_requests_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `store_checkout_requests_customer_id_idempotency_key_key`: `UNIQUE (customer_id, idempotency_key)`
- `store_checkout_requests_idempotency_key_check`: `CHECK (((length(TRIM(BOTH FROM idempotency_key)) >= 1) AND (length(TRIM(BOTH FROM idempotency_key)) <= 128)))`
- `store_checkout_requests_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE SET NULL`
- `store_checkout_requests_pkey`: `PRIMARY KEY (id)`
- `store_checkout_requests_request_fingerprint_check`: `CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text))`

#### public.store_collection_products

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| collection_id | uuid | no | — |
| product_id | uuid | no | — |
| sort_order | integer | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_collection_products_collection_id_fkey`: `FOREIGN KEY (collection_id) REFERENCES store_collections(id) ON DELETE CASCADE`
- `store_collection_products_pkey`: `PRIMARY KEY (collection_id, product_id)`
- `store_collection_products_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE`
- `store_collection_products_sort_order_check`: `CHECK ((sort_order >= 0))`

#### public.store_collections

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| slug | text | no | — |
| tagline | text | no | ''::text |
| description | text | no | ''::text |
| image_url | text | no | ''::text |
| status | text | no | 'draft'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_collections_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)))`
- `store_collections_pkey`: `PRIMARY KEY (id)`
- `store_collections_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_collections_slug_key`: `UNIQUE (slug)`
- `store_collections_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`

#### public.store_customization_templates

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | yes | — |
| name | text | no | — |
| slug | text | no | — |
| schema | jsonb | no | '{}'::jsonb |
| preview_url | text | no | ''::text |
| status | text | no | 'draft'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_customization_templates_pkey`: `PRIMARY KEY (id)`
- `store_customization_templates_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE SET NULL`
- `store_customization_templates_schema_check`: `CHECK ((jsonb_typeof(schema) = 'object'::text))`
- `store_customization_templates_slug_key`: `UNIQUE (slug)`
- `store_customization_templates_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`

#### public.store_customizations

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | — |
| product_id | uuid | no | — |
| template_id | uuid | no | — |
| object_path | text | no | — |
| mime_type | text | no | — |
| byte_size | bigint | no | — |
| status | text | no | 'ready'::text |
| created_at | timestamp with time zone | no | now() |
| consumed_at | timestamp with time zone | yes | — |

Constraints:

- `store_customizations_byte_size_check`: `CHECK (((byte_size > 0) AND (byte_size <= 26214400)))`
- `store_customizations_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `store_customizations_mime_type_check`: `CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'application/pdf'::text])))`
- `store_customizations_object_path_check`: `CHECK ((object_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|png|webp|pdf)$'::text))`
- `store_customizations_object_path_key`: `UNIQUE (object_path)`
- `store_customizations_pkey`: `PRIMARY KEY (id)`
- `store_customizations_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE`
- `store_customizations_status_check`: `CHECK ((status = ANY (ARRAY['ready'::text, 'consumed'::text, 'rejected'::text])))`
- `store_customizations_template_id_fkey`: `FOREIGN KEY (template_id) REFERENCES store_customization_templates(id) ON DELETE RESTRICT`

#### public.store_inventory_levels

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| location_id | uuid | no | — |
| variant_id | uuid | no | — |
| on_hand | integer | no | 0 |
| reserved | integer | no | 0 |
| reorder_point | integer | no | 0 |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_inventory_levels_check`: `CHECK (((reserved >= 0) AND (reserved <= on_hand)))`
- `store_inventory_levels_location_id_fkey`: `FOREIGN KEY (location_id) REFERENCES store_inventory_locations(id) ON DELETE CASCADE`
- `store_inventory_levels_on_hand_check`: `CHECK ((on_hand >= 0))`
- `store_inventory_levels_pkey`: `PRIMARY KEY (location_id, variant_id)`
- `store_inventory_levels_reorder_point_check`: `CHECK ((reorder_point >= 0))`
- `store_inventory_levels_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE CASCADE`

#### public.store_inventory_locations

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| code | text | no | — |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_inventory_locations_code_key`: `UNIQUE (code)`
- `store_inventory_locations_name_key`: `UNIQUE (name)`
- `store_inventory_locations_pkey`: `PRIMARY KEY (id)`

#### public.store_inventory_movements

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| location_id | uuid | no | — |
| variant_id | uuid | yes | — |
| quantity_delta | integer | no | — |
| reason | text | no | — |
| reference_type | text | yes | — |
| reference_id | uuid | yes | — |
| created_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_inventory_movements_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `store_inventory_movements_location_id_fkey`: `FOREIGN KEY (location_id) REFERENCES store_inventory_locations(id)`
- `store_inventory_movements_pkey`: `PRIMARY KEY (id)`
- `store_inventory_movements_quantity_delta_check`: `CHECK ((quantity_delta <> 0))`
- `store_inventory_movements_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE SET NULL`

#### public.store_inventory_reservations

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_id | uuid | no | — |
| order_item_id | uuid | yes | — |
| location_id | uuid | no | — |
| variant_id | uuid | no | — |
| quantity | integer | no | — |
| status | text | no | 'reserved'::text |
| created_at | timestamp with time zone | no | now() |
| released_at | timestamp with time zone | yes | — |
| fulfilled_at | timestamp with time zone | yes | — |
| expires_at | timestamp with time zone | yes | — |
| release_reason | text | yes | — |

Constraints:

- `store_inventory_reservations_check`: `CHECK ((((status = 'reserved'::text) AND (released_at IS NULL) AND (fulfilled_at IS NULL)) OR ((status = 'released'::text) AND (released_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((status = 'fulfilled'::text) AND (released_at IS NULL) AND (fulfilled_at IS NOT NULL))))`
- `store_inventory_reservations_lifecycle_check`: `CHECK ((((status = 'reserved'::text) AND (released_at IS NULL) AND (fulfilled_at IS NULL)) OR ((status = 'released'::text) AND (released_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((status = 'expired'::text) AND (released_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((status = 'fulfilled'::text) AND (released_at IS NULL) AND (fulfilled_at IS NOT NULL))))`
- `store_inventory_reservations_location_id_fkey`: `FOREIGN KEY (location_id) REFERENCES store_inventory_locations(id) ON DELETE RESTRICT`
- `store_inventory_reservations_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE RESTRICT`
- `store_inventory_reservations_order_id_location_id_variant_i_key`: `UNIQUE (order_id, location_id, variant_id)`
- `store_inventory_reservations_order_item_id_fkey`: `FOREIGN KEY (order_item_id) REFERENCES store_order_items(id) ON DELETE RESTRICT`
- `store_inventory_reservations_pkey`: `PRIMARY KEY (id)`
- `store_inventory_reservations_quantity_check`: `CHECK ((quantity > 0))`
- `store_inventory_reservations_release_reason_check`: `CHECK (((release_reason IS NULL) OR (release_reason = ANY (ARRAY['payment_failed'::text, 'cancelled'::text, 'manual_release'::text, 'expired'::text]))))`
- `store_inventory_reservations_status_check`: `CHECK ((status = ANY (ARRAY['reserved'::text, 'released'::text, 'expired'::text, 'fulfilled'::text])))`
- `store_inventory_reservations_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE RESTRICT`

#### public.store_inventory_transfer_items

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| transfer_id | uuid | no | — |
| variant_id | uuid | yes | — |
| quantity | integer | no | — |

Constraints:

- `store_inventory_transfer_items_pkey`: `PRIMARY KEY (id)`
- `store_inventory_transfer_items_quantity_check`: `CHECK ((quantity > 0))`
- `store_inventory_transfer_items_transfer_id_fkey`: `FOREIGN KEY (transfer_id) REFERENCES store_inventory_transfers(id) ON DELETE CASCADE`
- `store_inventory_transfer_items_transfer_id_variant_id_key`: `UNIQUE (transfer_id, variant_id)`
- `store_inventory_transfer_items_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE SET NULL`

#### public.store_inventory_transfers

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| transfer_number | text | no | — |
| from_location_id | uuid | no | — |
| to_location_id | uuid | no | — |
| status | text | no | 'draft'::text |
| notes | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_inventory_transfers_check`: `CHECK ((from_location_id <> to_location_id))`
- `store_inventory_transfers_from_location_id_fkey`: `FOREIGN KEY (from_location_id) REFERENCES store_inventory_locations(id)`
- `store_inventory_transfers_pkey`: `PRIMARY KEY (id)`
- `store_inventory_transfers_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'in_transit'::text, 'received'::text, 'cancelled'::text])))`
- `store_inventory_transfers_to_location_id_fkey`: `FOREIGN KEY (to_location_id) REFERENCES store_inventory_locations(id)`
- `store_inventory_transfers_transfer_number_key`: `UNIQUE (transfer_number)`

#### public.store_media_assets

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| storage_path | text | no | — |
| public_url | text | no | — |
| file_name | text | no | — |
| folder | text | no | — |
| alt_text | text | no | ''::text |
| mime_type | text | no | — |
| size_bytes | bigint | no | 0 |
| created_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_media_assets_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `store_media_assets_pkey`: `PRIMARY KEY (storage_path)`
- `store_media_assets_size_bytes_check`: `CHECK ((size_bytes >= 0))`

#### public.store_order_items

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_id | uuid | no | — |
| product_id | uuid | yes | — |
| variant_id | uuid | yes | — |
| title | text | no | — |
| sku | text | no | ''::text |
| quantity | integer | no | — |
| unit_price_paise | bigint | yes | — |
| currency | text | no | 'INR'::text |
| customization | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |
| unit_price_minor | bigint | yes | — |
| currency_code | text | yes | — |

Constraints:

- `store_order_items_currency_check`: `CHECK ((currency = ANY (ARRAY['INR'::text, 'USD'::text])))`
- `store_order_items_money_snapshot_check`: `CHECK ((((currency = 'INR'::text) AND (unit_price_paise IS NOT NULL) AND (unit_price_minor IS NULL)) OR ((currency = 'USD'::text) AND (unit_price_minor IS NOT NULL) AND (unit_price_paise IS NULL))))`
- `store_order_items_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE CASCADE`
- `store_order_items_pkey`: `PRIMARY KEY (id)`
- `store_order_items_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE SET NULL`
- `store_order_items_quantity_check`: `CHECK ((quantity > 0))`
- `store_order_items_unit_price_paise_check`: `CHECK ((unit_price_paise >= 0))`
- `store_order_items_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE SET NULL`

#### public.store_orders

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_number | text | no | — |
| customer_name | text | no | — |
| customer_email | text | no | — |
| customer_phone | text | no | — |
| shipping_address | jsonb | no | — |
| items | jsonb | no | — |
| delivery_method | text | no | — |
| coupon_code | text | yes | — |
| subtotal | numeric(12,2) | no | — |
| discount | numeric(12,2) | no | 0 |
| shipping_fee | numeric(12,2) | no | 0 |
| tax | numeric(12,2) | no | 0 |
| total | numeric(12,2) | no | — |
| currency | text | no | 'USD'::text |
| status | text | no | 'pending'::text |
| payment_status | text | no | 'unpaid'::text |
| payment_method | text | no | 'cod'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| customer_id | uuid | yes | — |
| idempotency_key | text | yes | — |
| payment_attempt_id | uuid | yes | — |

Constraints:

- `store_orders_currency_check`: `CHECK ((currency ~ '^[A-Z]{3}$'::text))`
- `store_orders_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE SET NULL`
- `store_orders_delivery_method_check`: `CHECK ((delivery_method = ANY (ARRAY['standard'::text, 'express'::text, 'overnight'::text])))`
- `store_orders_discount_check`: `CHECK ((discount >= (0)::numeric))`
- `store_orders_order_number_key`: `UNIQUE (order_number)`
- `store_orders_payment_attempt_fk`: `FOREIGN KEY (payment_attempt_id) REFERENCES store_payment_attempts(id) ON DELETE SET NULL`
- `store_orders_payment_method_check`: `CHECK ((payment_method = ANY (ARRAY['cod'::text, 'upi_qr'::text, 'bank_transfer'::text])))`
- `store_orders_payment_status_check`: `CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])))`
- `store_orders_pkey`: `PRIMARY KEY (id)`
- `store_orders_shipping_fee_check`: `CHECK ((shipping_fee >= (0)::numeric))`
- `store_orders_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'fulfilling'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text])))`
- `store_orders_subtotal_check`: `CHECK ((subtotal >= (0)::numeric))`
- `store_orders_tax_check`: `CHECK ((tax >= (0)::numeric))`
- `store_orders_total_check`: `CHECK ((total >= (0)::numeric))`

#### public.store_payment_attempts

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_id | uuid | no | — |
| customer_id | uuid | no | — |
| method_code | text | no | — |
| amount | numeric(12,2) | no | — |
| currency | text | no | — |
| idempotency_key | text | no | — |
| status | text | no | 'awaiting_customer'::text |
| provider_reference | text | no | ''::text |
| metadata | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_payment_attempts_amount_check`: `CHECK ((amount >= (0)::numeric))`
- `store_payment_attempts_currency_check`: `CHECK ((currency ~ '^[A-Z]{3}$'::text))`
- `store_payment_attempts_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE RESTRICT`
- `store_payment_attempts_idempotency_key_check`: `CHECK (((length(TRIM(BOTH FROM idempotency_key)) >= 1) AND (length(TRIM(BOTH FROM idempotency_key)) <= 128)))`
- `store_payment_attempts_metadata_check`: `CHECK ((jsonb_typeof(metadata) = 'object'::text))`
- `store_payment_attempts_method_code_check`: `CHECK ((method_code = ANY (ARRAY['upi_qr'::text, 'bank_transfer'::text])))`
- `store_payment_attempts_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE RESTRICT`
- `store_payment_attempts_order_id_idempotency_key_key`: `UNIQUE (order_id, idempotency_key)`
- `store_payment_attempts_pkey`: `PRIMARY KEY (id)`
- `store_payment_attempts_status_check`: `CHECK ((status = ANY (ARRAY['awaiting_customer'::text, 'proof_submitted'::text, 'paid'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text])))`

#### public.store_payment_methods

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| method_code | text | no | — |
| display_name | text | no | — |
| enabled | boolean | no | false |
| merchant_name | text | no | ''::text |
| upi_vpa | text | no | ''::text |
| upi_qr_image_url | text | no | ''::text |
| bank_name | text | no | ''::text |
| bank_account_name | text | no | ''::text |
| bank_account_number | text | no | ''::text |
| bank_ifsc | text | no | ''::text |
| instructions | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_payment_methods_display_name_check`: `CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 80)))`
- `store_payment_methods_method_code_check`: `CHECK ((method_code = ANY (ARRAY['upi_qr'::text, 'bank_transfer'::text])))`
- `store_payment_methods_method_code_key`: `UNIQUE (method_code)`
- `store_payment_methods_pkey`: `PRIMARY KEY (id)`

#### public.store_payment_submissions

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| payment_attempt_id | uuid | no | — |
| order_id | uuid | no | — |
| customer_id | uuid | no | — |
| utr | text | no | — |
| amount | numeric(12,2) | no | — |
| paid_at | timestamp with time zone | yes | — |
| evidence_path | text | no | ''::text |
| note | text | no | ''::text |
| status | text | no | 'pending'::text |
| reviewed_by | uuid | yes | — |
| reviewed_at | timestamp with time zone | yes | — |
| review_note | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_payment_submissions_amount_check`: `CHECK ((amount >= (0)::numeric))`
- `store_payment_submissions_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE RESTRICT`
- `store_payment_submissions_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE RESTRICT`
- `store_payment_submissions_payment_attempt_id_fkey`: `FOREIGN KEY (payment_attempt_id) REFERENCES store_payment_attempts(id) ON DELETE RESTRICT`
- `store_payment_submissions_payment_attempt_id_utr_key`: `UNIQUE (payment_attempt_id, utr)`
- `store_payment_submissions_pkey`: `PRIMARY KEY (id)`
- `store_payment_submissions_reviewed_by_fkey`: `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `store_payment_submissions_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))`
- `store_payment_submissions_utr_check`: `CHECK ((utr ~ '^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$'::text))`

#### public.store_product_digital_files

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | no | — |
| variant_id | uuid | yes | — |
| storage_path | text | no | — |
| file_name | text | no | — |
| mime_type | text | no | — |
| size_bytes | bigint | no | — |
| sort_order | integer | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_product_digital_files_file_name_check`: `CHECK (((length(TRIM(BOTH FROM file_name)) >= 1) AND (length(TRIM(BOTH FROM file_name)) <= 180)))`
- `store_product_digital_files_pkey`: `PRIMARY KEY (id)`
- `store_product_digital_files_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE`
- `store_product_digital_files_size_bytes_check`: `CHECK (((size_bytes > 0) AND (size_bytes <= 262144000)))`
- `store_product_digital_files_sort_order_check`: `CHECK ((sort_order >= 0))`
- `store_product_digital_files_storage_path_key`: `UNIQUE (storage_path)`
- `store_product_digital_files_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE CASCADE`

#### public.store_product_media

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | no | — |
| variant_id | uuid | yes | — |
| storage_path | text | no | — |
| public_url | text | no | — |
| alt_text | text | no | ''::text |
| media_type | text | no | 'image'::text |
| sort_order | integer | no | 0 |
| is_primary | boolean | no | false |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_product_media_media_type_check`: `CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text])))`
- `store_product_media_pkey`: `PRIMARY KEY (id)`
- `store_product_media_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE`
- `store_product_media_product_id_storage_path_key`: `UNIQUE (product_id, storage_path)`
- `store_product_media_sort_order_check`: `CHECK ((sort_order >= 0))`
- `store_product_media_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE CASCADE`

#### public.store_product_variants

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | no | — |
| label | text | no | — |
| sku | text | no | — |
| options | jsonb | no | '{}'::jsonb |
| price | numeric(12,2) | no | — |
| stock | integer | yes | — |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| price_paise | bigint | yes | — |
| currency_code | text | no | 'INR'::text |

Constraints:

- `store_product_variants_inr_only`: `CHECK (((currency_code = 'INR'::text) AND (price_paise = (round((price * (100)::numeric)))::bigint)))`
- `store_product_variants_label_check`: `CHECK (((length(TRIM(BOTH FROM label)) >= 1) AND (length(TRIM(BOTH FROM label)) <= 100)))`
- `store_product_variants_options_check`: `CHECK ((jsonb_typeof(options) = 'object'::text))`
- `store_product_variants_pkey`: `PRIMARY KEY (id)`
- `store_product_variants_price_check`: `CHECK ((price >= (0)::numeric))`
- `store_product_variants_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE`
- `store_product_variants_sku_key`: `UNIQUE (sku)`
- `store_product_variants_stock_check`: `CHECK (((stock IS NULL) OR (stock >= 0)))`

#### public.store_products

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| category_id | uuid | yes | — |
| title | text | no | — |
| slug | text | no | — |
| description | text | no | ''::text |
| product_type | text | no | 'physical'::text |
| status | text | no | 'draft'::text |
| sku | text | no | — |
| price | numeric(12,2) | no | 0 |
| compare_at_price | numeric(12,2) | yes | — |
| currency | text | no | 'USD'::text |
| stock | integer | yes | — |
| image_url | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| price_paise | bigint | yes | — |
| compare_at_price_paise | bigint | yes | — |
| currency_code | text | no | 'INR'::text |
| write_version | bigint | no | 1 |
| subcategory_id | uuid | yes | — |
| design_origin | text | no | 'original_zerocraft'::text |
| rights_status | text | no | 'not_applicable'::text |
| digital_delivery | jsonb | no | '{"mode": "instant", "download_limit": 0, "link_expiry_hours": 0}'::jsonb |
| deleted_at | timestamp with time zone | yes | — |
| purge_after | timestamp with time zone | yes | — |
| deleted_from_status | text | yes | — |

Constraints:

- `store_products_category_id_fkey`: `FOREIGN KEY (category_id) REFERENCES store_categories(id) ON DELETE SET NULL`
- `store_products_check`: `CHECK (((compare_at_price IS NULL) OR (compare_at_price >= price)))`
- `store_products_currency_check`: `CHECK ((currency ~ '^[A-Z]{3}$'::text))`
- `store_products_delete_window_check`: `CHECK ((((deleted_at IS NULL) AND (purge_after IS NULL) AND (deleted_from_status IS NULL)) OR ((deleted_at IS NOT NULL) AND (purge_after IS NOT NULL) AND (deleted_from_status IS NOT NULL) AND (purge_after >= (deleted_at + '15 days'::interval)))))`
- `store_products_deleted_from_status_check`: `CHECK (((deleted_from_status IS NULL) OR (deleted_from_status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))))`
- `store_products_design_origin_check`: `CHECK ((design_origin = ANY (ARRAY['original_zerocraft'::text, 'licensed'::text, 'fan_inspired'::text])))`
- `store_products_digital_delivery_check`: `CHECK ((jsonb_typeof(digital_delivery) = 'object'::text))`
- `store_products_inr_only`: `CHECK (((currency = 'INR'::text) AND (currency_code = 'INR'::text) AND (price_paise = (round((price * (100)::numeric)))::bigint) AND (NOT (compare_at_price_paise IS DISTINCT FROM
CASE
    WHEN (compare_at_price IS NULL) THEN NULL::bigint
    ELSE (round((compare_at_price * (100)::numeric)))::bigint
END))))`
- `store_products_pkey`: `PRIMARY KEY (id)`
- `store_products_price_check`: `CHECK ((price >= (0)::numeric))`
- `store_products_product_type_check`: `CHECK ((product_type = ANY (ARRAY['physical'::text, 'digital'::text])))`
- `store_products_rights_status_check`: `CHECK ((rights_status = ANY (ARRAY['not_applicable'::text, 'approved_license'::text, 'review_required'::text])))`
- `store_products_sku_key`: `UNIQUE (sku)`
- `store_products_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_products_slug_key`: `UNIQUE (slug)`
- `store_products_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))`
- `store_products_stock_check`: `CHECK (((stock IS NULL) OR (stock >= 0)))`
- `store_products_subcategory_parent_fk`: `FOREIGN KEY (subcategory_id, category_id) REFERENCES store_subcategories(id, category_id) ON DELETE RESTRICT`
- `store_products_title_check`: `CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180)))`
- `store_products_write_version_positive`: `CHECK ((write_version > 0))`

#### public.store_purchase_order_items

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| purchase_order_id | uuid | no | — |
| variant_id | uuid | yes | — |
| quantity_ordered | integer | no | — |
| quantity_received | integer | no | 0 |
| unit_cost_paise | bigint | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_purchase_order_items_check`: `CHECK (((quantity_received >= 0) AND (quantity_received <= quantity_ordered)))`
- `store_purchase_order_items_pkey`: `PRIMARY KEY (id)`
- `store_purchase_order_items_purchase_order_id_fkey`: `FOREIGN KEY (purchase_order_id) REFERENCES store_purchase_orders(id) ON DELETE CASCADE`
- `store_purchase_order_items_purchase_order_id_variant_id_key`: `UNIQUE (purchase_order_id, variant_id)`
- `store_purchase_order_items_quantity_ordered_check`: `CHECK ((quantity_ordered > 0))`
- `store_purchase_order_items_unit_cost_paise_check`: `CHECK ((unit_cost_paise >= 0))`
- `store_purchase_order_items_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE SET NULL`

#### public.store_purchase_orders

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_number | text | no | — |
| supplier_id | uuid | no | — |
| location_id | uuid | no | — |
| status | text | no | 'draft'::text |
| expected_at | date | yes | — |
| notes | text | no | ''::text |
| currency | text | no | 'INR'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_purchase_orders_currency_check`: `CHECK ((currency = 'INR'::text))`
- `store_purchase_orders_location_id_fkey`: `FOREIGN KEY (location_id) REFERENCES store_inventory_locations(id)`
- `store_purchase_orders_order_number_key`: `UNIQUE (order_number)`
- `store_purchase_orders_pkey`: `PRIMARY KEY (id)`
- `store_purchase_orders_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'ordered'::text, 'partial'::text, 'received'::text, 'cancelled'::text])))`
- `store_purchase_orders_supplier_id_fkey`: `FOREIGN KEY (supplier_id) REFERENCES store_suppliers(id)`

#### public.store_recycle_bin_assets

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| storage_path | text | no | — |
| file_name | text | no | — |
| folder | text | no | — |
| mime_type | text | no | — |
| size_bytes | bigint | no | 0 |
| deleted_at | timestamp with time zone | no | now() |
| purge_after | timestamp with time zone | no | — |
| deleted_by | uuid | yes | — |

Constraints:

- `store_recycle_bin_assets_check`: `CHECK ((purge_after >= (deleted_at + '15 days'::interval)))`
- `store_recycle_bin_assets_deleted_by_fkey`: `FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `store_recycle_bin_assets_pkey`: `PRIMARY KEY (storage_path)`
- `store_recycle_bin_assets_size_bytes_check`: `CHECK ((size_bytes >= 0))`

#### public.store_subcategories

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| category_id | uuid | no | — |
| name | text | no | — |
| slug | text | no | — |
| description | text | no | ''::text |
| image_url | text | no | ''::text |
| sort_order | integer | no | 0 |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| deleted_at | timestamp with time zone | yes | — |
| purge_after | timestamp with time zone | yes | — |
| deleted_from_is_active | boolean | yes | — |

Constraints:

- `store_subcategories_category_id_fkey`: `FOREIGN KEY (category_id) REFERENCES store_categories(id) ON DELETE RESTRICT`
- `store_subcategories_category_id_slug_key`: `UNIQUE (category_id, slug)`
- `store_subcategories_delete_window_check`: `CHECK ((((deleted_at IS NULL) AND (purge_after IS NULL) AND (deleted_from_is_active IS NULL)) OR ((deleted_at IS NOT NULL) AND (purge_after IS NOT NULL) AND (deleted_from_is_active IS NOT NULL) AND (purge_after >= (deleted_at + '15 days'::interval)))))`
- `store_subcategories_id_category_id_key`: `UNIQUE (id, category_id)`
- `store_subcategories_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 100)))`
- `store_subcategories_pkey`: `PRIMARY KEY (id)`
- `store_subcategories_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_subcategories_sort_order_check`: `CHECK ((sort_order >= 0))`

#### public.store_suppliers

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| email | text | no | ''::text |
| phone | text | no | ''::text |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_suppliers_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160)))`
- `store_suppliers_name_key`: `UNIQUE (name)`
- `store_suppliers_pkey`: `PRIMARY KEY (id)`

#### public.store_variant_option_values

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| option_id | uuid | no | — |
| value | text | no | — |
| swatch_hex | text | yes | — |
| sort_order | integer | no | 0 |

Constraints:

- `store_variant_option_values_option_id_fkey`: `FOREIGN KEY (option_id) REFERENCES store_variant_options(id) ON DELETE CASCADE`
- `store_variant_option_values_option_id_value_key`: `UNIQUE (option_id, value)`
- `store_variant_option_values_pkey`: `PRIMARY KEY (id)`
- `store_variant_option_values_sort_order_check`: `CHECK ((sort_order >= 0))`
- `store_variant_option_values_value_check`: `CHECK (((length(TRIM(BOTH FROM value)) >= 1) AND (length(TRIM(BOTH FROM value)) <= 120)))`

#### public.store_variant_options

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | no | — |
| name | text | no | — |
| sort_order | integer | no | 0 |

Constraints:

- `store_variant_options_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80)))`
- `store_variant_options_pkey`: `PRIMARY KEY (id)`
- `store_variant_options_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE`
- `store_variant_options_product_id_name_key`: `UNIQUE (product_id, name)`
- `store_variant_options_sort_order_check`: `CHECK ((sort_order >= 0))`

#### public.store_variant_values

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| variant_id | uuid | no | — |
| option_value_id | uuid | no | — |

Constraints:

- `store_variant_values_option_value_id_fkey`: `FOREIGN KEY (option_value_id) REFERENCES store_variant_option_values(id) ON DELETE CASCADE`
- `store_variant_values_pkey`: `PRIMARY KEY (variant_id, option_value_id)`
- `store_variant_values_variant_id_fkey`: `FOREIGN KEY (variant_id) REFERENCES store_product_variants(id) ON DELETE CASCADE`

#### public.store_wishlist_items

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| wishlist_id | uuid | no | — |
| product_id | uuid | no | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_wishlist_items_pkey`: `PRIMARY KEY (wishlist_id, product_id)`
- `store_wishlist_items_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE`
- `store_wishlist_items_wishlist_id_fkey`: `FOREIGN KEY (wishlist_id) REFERENCES store_wishlists(id) ON DELETE CASCADE`

#### public.store_wishlists

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_wishlists_pkey`: `PRIMARY KEY (id)`
- `store_wishlists_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `store_wishlists_user_id_key`: `UNIQUE (user_id)`

#### public.storefront_banners

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| title | text | no | — |
| eyebrow | text | no | ''::text |
| body | text | no | ''::text |
| image_url | text | no | ''::text |
| href | text | no | '/store/shop'::text |
| sort_order | integer | no | 0 |
| is_published | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `storefront_banners_pkey`: `PRIMARY KEY (id)`

#### public.storefront_sections

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| section_key | text | no | — |
| title | text | no | ''::text |
| payload | jsonb | no | '{}'::jsonb |
| sort_order | integer | no | 0 |
| is_published | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `storefront_sections_payload_check`: `CHECK ((jsonb_typeof(payload) = 'object'::text))`
- `storefront_sections_pkey`: `PRIMARY KEY (id)`
- `storefront_sections_section_key_key`: `UNIQUE (section_key)`

### realtime

#### realtime.messages

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| topic | text | no | — |
| extension | text | no | — |
| payload | jsonb | yes | — |
| event | text | yes | — |
| private | boolean | yes | false |
| updated_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| inserted_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| id | uuid | no | gen_random_uuid() |
| binary_payload | bytea | yes | — |
| skip_broadcast | boolean | no | false |

Constraints:

- `messages_payload_exclusive`: `CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID`
- `messages_pkey`: `PRIMARY KEY (id, inserted_at)`

#### realtime.messages_2026_10_29

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| topic | text | no | — |
| extension | text | no | — |
| payload | jsonb | yes | — |
| event | text | yes | — |
| private | boolean | yes | false |
| updated_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| inserted_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| id | uuid | no | gen_random_uuid() |
| binary_payload | bytea | yes | — |
| skip_broadcast | boolean | no | false |

Constraints:

- `messages_2026_10_29_pkey`: `PRIMARY KEY (id, inserted_at)`
- `messages_payload_exclusive`: `CHECK (((payload IS NULL) OR (binary_payload IS NULL)))`

#### realtime.messages_2026_10_30

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| topic | text | no | — |
| extension | text | no | — |
| payload | jsonb | yes | — |
| event | text | yes | — |
| private | boolean | yes | false |
| updated_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| inserted_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| id | uuid | no | gen_random_uuid() |
| binary_payload | bytea | yes | — |
| skip_broadcast | boolean | no | false |

Constraints:

- `messages_2026_10_30_pkey`: `PRIMARY KEY (id, inserted_at)`
- `messages_payload_exclusive`: `CHECK (((payload IS NULL) OR (binary_payload IS NULL)))`

#### realtime.messages_2026_10_31

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| topic | text | no | — |
| extension | text | no | — |
| payload | jsonb | yes | — |
| event | text | yes | — |
| private | boolean | yes | false |
| updated_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| inserted_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| id | uuid | no | gen_random_uuid() |
| binary_payload | bytea | yes | — |
| skip_broadcast | boolean | no | false |

Constraints:

- `messages_2026_10_31_pkey`: `PRIMARY KEY (id, inserted_at)`
- `messages_payload_exclusive`: `CHECK (((payload IS NULL) OR (binary_payload IS NULL)))`

#### realtime.messages_2026_11_01

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| topic | text | no | — |
| extension | text | no | — |
| payload | jsonb | yes | — |
| event | text | yes | — |
| private | boolean | yes | false |
| updated_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| inserted_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| id | uuid | no | gen_random_uuid() |
| binary_payload | bytea | yes | — |
| skip_broadcast | boolean | no | false |

Constraints:

- `messages_2026_11_01_pkey`: `PRIMARY KEY (id, inserted_at)`
- `messages_payload_exclusive`: `CHECK (((payload IS NULL) OR (binary_payload IS NULL)))`

#### realtime.messages_2026_11_02

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| topic | text | no | — |
| extension | text | no | — |
| payload | jsonb | yes | — |
| event | text | yes | — |
| private | boolean | yes | false |
| updated_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| inserted_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| id | uuid | no | gen_random_uuid() |
| binary_payload | bytea | yes | — |
| skip_broadcast | boolean | no | false |

Constraints:

- `messages_2026_11_02_pkey`: `PRIMARY KEY (id, inserted_at)`
- `messages_payload_exclusive`: `CHECK (((payload IS NULL) OR (binary_payload IS NULL)))`

#### realtime.messages_2026_11_03

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| topic | text | no | — |
| extension | text | no | — |
| payload | jsonb | yes | — |
| event | text | yes | — |
| private | boolean | yes | false |
| updated_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| inserted_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| id | uuid | no | gen_random_uuid() |
| binary_payload | bytea | yes | — |
| skip_broadcast | boolean | no | false |

Constraints:

- `messages_2026_11_03_pkey`: `PRIMARY KEY (id, inserted_at)`
- `messages_payload_exclusive`: `CHECK (((payload IS NULL) OR (binary_payload IS NULL)))`

#### realtime.messages_2026_11_04

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| topic | text | no | — |
| extension | text | no | — |
| payload | jsonb | yes | — |
| event | text | yes | — |
| private | boolean | yes | false |
| updated_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| inserted_at | timestamp without time zone | no | timezone('utc'::text, clock_timestamp()) |
| id | uuid | no | gen_random_uuid() |
| binary_payload | bytea | yes | — |
| skip_broadcast | boolean | no | false |

Constraints:

- `messages_2026_11_04_pkey`: `PRIMARY KEY (id, inserted_at)`
- `messages_payload_exclusive`: `CHECK (((payload IS NULL) OR (binary_payload IS NULL)))`

#### realtime.schema_migrations

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| version | bigint | no | — |
| inserted_at | timestamp(0) without time zone | yes | now() |

Constraints:

- `schema_migrations_pkey`: `PRIMARY KEY (version)`

#### realtime.subscription

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | no | — |
| subscription_id | uuid | no | — |
| entity | regclass | no | — |
| filters | realtime.user_defined_filter[] | no | '{}'::realtime.user_defined_filter[] |
| claims | jsonb | no | — |
| claims_role | regrole | no | realtime.to_regrole((claims ->> 'role'::text)) |
| created_at | timestamp without time zone | no | timezone('utc'::text, now()) |
| action_filter | text | yes | '*'::text |
| selected_columns | text[] | yes | — |

Constraints:

- `pk_subscription`: `PRIMARY KEY (id)`
- `subscription_action_filter_check`: `CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))`

### storage

#### storage.buckets

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | text | no | — |
| name | text | no | — |
| owner | uuid | yes | — |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| public | boolean | yes | false |
| avif_autodetection | boolean | yes | false |
| file_size_limit | bigint | yes | — |
| allowed_mime_types | text[] | yes | — |
| owner_id | text | yes | — |
| type | storage.buckettype | no | 'STANDARD'::storage.buckettype |
| versioning_status | text | no | 'DISABLED'::text |
| lifecycle_configuration | jsonb | yes | — |
| lifecycle_configuration_generation | uuid | yes | — |

Constraints:

- `buckets_lifecycle_configuration_pair_check`: `CHECK (((lifecycle_configuration IS NULL) = (lifecycle_configuration_generation IS NULL)))`
- `buckets_lifecycle_configuration_shape_check`: `CHECK (((lifecycle_configuration IS NULL) OR ((jsonb_typeof(lifecycle_configuration) = 'object'::text) AND (lifecycle_configuration ? 'rules'::text) AND
CASE
    WHEN (jsonb_typeof((lifecycle_configuration -> 'rules'::text)) = 'array'::text) THEN ((jsonb_array_length((lifecycle_configuration -> 'rules'::text)) >= 1) AND (jsonb_array_length((lifecycle_configuration -> 'rules'::text)) <= 1000))
    ELSE false
END)))`
- `buckets_lifecycle_configuration_standard_only_check`: `CHECK (((type = 'STANDARD'::storage.buckettype) OR ((lifecycle_configuration IS NULL) AND (lifecycle_configuration_generation IS NULL))))`
- `buckets_pkey`: `PRIMARY KEY (id)`
- `buckets_versioning_dark_check`: `CHECK ((versioning_status = 'DISABLED'::text))`
- `buckets_versioning_standard_only_check`: `CHECK (((type = 'STANDARD'::storage.buckettype) OR (versioning_status = 'DISABLED'::text)))`
- `buckets_versioning_status_check`: `CHECK ((versioning_status = ANY (ARRAY['DISABLED'::text, 'ENABLED'::text, 'SUSPENDED'::text])))`

#### storage.buckets_analytics

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| name | text | no | — |
| type | storage.buckettype | no | 'ANALYTICS'::storage.buckettype |
| format | text | no | 'ICEBERG'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| id | uuid | no | gen_random_uuid() |
| deleted_at | timestamp with time zone | yes | — |

Constraints:

- `buckets_analytics_pkey`: `PRIMARY KEY (id)`

#### storage.buckets_vectors

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | text | no | — |
| type | storage.buckettype | no | 'VECTOR'::storage.buckettype |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `buckets_vectors_pkey`: `PRIMARY KEY (id)`

#### storage.migrations

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | integer | no | — |
| name | character varying(100) | no | — |
| hash | character varying(40) | no | — |
| executed_at | timestamp without time zone | yes | CURRENT_TIMESTAMP |

Constraints:

- `migrations_name_key`: `UNIQUE (name)`
- `migrations_pkey`: `PRIMARY KEY (id)`

#### storage.objects

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| bucket_id | text | yes | — |
| name | text | yes | — |
| owner | uuid | yes | — |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| last_accessed_at | timestamp with time zone | yes | now() |
| metadata | jsonb | yes | — |
| path_tokens | text[] | yes | string_to_array(name, '/'::text) |
| version | text | yes | — |
| owner_id | text | yes | — |
| user_metadata | jsonb | yes | — |
| archived_at | timestamp with time zone | yes | — |
| is_delete_marker | boolean | no | false |
| is_versioned | boolean | no | false |

Constraints:

- `objects_bucketId_fkey`: `FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)`
- `objects_pkey`: `PRIMARY KEY (id)`

#### storage.s3_multipart_uploads

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | text | no | — |
| in_progress_size | bigint | no | 0 |
| upload_signature | text | no | — |
| bucket_id | text | no | — |
| key | text | no | — |
| version | text | no | — |
| owner_id | text | yes | — |
| created_at | timestamp with time zone | no | now() |
| user_metadata | jsonb | yes | — |
| metadata | jsonb | yes | — |

Constraints:

- `s3_multipart_uploads_bucket_id_fkey`: `FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)`
- `s3_multipart_uploads_pkey`: `PRIMARY KEY (id)`

#### storage.s3_multipart_uploads_parts

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| upload_id | text | no | — |
| size | bigint | no | 0 |
| part_number | integer | no | — |
| bucket_id | text | no | — |
| key | text | no | — |
| etag | text | no | — |
| owner_id | text | yes | — |
| version | text | no | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `s3_multipart_uploads_parts_bucket_id_fkey`: `FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)`
- `s3_multipart_uploads_parts_pkey`: `PRIMARY KEY (id)`
- `s3_multipart_uploads_parts_upload_id_fkey`: `FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE`

#### storage.vector_indexes

RLS: enabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | text | no | gen_random_uuid() |
| name | text | no | — |
| bucket_id | text | no | — |
| data_type | text | no | — |
| dimension | integer | no | — |
| distance_metric | text | no | — |
| metadata_configuration | jsonb | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `vector_indexes_bucket_id_fkey`: `FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id)`
- `vector_indexes_pkey`: `PRIMARY KEY (id)`

### supabase_migrations

#### supabase_migrations.schema_migrations

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| version | text | no | — |
| statements | text[] | yes | — |
| name | text | yes | — |
| created_by | text | yes | — |
| idempotency_key | text | yes | — |
| rollback | text[] | yes | — |

Constraints:

- `schema_migrations_idempotency_key_key`: `UNIQUE (idempotency_key)`
- `schema_migrations_pkey`: `PRIMARY KEY (version)`

### vault

#### vault.secrets

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | yes | — |
| description | text | no | ''::text |
| secret | text | no | — |
| key_id | uuid | yes | — |
| nonce | bytea | yes | vault._crypto_aead_det_noncegen() |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | no | CURRENT_TIMESTAMP |

Constraints:

- `secrets_pkey`: `PRIMARY KEY (id)`

### zc_backup_20261101_store_only

#### zc_backup_20261101_store_only.appointments

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| client_name | text | no | — |
| client_email | text | no | — |
| client_phone | text | no | — |
| service | text | no | — |
| scheduled_at | timestamp with time zone | no | — |
| status | text | yes | 'pending'::text |
| notes | text | yes | — |
| whatsapp_sent | boolean | yes | false |
| created_at | timestamp with time zone | yes | now() |

Constraints:

- `appointments_pkey`: `PRIMARY KEY (id)`
- `appointments_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text])))`

#### zc_backup_20261101_store_only.blogs

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| title | text | no | — |
| slug | text | no | — |
| excerpt | text | yes | — |
| content | text | no | — |
| status | text | yes | 'draft'::text |
| author_id | uuid | yes | — |
| author_name | text | yes | 'Studio Team'::text |
| category | text | yes | 'Design & Tech'::text |
| views_count | integer | yes | 0 |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

Constraints:

- `blogs_pkey`: `PRIMARY KEY (id)`
- `blogs_slug_key`: `UNIQUE (slug)`
- `blogs_status_check`: `CHECK ((status = ANY (ARRAY['published'::text, 'draft'::text, 'archived'::text])))`

#### zc_backup_20261101_store_only.clients

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| email | text | no | — |
| phone | text | yes | — |
| company | text | yes | — |
| status | text | yes | 'lead'::text |
| total_spent | numeric(10,2) | yes | 0.00 |
| notes | text | yes | — |
| created_at | timestamp with time zone | yes | now() |

Constraints:

- `clients_email_key`: `UNIQUE (email)`
- `clients_pkey`: `PRIMARY KEY (id)`
- `clients_status_check`: `CHECK ((status = ANY (ARRAY['active'::text, 'lead'::text, 'archived'::text])))`

#### zc_backup_20261101_store_only.cms_content_records

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| kind | text | no | — |
| title | text | no | — |
| handle | text | no | — |
| status | text | no | 'draft'::text |
| parent_id | uuid | yes | — |
| data | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_content_records_check`: `CHECK (((kind = ANY (ARRAY['articles'::text, 'entries'::text])) = (parent_id IS NOT NULL)))`
- `cms_content_records_data_check`: `CHECK ((jsonb_typeof(data) = 'object'::text))`
- `cms_content_records_handle_check`: `CHECK (((handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text) AND (length(handle) <= 120)))`
- `cms_content_records_kind_check`: `CHECK ((kind = ANY (ARRAY['folders'::text, 'menus'::text, 'redirects'::text, 'blogs'::text, 'articles'::text, 'definitions'::text, 'entries'::text])))`
- `cms_content_records_pkey`: `PRIMARY KEY (id)`
- `cms_content_records_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text])))`
- `cms_content_records_title_check`: `CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 200)))`

#### zc_backup_20261101_store_only.cms_navigation_items

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| menu_id | uuid | no | — |
| label | text | no | — |
| href | text | no | — |
| position | integer | no | 0 |
| visible | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_navigation_items_label_check`: `CHECK (((length(TRIM(BOTH FROM label)) >= 1) AND (length(TRIM(BOTH FROM label)) <= 100)))`
- `cms_navigation_items_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.cms_navigation_menus

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| location | text | no | 'header'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_navigation_menus_name_key`: `UNIQUE (name)`
- `cms_navigation_menus_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.cms_pages

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| title | text | no | — |
| slug | text | no | — |
| excerpt | text | no | ''::text |
| content | text | no | ''::text |
| status | text | no | 'draft'::text |
| seo_title | text | no | ''::text |
| seo_description | text | no | ''::text |
| featured_image_url | text | no | ''::text |
| author_id | uuid | yes | — |
| published_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_pages_pkey`: `PRIMARY KEY (id)`
- `cms_pages_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text))`
- `cms_pages_slug_key`: `UNIQUE (slug)`
- `cms_pages_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`
- `cms_pages_title_check`: `CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180)))`

#### zc_backup_20261101_store_only.cms_site_settings

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| setting_key | text | no | — |
| value | jsonb | no | '{}'::jsonb |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `cms_site_settings_pkey`: `PRIMARY KEY (setting_key)`

#### zc_backup_20261101_store_only.customer_addresses

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no | — |
| label | text | no | 'Home'::text |
| full_name | text | no | — |
| phone | text | no | — |
| line1 | text | no | — |
| line2 | text | no | ''::text |
| city | text | no | — |
| state | text | no | — |
| postal_code | text | no | — |
| country | text | no | 'IN'::text |
| is_default | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `customer_addresses_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.manifest

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| table_name | text | no | — |
| source_rows | bigint | yes | — |
| backup_rows | bigint | yes | — |
| captured_at | timestamp with time zone | yes | now() |

Constraints:

- `manifest_pkey`: `PRIMARY KEY (table_name)`

#### zc_backup_20261101_store_only.notifications

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| title | text | no | — |
| message | text | no | — |
| category | text | no | 'system'::text |
| type | text | no | 'info'::text |
| read | boolean | no | false |
| link | text | yes | — |
| created_at | timestamp with time zone | yes | now() |
| recipient_id | uuid | yes | — |
| dedupe_key | text | yes | — |
| metadata | jsonb | no | '{}'::jsonb |
| workspace | text | no | 'studio'::text |
| event_key | text | yes | — |

Constraints:

- `notifications_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.object_definitions

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| object_type | text | yes | — |
| name | text | yes | — |
| definition | jsonb | yes | — |

#### zc_backup_20261101_store_only.profiles

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| email | text | no | — |
| full_name | text | no | — |
| avatar_url | text | yes | — |
| role | user_role | no | 'client'::user_role |
| phone | text | yes | — |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| is_active | boolean | no | true |

Constraints:

- `profiles_email_key`: `UNIQUE (email)`
- `profiles_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.reviews

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| client_name | text | no | — |
| client_role | text | yes | — |
| company | text | yes | — |
| avatar_url | text | yes | — |
| rating | integer | yes | 5 |
| comment | text | no | — |
| status | text | yes | 'pending'::text |
| created_at | timestamp with time zone | yes | now() |

Constraints:

- `reviews_pkey`: `PRIMARY KEY (id)`
- `reviews_rating_check`: `CHECK (((rating >= 1) AND (rating <= 5)))`
- `reviews_status_check`: `CHECK ((status = ANY (ARRAY['approved'::text, 'pending'::text, 'rejected'::text])))`

#### zc_backup_20261101_store_only.store_audit_logs

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| actor_id | uuid | yes | — |
| action | text | no | — |
| entity_type | text | no | — |
| entity_id | uuid | yes | — |
| metadata | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_audit_logs_metadata_check`: `CHECK ((jsonb_typeof(metadata) = 'object'::text))`
- `store_audit_logs_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.store_bundle_items

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| bundle_id | uuid | no | — |
| product_id | uuid | no | — |
| quantity | integer | no | 1 |
| sort_order | integer | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_bundle_items_pkey`: `PRIMARY KEY (bundle_id, product_id)`
- `store_bundle_items_quantity_check`: `CHECK ((quantity > 0))`
- `store_bundle_items_sort_order_check`: `CHECK ((sort_order >= 0))`

#### zc_backup_20261101_store_only.store_bundles

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| slug | text | no | — |
| name | text | no | — |
| description | text | no | ''::text |
| discount_percent | numeric(5,2) | no | 15 |
| image_url | text | no | ''::text |
| status | text | no | 'draft'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_bundles_discount_percent_check`: `CHECK (((discount_percent >= (0)::numeric) AND (discount_percent < (100)::numeric)))`
- `store_bundles_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)))`
- `store_bundles_pkey`: `PRIMARY KEY (id)`
- `store_bundles_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_bundles_slug_key`: `UNIQUE (slug)`
- `store_bundles_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`

#### zc_backup_20261101_store_only.store_cart_items

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| cart_id | uuid | no | — |
| variant_id | uuid | no | — |
| quantity | integer | no | — |
| customization | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_cart_items_cart_id_variant_id_key`: `UNIQUE (cart_id, variant_id)`
- `store_cart_items_customization_check`: `CHECK ((jsonb_typeof(customization) = 'object'::text))`
- `store_cart_items_pkey`: `PRIMARY KEY (id)`
- `store_cart_items_quantity_check`: `CHECK ((quantity > 0))`

#### zc_backup_20261101_store_only.store_carts

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | yes | — |
| guest_token | text | yes | — |
| currency | text | no | 'INR'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_carts_check`: `CHECK (((user_id IS NOT NULL) OR (guest_token IS NOT NULL)))`
- `store_carts_currency_check`: `CHECK ((currency = 'INR'::text))`
- `store_carts_guest_token_key`: `UNIQUE (guest_token)`
- `store_carts_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.store_categories

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| slug | text | no | — |
| description | text | no | ''::text |
| image_url | text | no | ''::text |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| deleted_at | timestamp with time zone | yes | — |
| purge_after | timestamp with time zone | yes | — |
| deleted_from_is_active | boolean | yes | — |

Constraints:

- `store_categories_delete_window_check`: `CHECK ((((deleted_at IS NULL) AND (purge_after IS NULL) AND (deleted_from_is_active IS NULL)) OR ((deleted_at IS NOT NULL) AND (purge_after IS NOT NULL) AND (deleted_from_is_active IS NOT NULL) AND (purge_after >= (deleted_at + '15 days'::interval)))))`
- `store_categories_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 100)))`
- `store_categories_pkey`: `PRIMARY KEY (id)`
- `store_categories_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_categories_slug_key`: `UNIQUE (slug)`

#### zc_backup_20261101_store_only.store_checkout_requests

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | — |
| idempotency_key | text | no | — |
| request_fingerprint | text | no | — |
| order_id | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |
| completed_at | timestamp with time zone | yes | — |

Constraints:

- `store_checkout_requests_customer_id_idempotency_key_key`: `UNIQUE (customer_id, idempotency_key)`
- `store_checkout_requests_idempotency_key_check`: `CHECK (((length(TRIM(BOTH FROM idempotency_key)) >= 1) AND (length(TRIM(BOTH FROM idempotency_key)) <= 128)))`
- `store_checkout_requests_pkey`: `PRIMARY KEY (id)`
- `store_checkout_requests_request_fingerprint_check`: `CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text))`

#### zc_backup_20261101_store_only.store_collection_products

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| collection_id | uuid | no | — |
| product_id | uuid | no | — |
| sort_order | integer | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_collection_products_pkey`: `PRIMARY KEY (collection_id, product_id)`
- `store_collection_products_sort_order_check`: `CHECK ((sort_order >= 0))`

#### zc_backup_20261101_store_only.store_collections

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| slug | text | no | — |
| tagline | text | no | ''::text |
| description | text | no | ''::text |
| image_url | text | no | ''::text |
| status | text | no | 'draft'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_collections_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)))`
- `store_collections_pkey`: `PRIMARY KEY (id)`
- `store_collections_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_collections_slug_key`: `UNIQUE (slug)`
- `store_collections_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`

#### zc_backup_20261101_store_only.store_customization_templates

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | yes | — |
| name | text | no | — |
| slug | text | no | — |
| schema | jsonb | no | '{}'::jsonb |
| preview_url | text | no | ''::text |
| status | text | no | 'draft'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_customization_templates_pkey`: `PRIMARY KEY (id)`
- `store_customization_templates_schema_check`: `CHECK ((jsonb_typeof(schema) = 'object'::text))`
- `store_customization_templates_slug_key`: `UNIQUE (slug)`
- `store_customization_templates_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`

#### zc_backup_20261101_store_only.store_customizations

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | — |
| product_id | uuid | no | — |
| template_id | uuid | no | — |
| object_path | text | no | — |
| mime_type | text | no | — |
| byte_size | bigint | no | — |
| status | text | no | 'ready'::text |
| created_at | timestamp with time zone | no | now() |
| consumed_at | timestamp with time zone | yes | — |

Constraints:

- `store_customizations_byte_size_check`: `CHECK (((byte_size > 0) AND (byte_size <= 26214400)))`
- `store_customizations_mime_type_check`: `CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'application/pdf'::text])))`
- `store_customizations_object_path_check`: `CHECK ((object_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|png|webp|pdf)$'::text))`
- `store_customizations_object_path_key`: `UNIQUE (object_path)`
- `store_customizations_pkey`: `PRIMARY KEY (id)`
- `store_customizations_status_check`: `CHECK ((status = ANY (ARRAY['ready'::text, 'consumed'::text, 'rejected'::text])))`

#### zc_backup_20261101_store_only.store_inventory_levels

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| location_id | uuid | no | — |
| variant_id | uuid | no | — |
| on_hand | integer | no | 0 |
| reserved | integer | no | 0 |
| reorder_point | integer | no | 0 |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_inventory_levels_check`: `CHECK (((reserved >= 0) AND (reserved <= on_hand)))`
- `store_inventory_levels_on_hand_check`: `CHECK ((on_hand >= 0))`
- `store_inventory_levels_pkey`: `PRIMARY KEY (location_id, variant_id)`
- `store_inventory_levels_reorder_point_check`: `CHECK ((reorder_point >= 0))`

#### zc_backup_20261101_store_only.store_inventory_locations

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| code | text | no | — |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_inventory_locations_code_key`: `UNIQUE (code)`
- `store_inventory_locations_name_key`: `UNIQUE (name)`
- `store_inventory_locations_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.store_inventory_movements

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| location_id | uuid | no | — |
| variant_id | uuid | yes | — |
| quantity_delta | integer | no | — |
| reason | text | no | — |
| reference_type | text | yes | — |
| reference_id | uuid | yes | — |
| created_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_inventory_movements_pkey`: `PRIMARY KEY (id)`
- `store_inventory_movements_quantity_delta_check`: `CHECK ((quantity_delta <> 0))`

#### zc_backup_20261101_store_only.store_inventory_reservations

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_id | uuid | no | — |
| order_item_id | uuid | yes | — |
| location_id | uuid | no | — |
| variant_id | uuid | no | — |
| quantity | integer | no | — |
| status | text | no | 'reserved'::text |
| created_at | timestamp with time zone | no | now() |
| released_at | timestamp with time zone | yes | — |
| fulfilled_at | timestamp with time zone | yes | — |
| expires_at | timestamp with time zone | yes | — |
| release_reason | text | yes | — |

Constraints:

- `store_inventory_reservations_check`: `CHECK ((((status = 'reserved'::text) AND (released_at IS NULL) AND (fulfilled_at IS NULL)) OR ((status = 'released'::text) AND (released_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((status = 'fulfilled'::text) AND (released_at IS NULL) AND (fulfilled_at IS NOT NULL))))`
- `store_inventory_reservations_lifecycle_check`: `CHECK ((((status = 'reserved'::text) AND (released_at IS NULL) AND (fulfilled_at IS NULL)) OR ((status = 'released'::text) AND (released_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((status = 'expired'::text) AND (released_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((status = 'fulfilled'::text) AND (released_at IS NULL) AND (fulfilled_at IS NOT NULL))))`
- `store_inventory_reservations_order_id_location_id_variant_i_key`: `UNIQUE (order_id, location_id, variant_id)`
- `store_inventory_reservations_pkey`: `PRIMARY KEY (id)`
- `store_inventory_reservations_quantity_check`: `CHECK ((quantity > 0))`
- `store_inventory_reservations_release_reason_check`: `CHECK (((release_reason IS NULL) OR (release_reason = ANY (ARRAY['payment_failed'::text, 'cancelled'::text, 'manual_release'::text, 'expired'::text]))))`
- `store_inventory_reservations_status_check`: `CHECK ((status = ANY (ARRAY['reserved'::text, 'released'::text, 'expired'::text, 'fulfilled'::text])))`

#### zc_backup_20261101_store_only.store_inventory_transfer_items

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| transfer_id | uuid | no | — |
| variant_id | uuid | yes | — |
| quantity | integer | no | — |

Constraints:

- `store_inventory_transfer_items_pkey`: `PRIMARY KEY (id)`
- `store_inventory_transfer_items_quantity_check`: `CHECK ((quantity > 0))`
- `store_inventory_transfer_items_transfer_id_variant_id_key`: `UNIQUE (transfer_id, variant_id)`

#### zc_backup_20261101_store_only.store_inventory_transfers

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| transfer_number | text | no | — |
| from_location_id | uuid | no | — |
| to_location_id | uuid | no | — |
| status | text | no | 'draft'::text |
| notes | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_inventory_transfers_check`: `CHECK ((from_location_id <> to_location_id))`
- `store_inventory_transfers_pkey`: `PRIMARY KEY (id)`
- `store_inventory_transfers_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'in_transit'::text, 'received'::text, 'cancelled'::text])))`
- `store_inventory_transfers_transfer_number_key`: `UNIQUE (transfer_number)`

#### zc_backup_20261101_store_only.store_media_assets

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| storage_path | text | no | — |
| public_url | text | no | — |
| file_name | text | no | — |
| folder | text | no | — |
| alt_text | text | no | ''::text |
| mime_type | text | no | — |
| size_bytes | bigint | no | 0 |
| created_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_media_assets_pkey`: `PRIMARY KEY (storage_path)`
- `store_media_assets_size_bytes_check`: `CHECK ((size_bytes >= 0))`

#### zc_backup_20261101_store_only.store_order_items

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_id | uuid | no | — |
| product_id | uuid | yes | — |
| variant_id | uuid | yes | — |
| title | text | no | — |
| sku | text | no | ''::text |
| quantity | integer | no | — |
| unit_price_paise | bigint | yes | — |
| currency | text | no | 'INR'::text |
| customization | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |
| unit_price_minor | bigint | yes | — |
| currency_code | text | yes | — |

Constraints:

- `store_order_items_currency_check`: `CHECK ((currency = ANY (ARRAY['INR'::text, 'USD'::text])))`
- `store_order_items_money_snapshot_check`: `CHECK ((((currency = 'INR'::text) AND (unit_price_paise IS NOT NULL) AND (unit_price_minor IS NULL)) OR ((currency = 'USD'::text) AND (unit_price_minor IS NOT NULL) AND (unit_price_paise IS NULL))))`
- `store_order_items_pkey`: `PRIMARY KEY (id)`
- `store_order_items_quantity_check`: `CHECK ((quantity > 0))`
- `store_order_items_unit_price_paise_check`: `CHECK ((unit_price_paise >= 0))`

#### zc_backup_20261101_store_only.store_orders

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_number | text | no | — |
| customer_name | text | no | — |
| customer_email | text | no | — |
| customer_phone | text | no | — |
| shipping_address | jsonb | no | — |
| items | jsonb | no | — |
| delivery_method | text | no | — |
| coupon_code | text | yes | — |
| subtotal | numeric(12,2) | no | — |
| discount | numeric(12,2) | no | 0 |
| shipping_fee | numeric(12,2) | no | 0 |
| tax | numeric(12,2) | no | 0 |
| total | numeric(12,2) | no | — |
| currency | text | no | 'USD'::text |
| status | text | no | 'pending'::text |
| payment_status | text | no | 'unpaid'::text |
| payment_method | text | no | 'cod'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| customer_id | uuid | yes | — |
| idempotency_key | text | yes | — |
| payment_attempt_id | uuid | yes | — |

Constraints:

- `store_orders_currency_check`: `CHECK ((currency ~ '^[A-Z]{3}$'::text))`
- `store_orders_delivery_method_check`: `CHECK ((delivery_method = ANY (ARRAY['standard'::text, 'express'::text, 'overnight'::text])))`
- `store_orders_discount_check`: `CHECK ((discount >= (0)::numeric))`
- `store_orders_order_number_key`: `UNIQUE (order_number)`
- `store_orders_payment_method_check`: `CHECK ((payment_method = ANY (ARRAY['cod'::text, 'upi_qr'::text, 'bank_transfer'::text])))`
- `store_orders_payment_status_check`: `CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])))`
- `store_orders_pkey`: `PRIMARY KEY (id)`
- `store_orders_shipping_fee_check`: `CHECK ((shipping_fee >= (0)::numeric))`
- `store_orders_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'fulfilling'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text])))`
- `store_orders_subtotal_check`: `CHECK ((subtotal >= (0)::numeric))`
- `store_orders_tax_check`: `CHECK ((tax >= (0)::numeric))`
- `store_orders_total_check`: `CHECK ((total >= (0)::numeric))`

#### zc_backup_20261101_store_only.store_payment_attempts

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_id | uuid | no | — |
| customer_id | uuid | no | — |
| method_code | text | no | — |
| amount | numeric(12,2) | no | — |
| currency | text | no | — |
| idempotency_key | text | no | — |
| status | text | no | 'awaiting_customer'::text |
| provider_reference | text | no | ''::text |
| metadata | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_payment_attempts_amount_check`: `CHECK ((amount >= (0)::numeric))`
- `store_payment_attempts_currency_check`: `CHECK ((currency ~ '^[A-Z]{3}$'::text))`
- `store_payment_attempts_idempotency_key_check`: `CHECK (((length(TRIM(BOTH FROM idempotency_key)) >= 1) AND (length(TRIM(BOTH FROM idempotency_key)) <= 128)))`
- `store_payment_attempts_metadata_check`: `CHECK ((jsonb_typeof(metadata) = 'object'::text))`
- `store_payment_attempts_method_code_check`: `CHECK ((method_code = ANY (ARRAY['upi_qr'::text, 'bank_transfer'::text])))`
- `store_payment_attempts_order_id_idempotency_key_key`: `UNIQUE (order_id, idempotency_key)`
- `store_payment_attempts_pkey`: `PRIMARY KEY (id)`
- `store_payment_attempts_status_check`: `CHECK ((status = ANY (ARRAY['awaiting_customer'::text, 'proof_submitted'::text, 'paid'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text])))`

#### zc_backup_20261101_store_only.store_payment_methods

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| method_code | text | no | — |
| display_name | text | no | — |
| enabled | boolean | no | false |
| merchant_name | text | no | ''::text |
| upi_vpa | text | no | ''::text |
| upi_qr_image_url | text | no | ''::text |
| bank_name | text | no | ''::text |
| bank_account_name | text | no | ''::text |
| bank_account_number | text | no | ''::text |
| bank_ifsc | text | no | ''::text |
| instructions | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_payment_methods_display_name_check`: `CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 80)))`
- `store_payment_methods_method_code_check`: `CHECK ((method_code = ANY (ARRAY['upi_qr'::text, 'bank_transfer'::text])))`
- `store_payment_methods_method_code_key`: `UNIQUE (method_code)`
- `store_payment_methods_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.store_payment_submissions

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| payment_attempt_id | uuid | no | — |
| order_id | uuid | no | — |
| customer_id | uuid | no | — |
| utr | text | no | — |
| amount | numeric(12,2) | no | — |
| paid_at | timestamp with time zone | yes | — |
| evidence_path | text | no | ''::text |
| note | text | no | ''::text |
| status | text | no | 'pending'::text |
| reviewed_by | uuid | yes | — |
| reviewed_at | timestamp with time zone | yes | — |
| review_note | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_payment_submissions_amount_check`: `CHECK ((amount >= (0)::numeric))`
- `store_payment_submissions_payment_attempt_id_utr_key`: `UNIQUE (payment_attempt_id, utr)`
- `store_payment_submissions_pkey`: `PRIMARY KEY (id)`
- `store_payment_submissions_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))`
- `store_payment_submissions_utr_check`: `CHECK ((utr ~ '^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$'::text))`

#### zc_backup_20261101_store_only.store_product_digital_files

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | no | — |
| variant_id | uuid | yes | — |
| storage_path | text | no | — |
| file_name | text | no | — |
| mime_type | text | no | — |
| size_bytes | bigint | no | — |
| sort_order | integer | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_product_digital_files_file_name_check`: `CHECK (((length(TRIM(BOTH FROM file_name)) >= 1) AND (length(TRIM(BOTH FROM file_name)) <= 180)))`
- `store_product_digital_files_pkey`: `PRIMARY KEY (id)`
- `store_product_digital_files_size_bytes_check`: `CHECK (((size_bytes > 0) AND (size_bytes <= 262144000)))`
- `store_product_digital_files_sort_order_check`: `CHECK ((sort_order >= 0))`
- `store_product_digital_files_storage_path_key`: `UNIQUE (storage_path)`

#### zc_backup_20261101_store_only.store_product_media

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | no | — |
| variant_id | uuid | yes | — |
| storage_path | text | no | — |
| public_url | text | no | — |
| alt_text | text | no | ''::text |
| media_type | text | no | 'image'::text |
| sort_order | integer | no | 0 |
| is_primary | boolean | no | false |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_product_media_media_type_check`: `CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text])))`
- `store_product_media_pkey`: `PRIMARY KEY (id)`
- `store_product_media_product_id_storage_path_key`: `UNIQUE (product_id, storage_path)`
- `store_product_media_sort_order_check`: `CHECK ((sort_order >= 0))`

#### zc_backup_20261101_store_only.store_product_variants

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | no | — |
| label | text | no | — |
| sku | text | no | — |
| options | jsonb | no | '{}'::jsonb |
| price | numeric(12,2) | no | — |
| stock | integer | yes | — |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| price_paise | bigint | yes | — |
| currency_code | text | no | 'INR'::text |

Constraints:

- `store_product_variants_inr_only`: `CHECK (((currency_code = 'INR'::text) AND (price_paise = (round((price * (100)::numeric)))::bigint)))`
- `store_product_variants_label_check`: `CHECK (((length(TRIM(BOTH FROM label)) >= 1) AND (length(TRIM(BOTH FROM label)) <= 100)))`
- `store_product_variants_options_check`: `CHECK ((jsonb_typeof(options) = 'object'::text))`
- `store_product_variants_pkey`: `PRIMARY KEY (id)`
- `store_product_variants_price_check`: `CHECK ((price >= (0)::numeric))`
- `store_product_variants_sku_key`: `UNIQUE (sku)`
- `store_product_variants_stock_check`: `CHECK (((stock IS NULL) OR (stock >= 0)))`

#### zc_backup_20261101_store_only.store_products

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| category_id | uuid | yes | — |
| title | text | no | — |
| slug | text | no | — |
| description | text | no | ''::text |
| product_type | text | no | 'physical'::text |
| status | text | no | 'draft'::text |
| sku | text | no | — |
| price | numeric(12,2) | no | 0 |
| compare_at_price | numeric(12,2) | yes | — |
| currency | text | no | 'USD'::text |
| stock | integer | yes | — |
| image_url | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| price_paise | bigint | yes | — |
| compare_at_price_paise | bigint | yes | — |
| currency_code | text | no | 'INR'::text |
| write_version | bigint | no | 1 |
| subcategory_id | uuid | yes | — |
| design_origin | text | no | 'original_zerocraft'::text |
| rights_status | text | no | 'not_applicable'::text |
| digital_delivery | jsonb | no | '{"mode": "instant", "download_limit": 0, "link_expiry_hours": 0}'::jsonb |
| deleted_at | timestamp with time zone | yes | — |
| purge_after | timestamp with time zone | yes | — |
| deleted_from_status | text | yes | — |

Constraints:

- `store_products_check`: `CHECK (((compare_at_price IS NULL) OR (compare_at_price >= price)))`
- `store_products_currency_check`: `CHECK ((currency ~ '^[A-Z]{3}$'::text))`
- `store_products_delete_window_check`: `CHECK ((((deleted_at IS NULL) AND (purge_after IS NULL) AND (deleted_from_status IS NULL)) OR ((deleted_at IS NOT NULL) AND (purge_after IS NOT NULL) AND (deleted_from_status IS NOT NULL) AND (purge_after >= (deleted_at + '15 days'::interval)))))`
- `store_products_deleted_from_status_check`: `CHECK (((deleted_from_status IS NULL) OR (deleted_from_status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))))`
- `store_products_design_origin_check`: `CHECK ((design_origin = ANY (ARRAY['original_zerocraft'::text, 'licensed'::text, 'fan_inspired'::text])))`
- `store_products_digital_delivery_check`: `CHECK ((jsonb_typeof(digital_delivery) = 'object'::text))`
- `store_products_inr_only`: `CHECK (((currency = 'INR'::text) AND (currency_code = 'INR'::text) AND (price_paise = (round((price * (100)::numeric)))::bigint) AND (NOT (compare_at_price_paise IS DISTINCT FROM
CASE
    WHEN (compare_at_price IS NULL) THEN NULL::bigint
    ELSE (round((compare_at_price * (100)::numeric)))::bigint
END))))`
- `store_products_pkey`: `PRIMARY KEY (id)`
- `store_products_price_check`: `CHECK ((price >= (0)::numeric))`
- `store_products_product_type_check`: `CHECK ((product_type = ANY (ARRAY['physical'::text, 'digital'::text])))`
- `store_products_rights_status_check`: `CHECK ((rights_status = ANY (ARRAY['not_applicable'::text, 'approved_license'::text, 'review_required'::text])))`
- `store_products_sku_key`: `UNIQUE (sku)`
- `store_products_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_products_slug_key`: `UNIQUE (slug)`
- `store_products_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))`
- `store_products_stock_check`: `CHECK (((stock IS NULL) OR (stock >= 0)))`
- `store_products_title_check`: `CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180)))`
- `store_products_write_version_positive`: `CHECK ((write_version > 0))`

#### zc_backup_20261101_store_only.store_purchase_order_items

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| purchase_order_id | uuid | no | — |
| variant_id | uuid | yes | — |
| quantity_ordered | integer | no | — |
| quantity_received | integer | no | 0 |
| unit_cost_paise | bigint | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_purchase_order_items_check`: `CHECK (((quantity_received >= 0) AND (quantity_received <= quantity_ordered)))`
- `store_purchase_order_items_pkey`: `PRIMARY KEY (id)`
- `store_purchase_order_items_purchase_order_id_variant_id_key`: `UNIQUE (purchase_order_id, variant_id)`
- `store_purchase_order_items_quantity_ordered_check`: `CHECK ((quantity_ordered > 0))`
- `store_purchase_order_items_unit_cost_paise_check`: `CHECK ((unit_cost_paise >= 0))`

#### zc_backup_20261101_store_only.store_purchase_orders

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| order_number | text | no | — |
| supplier_id | uuid | no | — |
| location_id | uuid | no | — |
| status | text | no | 'draft'::text |
| expected_at | date | yes | — |
| notes | text | no | ''::text |
| currency | text | no | 'INR'::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_purchase_orders_currency_check`: `CHECK ((currency = 'INR'::text))`
- `store_purchase_orders_order_number_key`: `UNIQUE (order_number)`
- `store_purchase_orders_pkey`: `PRIMARY KEY (id)`
- `store_purchase_orders_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'ordered'::text, 'partial'::text, 'received'::text, 'cancelled'::text])))`

#### zc_backup_20261101_store_only.store_recycle_bin_assets

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| storage_path | text | no | — |
| file_name | text | no | — |
| folder | text | no | — |
| mime_type | text | no | — |
| size_bytes | bigint | no | 0 |
| deleted_at | timestamp with time zone | no | now() |
| purge_after | timestamp with time zone | no | — |
| deleted_by | uuid | yes | — |

Constraints:

- `store_recycle_bin_assets_check`: `CHECK ((purge_after >= (deleted_at + '15 days'::interval)))`
- `store_recycle_bin_assets_pkey`: `PRIMARY KEY (storage_path)`
- `store_recycle_bin_assets_size_bytes_check`: `CHECK ((size_bytes >= 0))`

#### zc_backup_20261101_store_only.store_subcategories

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| category_id | uuid | no | — |
| name | text | no | — |
| slug | text | no | — |
| description | text | no | ''::text |
| image_url | text | no | ''::text |
| sort_order | integer | no | 0 |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| deleted_at | timestamp with time zone | yes | — |
| purge_after | timestamp with time zone | yes | — |
| deleted_from_is_active | boolean | yes | — |

Constraints:

- `store_subcategories_category_id_slug_key`: `UNIQUE (category_id, slug)`
- `store_subcategories_delete_window_check`: `CHECK ((((deleted_at IS NULL) AND (purge_after IS NULL) AND (deleted_from_is_active IS NULL)) OR ((deleted_at IS NOT NULL) AND (purge_after IS NOT NULL) AND (deleted_from_is_active IS NOT NULL) AND (purge_after >= (deleted_at + '15 days'::interval)))))`
- `store_subcategories_id_category_id_key`: `UNIQUE (id, category_id)`
- `store_subcategories_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 100)))`
- `store_subcategories_pkey`: `PRIMARY KEY (id)`
- `store_subcategories_slug_check`: `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))`
- `store_subcategories_sort_order_check`: `CHECK ((sort_order >= 0))`

#### zc_backup_20261101_store_only.store_suppliers

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no | — |
| email | text | no | ''::text |
| phone | text | no | ''::text |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `store_suppliers_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160)))`
- `store_suppliers_name_key`: `UNIQUE (name)`
- `store_suppliers_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.store_variant_option_values

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| option_id | uuid | no | — |
| value | text | no | — |
| swatch_hex | text | yes | — |
| sort_order | integer | no | 0 |

Constraints:

- `store_variant_option_values_option_id_value_key`: `UNIQUE (option_id, value)`
- `store_variant_option_values_pkey`: `PRIMARY KEY (id)`
- `store_variant_option_values_sort_order_check`: `CHECK ((sort_order >= 0))`
- `store_variant_option_values_value_check`: `CHECK (((length(TRIM(BOTH FROM value)) >= 1) AND (length(TRIM(BOTH FROM value)) <= 120)))`

#### zc_backup_20261101_store_only.store_variant_options

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| product_id | uuid | no | — |
| name | text | no | — |
| sort_order | integer | no | 0 |

Constraints:

- `store_variant_options_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80)))`
- `store_variant_options_pkey`: `PRIMARY KEY (id)`
- `store_variant_options_product_id_name_key`: `UNIQUE (product_id, name)`
- `store_variant_options_sort_order_check`: `CHECK ((sort_order >= 0))`

#### zc_backup_20261101_store_only.store_variant_values

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| variant_id | uuid | no | — |
| option_value_id | uuid | no | — |

Constraints:

- `store_variant_values_pkey`: `PRIMARY KEY (variant_id, option_value_id)`

#### zc_backup_20261101_store_only.store_wishlist_items

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| wishlist_id | uuid | no | — |
| product_id | uuid | no | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_wishlist_items_pkey`: `PRIMARY KEY (wishlist_id, product_id)`

#### zc_backup_20261101_store_only.store_wishlists

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `store_wishlists_pkey`: `PRIMARY KEY (id)`
- `store_wishlists_user_id_key`: `UNIQUE (user_id)`

#### zc_backup_20261101_store_only.storefront_banners

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| title | text | no | — |
| eyebrow | text | no | ''::text |
| body | text | no | ''::text |
| image_url | text | no | ''::text |
| href | text | no | '/store/shop'::text |
| sort_order | integer | no | 0 |
| is_published | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `storefront_banners_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.storefront_sections

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| section_key | text | no | — |
| title | text | no | ''::text |
| payload | jsonb | no | '{}'::jsonb |
| sort_order | integer | no | 0 |
| is_published | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `storefront_sections_payload_check`: `CHECK ((jsonb_typeof(payload) = 'object'::text))`
- `storefront_sections_pkey`: `PRIMARY KEY (id)`
- `storefront_sections_section_key_key`: `UNIQUE (section_key)`

#### zc_backup_20261101_store_only.studio_ai_action_requests

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| action_type | text | no | — |
| title | text | no | — |
| description | text | no | ''::text |
| risk_level | text | no | 'medium'::text |
| status | text | no | 'pending'::text |
| payload | jsonb | no | '{}'::jsonb |
| result | jsonb | no | '{}'::jsonb |
| requested_by | uuid | no | — |
| reviewed_by | uuid | yes | — |
| review_note | text | no | ''::text |
| idempotency_key | text | no | — |
| requested_at | timestamp with time zone | no | now() |
| reviewed_at | timestamp with time zone | yes | — |
| executed_at | timestamp with time zone | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_ai_action_requests_action_type_check`: `CHECK ((action_type = ANY (ARRAY['archive_product'::text, 'update_order_status'::text, 'send_invoice'::text, 'prepare_discount'::text])))`
- `studio_ai_action_requests_idempotency_key_key`: `UNIQUE (idempotency_key)`
- `studio_ai_action_requests_payload_check`: `CHECK ((jsonb_typeof(payload) = 'object'::text))`
- `studio_ai_action_requests_pkey`: `PRIMARY KEY (id)`
- `studio_ai_action_requests_result_check`: `CHECK ((jsonb_typeof(result) = 'object'::text))`
- `studio_ai_action_requests_risk_level_check`: `CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))`
- `studio_ai_action_requests_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'executing'::text, 'executed'::text, 'failed'::text, 'cancelled'::text])))`

#### zc_backup_20261101_store_only.studio_automation_failure_notifications

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| run_id | uuid | no | — |
| recipient_id | uuid | no | — |
| recipient | text | no | — |
| status | text | no | 'sending'::text |
| last_error | text | yes | — |
| sent_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_automation_failure_notifications_pkey`: `PRIMARY KEY (id)`
- `studio_automation_failure_notifications_run_id_recipient_id_key`: `UNIQUE (run_id, recipient_id)`
- `studio_automation_failure_notifications_status_check`: `CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'failed'::text])))`

#### zc_backup_20261101_store_only.studio_automation_runs

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| job_name | text | no | — |
| trigger | text | no | — |
| status | text | no | — |
| started_at | timestamp with time zone | no | now() |
| finished_at | timestamp with time zone | yes | — |
| active_low_stock_count | integer | yes | — |
| error_message | text | yes | — |
| triggered_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |
| is_test | boolean | no | false |

Constraints:

- `studio_automation_runs_pkey`: `PRIMARY KEY (id)`
- `studio_automation_runs_status_check`: `CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text])))`
- `studio_automation_runs_trigger_check`: `CHECK ((trigger = ANY (ARRAY['scheduled'::text, 'manual'::text])))`

#### zc_backup_20261101_store_only.studio_automation_settings

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| job_name | text | no | — |
| enabled | boolean | no | true |
| email_alerts_enabled | boolean | no | true |
| recipient_roles | text[] | no | ARRAY['admin'::text, 'manager'::text] |
| cooldown_minutes | integer | no | 60 |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_automation_settings_cooldown_minutes_check`: `CHECK (((cooldown_minutes >= 5) AND (cooldown_minutes <= 10080)))`
- `studio_automation_settings_pkey`: `PRIMARY KEY (job_name)`

#### zc_backup_20261101_store_only.studio_email_events

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| provider | text | no | 'smtp'::text |
| kind | text | no | — |
| recipient | text | no | — |
| subject | text | no | ''::text |
| status | text | no | 'queued'::text |
| attempts | integer | no | 0 |
| message_id | text | yes | — |
| last_error | text | yes | — |
| next_attempt_at | timestamp with time zone | yes | — |
| sent_at | timestamp with time zone | yes | — |
| metadata | jsonb | no | '{}'::jsonb |
| created_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| is_test | boolean | no | false |

Constraints:

- `studio_email_events_attempts_check`: `CHECK ((attempts >= 0))`
- `studio_email_events_metadata_check`: `CHECK ((jsonb_typeof(metadata) = 'object'::text))`
- `studio_email_events_pkey`: `PRIMARY KEY (id)`
- `studio_email_events_status_check`: `CHECK ((status = ANY (ARRAY['queued'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'dead_letter'::text])))`

#### zc_backup_20261101_store_only.studio_features

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| feature_key | text | no | — |
| display_name | text | no | — |
| description | text | no | ''::text |
| enabled | boolean | no | true |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_features_pkey`: `PRIMARY KEY (feature_key)`

#### zc_backup_20261101_store_only.studio_gmail_audit_events

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| actor_id | uuid | yes | — |
| action | text | no | — |
| outcome | text | no | — |
| gmail_message_id | text | yes | — |
| idempotency_key | uuid | yes | — |
| detail_code | text | yes | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_gmail_audit_events_action_check`: `CHECK ((action = ANY (ARRAY['connect'::text, 'disconnect'::text, 'list'::text, 'read'::text, 'modify'::text, 'draft'::text, 'send'::text, 'attachment'::text])))`
- `studio_gmail_audit_events_outcome_check`: `CHECK ((outcome = ANY (ARRAY['started'::text, 'succeeded'::text, 'failed'::text, 'unknown'::text])))`
- `studio_gmail_audit_events_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.studio_gmail_connections

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| connection_id | text | no | — |
| email_address | text | no | — |
| encrypted_refresh_token | text | no | — |
| connected_by | uuid | no | — |
| connected_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_gmail_connections_connection_id_check`: `CHECK ((connection_id = 'workspace'::text))`
- `studio_gmail_connections_pkey`: `PRIMARY KEY (connection_id)`

#### zc_backup_20261101_store_only.studio_gmail_rate_limits

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| actor_id | uuid | no | — |
| action | text | no | — |
| window_start | timestamp with time zone | no | — |
| request_count | integer | no | 0 |

Constraints:

- `studio_gmail_rate_limits_action_check`: `CHECK ((action = ANY (ARRAY['send'::text, 'read'::text, 'list'::text, 'modify'::text, 'draft'::text, 'connect'::text, 'attachment'::text])))`
- `studio_gmail_rate_limits_pkey`: `PRIMARY KEY (actor_id, action, window_start)`
- `studio_gmail_rate_limits_request_count_check`: `CHECK ((request_count >= 0))`

#### zc_backup_20261101_store_only.studio_gmail_sends

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| actor_id | uuid | no | — |
| idempotency_key | uuid | no | — |
| status | text | no | — |
| gmail_message_id | text | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_gmail_sends_actor_id_idempotency_key_key`: `UNIQUE (actor_id, idempotency_key)`
- `studio_gmail_sends_pkey`: `PRIMARY KEY (id)`
- `studio_gmail_sends_status_check`: `CHECK ((status = ANY (ARRAY['started'::text, 'sent'::text, 'failed'::text, 'unknown'::text])))`

#### zc_backup_20261101_store_only.studio_integrations

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| provider | text | no | — |
| display_name | text | no | — |
| status | text | no | 'connected'::text |
| encrypted_credentials | text | yes | — |
| last_verified_at | timestamp with time zone | yes | — |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |
| enabled | boolean | no | true |
| last_error | text | yes | — |
| metadata | jsonb | no | '{}'::jsonb |

Constraints:

- `studio_integrations_pkey`: `PRIMARY KEY (provider)`
- `studio_integrations_provider_check`: `CHECK ((provider = ANY (ARRAY['gemini'::text, 'supabase'::text, 'gmail'::text, 'whatsapp'::text, 'ga4'::text, 'search_console'::text, 'instagram'::text, 'google_business'::text])))`
- `studio_integrations_status_check`: `CHECK ((status = ANY (ARRAY['connected'::text, 'error'::text])))`

#### zc_backup_20261101_store_only.studio_lead_activities

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| lead_id | uuid | no | — |
| actor_id | uuid | yes | — |
| activity_type | text | no | 'note'::text |
| detail | text | no | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_lead_activities_activity_type_check`: `CHECK ((activity_type = ANY (ARRAY['note'::text, 'email'::text, 'whatsapp'::text, 'call'::text, 'appointment'::text, 'stage_change'::text])))`
- `studio_lead_activities_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.studio_leads

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| client_id | uuid | yes | — |
| name | text | no | — |
| email | text | no | — |
| phone | text | no | ''::text |
| company | text | no | ''::text |
| stage | text | no | 'new'::text |
| source | text | no | 'manual'::text |
| utm_source | text | yes | — |
| utm_medium | text | yes | — |
| utm_campaign | text | yes | — |
| service_interest | text | no | ''::text |
| owner_id | uuid | yes | — |
| next_action | text | no | ''::text |
| next_action_at | timestamp with time zone | yes | — |
| notes | text | no | ''::text |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_leads_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160)))`
- `studio_leads_pkey`: `PRIMARY KEY (id)`
- `studio_leads_stage_check`: `CHECK ((stage = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'proposal'::text, 'won'::text, 'lost'::text])))`

#### zc_backup_20261101_store_only.studio_low_stock_alerts

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| location_id | uuid | no | — |
| variant_id | uuid | no | — |
| last_on_hand | integer | no | 0 |
| last_reserved | integer | no | 0 |
| last_reorder_point | integer | no | 0 |
| status | text | no | 'active'::text |
| first_detected_at | timestamp with time zone | no | now() |
| last_detected_at | timestamp with time zone | no | now() |
| resolved_at | timestamp with time zone | yes | — |

Constraints:

- `studio_low_stock_alerts_location_id_variant_id_key`: `UNIQUE (location_id, variant_id)`
- `studio_low_stock_alerts_pkey`: `PRIMARY KEY (id)`
- `studio_low_stock_alerts_status_check`: `CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text])))`

#### zc_backup_20261101_store_only.studio_notification_preferences

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| user_id | uuid | no | — |
| automation_failure_enabled | boolean | no | true |
| low_stock_enabled | boolean | no | true |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_notification_preferences_pkey`: `PRIMARY KEY (user_id)`

#### zc_backup_20261101_store_only.studio_notification_report_runs

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| job_name | text | no | 'studio-weekly-notification-report'::text |
| status | text | no | 'queued'::text |
| scheduled_for | timestamp with time zone | no | now() |
| period_start | timestamp with time zone | no | (now() - '7 days'::interval) |
| period_end | timestamp with time zone | no | now() |
| started_at | timestamp with time zone | yes | — |
| finished_at | timestamp with time zone | yes | — |
| recipient_count | integer | no | 0 |
| notification_count | integer | no | 0 |
| error_message | text | yes | — |
| triggered_by | uuid | yes | — |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_notification_report_runs_pkey`: `PRIMARY KEY (id)`
- `studio_notification_report_runs_status_check`: `CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text])))`

#### zc_backup_20261101_store_only.studio_notification_report_settings

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| job_name | text | no | 'studio-weekly-notification-report'::text |
| enabled | boolean | no | false |
| weekday | integer | no | 1 |
| send_hour_utc | integer | no | 9 |
| recipient_roles | text[] | no | ARRAY['admin'::text] |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_notification_report_settings_pkey`: `PRIMARY KEY (job_name)`
- `studio_notification_report_settings_send_hour_utc_check`: `CHECK (((send_hour_utc >= 0) AND (send_hour_utc <= 23)))`
- `studio_notification_report_settings_weekday_check`: `CHECK (((weekday >= 0) AND (weekday <= 6)))`

#### zc_backup_20261101_store_only.studio_permissions

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| key | text | no | — |
| label | text | no | — |
| description | text | no | ''::text |
| group_name | text | no | — |
| sort_order | integer | no | 0 |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_permissions_key_check`: `CHECK ((key ~ '^[a-z][a-z0-9_.:-]{1,80}$'::text))`
- `studio_permissions_pkey`: `PRIMARY KEY (key)`

#### zc_backup_20261101_store_only.studio_project_milestones

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| project_id | uuid | no | — |
| title | text | no | — |
| status | text | no | 'todo'::text |
| due_date | date | yes | — |
| position | integer | no | 0 |
| completed_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_project_milestones_pkey`: `PRIMARY KEY (id)`
- `studio_project_milestones_status_check`: `CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'blocked'::text, 'done'::text])))`
- `studio_project_milestones_title_check`: `CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180)))`

#### zc_backup_20261101_store_only.studio_projects

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| client_id | uuid | yes | — |
| work_id | uuid | yes | — |
| name | text | no | — |
| status | text | no | 'planning'::text |
| description | text | no | ''::text |
| deadline | date | yes | — |
| budget | numeric(12,2) | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_projects_budget_check`: `CHECK (((budget IS NULL) OR (budget >= (0)::numeric)))`
- `studio_projects_name_check`: `CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 180)))`
- `studio_projects_pkey`: `PRIMARY KEY (id)`
- `studio_projects_status_check`: `CHECK ((status = ANY (ARRAY['planning'::text, 'active'::text, 'review'::text, 'completed'::text, 'on_hold'::text, 'cancelled'::text])))`

#### zc_backup_20261101_store_only.studio_role_permissions

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| role | text | no | — |
| permission_key | text | no | — |
| allowed | boolean | no | false |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_role_permissions_pkey`: `PRIMARY KEY (role, permission_key)`
- `studio_role_permissions_role_check`: `CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'staff'::text])))`

#### zc_backup_20261101_store_only.studio_sessions

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | — |
| user_id | uuid | no | — |
| device_label | text | no | 'Unknown device'::text |
| device_type | text | no | 'desktop'::text |
| browser | text | no | 'Unknown browser'::text |
| operating_system | text | no | 'Unknown OS'::text |
| user_agent | text | no | ''::text |
| ip_address | text | yes | — |
| first_seen_at | timestamp with time zone | no | now() |
| last_seen_at | timestamp with time zone | no | now() |
| revoked_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_sessions_device_type_check`: `CHECK ((device_type = ANY (ARRAY['desktop'::text, 'mobile'::text, 'tablet'::text, 'unknown'::text])))`
- `studio_sessions_pkey`: `PRIMARY KEY (id)`

#### zc_backup_20261101_store_only.studio_system_health_failure_acknowledgements

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| failure_type | text | no | — |
| failure_id | uuid | no | — |
| status | text | no | 'acknowledged'::text |
| notes | text | yes | — |
| acknowledged_by | uuid | yes | — |
| resolved_by | uuid | yes | — |
| acknowledged_at | timestamp with time zone | no | now() |
| resolved_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_system_health_failure_acknow_failure_type_failure_id_key`: `UNIQUE (failure_type, failure_id)`
- `studio_system_health_failure_acknowledgement_failure_type_check`: `CHECK ((failure_type = ANY (ARRAY['automation'::text, 'email'::text])))`
- `studio_system_health_failure_acknowledgements_pkey`: `PRIMARY KEY (id)`
- `studio_system_health_failure_acknowledgements_status_check`: `CHECK ((status = ANY (ARRAY['acknowledged'::text, 'resolved'::text])))`

#### zc_backup_20261101_store_only.studio_system_health_incidents

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| fingerprint | text | no | — |
| status | text | no | 'open'::text |
| severity | text | no | — |
| component | text | no | — |
| first_seen_at | timestamp with time zone | no | now() |
| last_seen_at | timestamp with time zone | no | now() |
| resolved_at | timestamp with time zone | yes | — |
| latest_message | text | no | ''::text |
| notification_sent_at | timestamp with time zone | yes | — |
| notification_attempts | integer | no | 0 |
| last_error | text | yes | — |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_system_health_incidents_fingerprint_key`: `UNIQUE (fingerprint)`
- `studio_system_health_incidents_notification_attempts_check`: `CHECK ((notification_attempts >= 0))`
- `studio_system_health_incidents_pkey`: `PRIMARY KEY (id)`
- `studio_system_health_incidents_severity_check`: `CHECK ((severity = ANY (ARRAY['degraded'::text, 'critical'::text])))`
- `studio_system_health_incidents_status_check`: `CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))`

#### zc_backup_20261101_store_only.studio_system_health_runs

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| overall | text | no | — |
| checks | jsonb | no | '[]'::jsonb |
| summary | jsonb | no | '{}'::jsonb |
| trigger | text | no | 'dashboard'::text |
| triggered_by | uuid | yes | — |
| started_at | timestamp with time zone | no | now() |
| finished_at | timestamp with time zone | no | now() |
| created_at | timestamp with time zone | no | now() |

Constraints:

- `studio_system_health_runs_checks_check`: `CHECK ((jsonb_typeof(checks) = 'array'::text))`
- `studio_system_health_runs_overall_check`: `CHECK ((overall = ANY (ARRAY['healthy'::text, 'degraded'::text, 'critical'::text])))`
- `studio_system_health_runs_pkey`: `PRIMARY KEY (id)`
- `studio_system_health_runs_summary_check`: `CHECK ((jsonb_typeof(summary) = 'object'::text))`
- `studio_system_health_runs_trigger_check`: `CHECK ((trigger = ANY (ARRAY['dashboard'::text, 'diagnostic'::text, 'scheduled'::text])))`

#### zc_backup_20261101_store_only.studio_system_health_sla_settings

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | boolean | no | true |
| enabled | boolean | no | true |
| uptime_target | numeric(5,2) | no | 99.00 |
| failure_rate_max | numeric(5,2) | no | 5.00 |
| mttr_max_minutes | integer | no | 60 |
| notify_admins | boolean | no | true |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_system_health_sla_settings_failure_rate_max_check`: `CHECK (((failure_rate_max >= (0)::numeric) AND (failure_rate_max <= (100)::numeric)))`
- `studio_system_health_sla_settings_id_check`: `CHECK (id)`
- `studio_system_health_sla_settings_mttr_max_minutes_check`: `CHECK ((mttr_max_minutes >= 0))`
- `studio_system_health_sla_settings_pkey`: `PRIMARY KEY (id)`
- `studio_system_health_sla_settings_uptime_target_check`: `CHECK (((uptime_target >= (0)::numeric) AND (uptime_target <= (100)::numeric)))`

#### zc_backup_20261101_store_only.studio_team_invites

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| email | text | no | — |
| role | user_role | no | 'staff'::user_role |
| auth_user_id | uuid | yes | — |
| invited_by | uuid | no | — |
| status | text | no | 'pending'::text |
| expires_at | timestamp with time zone | no | (now() + '7 days'::interval) |
| created_at | timestamp with time zone | no | now() |
| accepted_at | timestamp with time zone | yes | — |
| revoked_at | timestamp with time zone | yes | — |

Constraints:

- `studio_team_invites_pkey`: `PRIMARY KEY (id)`
- `studio_team_invites_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text, 'email_failed'::text])))`

#### zc_backup_20261101_store_only.studio_user_permissions

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| user_id | uuid | no | — |
| permission_key | text | no | — |
| allowed | boolean | no | — |
| updated_by | uuid | yes | — |
| updated_at | timestamp with time zone | no | now() |

Constraints:

- `studio_user_permissions_pkey`: `PRIMARY KEY (user_id, permission_key)`

#### zc_backup_20261101_store_only.works

RLS: disabled.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| title | text | no | — |
| category | text | no | — |
| image_url | text | no | — |
| client_name | text | no | — |
| description | text | yes | — |
| featured | boolean | yes | false |
| completion_date | date | yes | CURRENT_DATE |
| created_at | timestamp with time zone | yes | now() |
| status | text | no | 'draft'::text |

Constraints:

- `works_pkey`: `PRIMARY KEY (id)`
- `works_status_check`: `CHECK ((status = ANY (ARRAY['published'::text, 'draft'::text, 'archived'::text])))`

## Public functions

| Function | Arguments | Returns |
|---|---|---|
| cancel_order_with_reservations | p_order_id uuid | integer |
| commerce_adjust_inventory | p_location_id uuid, p_variant_id uuid, p_on_hand integer, p_reorder_point integer | jsonb |
| commerce_assign_products_to_category | p_category_id uuid, p_subcategory_id uuid, p_product_ids uuid[] | void |
| commerce_emit_notification | p_title text, p_message text, p_category text, p_type text, p_link text, p_event_key text, p_workspace text, p_metadata jsonb | integer |
| commerce_get_automation_health |  | TABLE(job_name text, schedule text, active boolean, last_run_at timestamp with time zone, last_run_status text, last_run_message text, next_run_at timestamp with time zone) |
| commerce_get_notification_analytics |  | TABLE(user_id uuid, email text, full_name text, total_count bigint, unread_count bigint, read_count bigint, last_notification_at timestamp with time zone) |
| commerce_gmail_consume_rate_limit | p_action text, p_limit integer, p_window_seconds integer | boolean |
| commerce_has_permission | p_permission text | boolean |
| commerce_notify_record_change |  | trigger |
| commerce_permissions_for_current_user |  | TABLE(permission_key text) |
| commerce_purge_expired_products |  | integer |
| commerce_purge_expired_store_categories |  | integer |
| commerce_queue_weekly_notification_report |  | uuid |
| commerce_receive_inventory_transfer | p_transfer_id uuid | jsonb |
| commerce_receive_purchase_order | p_order_id uuid, p_receipts jsonb | jsonb |
| commerce_replace_product_variants | p_product_id uuid, p_variants jsonb | void |
| commerce_restore_store_category | p_category_id uuid | void |
| commerce_restore_store_subcategory | p_subcategory_id uuid | void |
| commerce_save_product_atomic_v2 | p_action text, p_product_id uuid, p_expected_version bigint, p_product jsonb, p_variants jsonb, p_options jsonb | jsonb |
| commerce_soft_delete_store_category | p_category_id uuid | void |
| commerce_soft_delete_store_subcategory | p_subcategory_id uuid | void |
| commerce_store_order_summary |  | jsonb |
| commerce_sync_low_stock_alerts |  | integer |
| commerce_sync_low_stock_alerts_scheduled |  | integer |
| commerce_trigger_weekly_notification_report_worker |  | uuid |
| commerce_variant_has_active_reservations | p_variant_id uuid | boolean |
| create_commerce_profile |  | trigger |
| create_transactional_checkout | p_customer_id uuid, p_idempotency_key text, p_request_fingerprint text, p_checkout jsonb | jsonb |
| create_transactional_checkout_with_payment | p_customer_id uuid, p_idempotency_key text, p_request_fingerprint text, p_checkout jsonb, p_payment_method text | jsonb |
| expire_order_reservations | p_order_id uuid | integer |
| fulfill_order_reservations | p_order_id uuid | integer |
| is_commerce_admin |  | boolean |
| is_commerce_member |  | boolean |
| is_valid_customer_customization_registration | p_customer_id uuid, p_product_id uuid, p_template_id uuid, p_object_path text, p_status text | boolean |
| prepare_manual_payment | p_order_id uuid, p_customer_id uuid, p_method_code text, p_idempotency_key text | jsonb |
| release_order_reservations | p_order_id uuid | integer |
| release_order_reservations | p_order_id uuid, p_reason text | integer |
| submit_manual_payment_utr | p_attempt_id uuid, p_order_id uuid, p_customer_id uuid, p_utr text, p_amount numeric, p_paid_at timestamp with time zone, p_note text | jsonb |
| verify_manual_payment | p_submission_id uuid, p_decision text, p_note text | jsonb |

## Public enums

- `user_role`: `admin`, `manager`, `staff`, `client`

The private backup schema deliberately retains the removed Studio tables for recovery. Its 82 tables include 80 original table snapshots plus `manifest` and `object_definitions`. It is not an active application schema. Supabase-managed Auth, Storage, Realtime, extension, network, cron, vault and migration schemas are listed separately above.


