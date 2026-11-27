-- Maara Merch Phase 2 - RBAC Tests
-- Tests role-based access control
-- Run as: test_user_1 (member of Org A)

-- Test 1: Owner can change member role
select 'Test 1: Owner can change member role:' as test;
select private.change_member_role('81552770-25cf-4892-a2a1-c0e84840ef52', '22222222-2222-2222-2222-222222222222', 'admin');
select id, role_id from public.organization_members where user_id = '22222222-2222-2222-2222-222222222222' and organization_id = '81552770-25cf-4892-a2a1-c0e84840ef52';

-- Test 2: Non-owner cannot change role
select 'Test 2: Non-owner cannot change role:' as test;
-- Requires different user context

-- Test 3: Cannot assign Owner role via role management
select 'Test 3: Cannot assign Owner role via role management:' as test;
select private.change_member_role('81552770-25cf-4892-a2a1-c0e84840ef52', '33333333-3333-3333-3333-333333333333', 'owner');

-- Test 4: Cannot change role of Owner
select 'Test 4: Cannot change Owner role:' as test;
select private.change_member_role('81552770-25cf-4892-a2a1-c0e84840ef52', '11111111-1111-1111-1111-111111111111', 'admin');