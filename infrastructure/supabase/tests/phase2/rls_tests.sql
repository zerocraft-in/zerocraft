-- Maara Merch Phase 2 — RLS Isolation Tests
-- Run as: test_user_1 (member of Org A)
-- These tests verify that Row Level Security prevents cross-organization access.
--
-- Prerequisites: setup.sql must be run first to create test data.
--                test_user_1 must exist and have SELECT on public.organizations.

-- ---------------------------------------------------------------------------
-- Test 1: Test user 1 (member of Org A) can see their own organization
-- ============================================================================
select 'Test 1: Test user 1 sees Org A' as test;
set config 'request.jwt.claims.sub' = '11111111-1111-1111-1111-111111111111';
select id, name from public.organizations where id = '81552770-25cf-4892-a2a1-c0e84840ef52';

-- Test 2: Test user 1 CANNOT see Organization B
select 'Test 2: Test user 1 cannot see Org B:' as test;
select id, name from public.organizations where id = 'f450107c-ca20-4aab-a28c-618442c6870e';

-- Test 3: Test user 1 sees only their own organizations
select 'Test 3: Test user 1 sees only Org A:' as test;
select id, name from public.organizations;

reset role;