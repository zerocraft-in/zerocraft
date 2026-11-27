-- Maara Merch Phase 2 - Master Test Runner
-- Run as: maara_test_user (owner of maara_phase2_test database)
-- This script runs all Phase 2 security tests

\echo '========================================'
\echo 'Maara Merch Phase 2 - Security Tests'
\echo '========================================'
\echo ''

-- Setup test data
\echo 'Setting up test data...'
\ir setup.sql
\echo 'Setup complete.'
\echo ''

-- Run RLS tests
\echo '========================================'
\echo 'RLS Isolation Tests'
\echo '========================================'
\ir rls_tests.sql
\echo ''

-- Run invitation tests
\echo '========================================'
\echo 'Invitation Tests'
\echo '========================================'
\ir rls_invitations.sql
\echo ''

-- Run RBAC tests
\echo '========================================'
\echo 'RBAC Tests'
\echo '========================================'
\ir rbac_tests.sql
\echo ''

-- Run concurrency tests
\echo '========================================'
\echo 'Concurrency Tests'
\echo '========================================'
\ir concurrency_tests.sql
\echo ''

-- Cleanup
\echo 'Cleaning up test data...'
delete from public.organization_members;
delete from public.invitations;
delete from public.profiles;
delete from auth.users;
delete from public.organizations;
\echo 'Cleanup complete.'

\echo '========================================'
\echo 'Phase 2 Tests Complete'
\echo '========================================'