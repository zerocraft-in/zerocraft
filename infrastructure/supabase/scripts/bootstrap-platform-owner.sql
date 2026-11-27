-- ============================================================================
-- Zerocraft Platform — Platform Owner Bootstrap Script
--
-- Administrative entry point for bootstrapping the first Platform Owner (Mani).
--
-- HOW TO RUN (local development only, after Docker is available):
--
--   1. Start the local Supabase stack:
--        pnpm exec supabase start
--
--   2. Create Mani's Auth account through the intended authentication flow
--      (e.g., sign up via the admin app, or create directly in auth.users
--      for local development). Verify the account (email confirmation).
--
--   3. Obtain Mani's Auth user UUID (from auth.users.id).
--
--   4. Run this script as the database owner (postgres superuser) using psql.
--      Replace <MANI_AUTH_USER_ID> with the actual UUID from step 3:
--
--        psql "$SUPABASE_DB_URL" \
--          -v user_id="<MANI_AUTH_USER_ID>" \
--          -v ON_ERROR_STOP=1 \
--          -f scripts/bootstrap-platform-owner.sql
--
--      Alternatively, run via the Supabase client with the service_role key:
--
--        npx supabase --service-role rpc call bootstrap_platform_owner ...
--        (not exposed via PostgREST; direct database invocation only)
--
--      Both execution paths work because:
--        * postgres superuser owns the function and bypasses all permission checks.
--        * service_role has explicit EXECUTE grant and bypasses RLS.
--
--      The function is NOT exposed through PostgREST (the private schema is
--      not in api.schemas).
--
-- SECURITY:
--   - This script must be run by a trusted administrator with database-owner
--     (postgres superuser) or service_role access.
--   - The service_role key must NEVER be exposed to browser clients or
--     committed to version control.
--   - No email, password, or UUID is hardcoded in this script or in any
--     migration. The target user ID is supplied at runtime.
--   - The bootstrap is one-time (fail-closed): it refuses to run if a
--     Platform Owner already exists. A second attempt fails hard.
--   - The bootstrap is NOT idempotent in the sense of succeeding again
--     silently; repeated attempts all fail with the same error.
-- ============================================================================

\set ON_ERROR_STOP on

-- ----------------------------------------------------------------------------
-- Validate that the user_id variable is supplied.
-- ----------------------------------------------------------------------------
\set user_id_check = :'user_id'
\if :user_id_check = :'user_id'
\else
\echo 'ERROR: user_id variable is required. Example:'
\echo '  psql "$SUPABASE_DB_URL" -v user_id="<MANI_AUTH_USER_ID>" -v ON_ERROR_STOP=1 -f scripts/bootstrap-platform-owner.sql'
\echo ''
\quit 1
\endif

-- ----------------------------------------------------------------------------
-- Confirm no Platform Owner already exists (defense in depth; the function
-- also enforces this).
-- ----------------------------------------------------------------------------
select
  'Pre-bootstrap check: existing Platform Owner count' as check_name,
  count(*) as existing_owner_count
from public.platform_members pm
join public.platform_roles pr on pr.id = pm.role_id
where pm.status = 'active'
  and pr.key = 'platform_owner';

-- ----------------------------------------------------------------------------
-- Execute the bootstrap. The function:
--   1. Validates the user exists in auth.users and platform_users.
--   2. Refuses if a Platform Owner already exists.
--   3. Inserts the platform_members row with the platform_owner role.
--   4. Records an audit event in platform_bootstrap_events.
-- ----------------------------------------------------------------------------
select private.bootstrap_platform_owner(:'user_id') as bootstrap_event_id;

-- ----------------------------------------------------------------------------
-- Post-bootstrap verification.
-- ----------------------------------------------------------------------------
select
  'Post-bootstrap check: Platform Owner membership' as check_name,
  pm.id as membership_id,
  pm.user_id as platform_owner_user_id,
  pr.key as role_key,
  pm.status as membership_status
from public.platform_members pm
join public.platform_roles pr on pr.id = pm.role_id
where pm.status = 'active'
  and pr.key = 'platform_owner';

select
  'Post-bootstrap check: bootstrap audit event' as check_name,
  id as event_id,
  bootstrapped_user_id,
  action,
  created_at
from public.platform_bootstrap_events
order by created_at desc
limit 1;

-- ============================================================================
-- End of bootstrap script
-- ============================================================================
