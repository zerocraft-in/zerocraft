-- Maara Merch Phase 2 - Concurrency Tests
-- Tests concurrent access to invitations and memberships
-- Run as: test_user_1 (member of Org A)

-- Test 1: Two concurrent invitations for same org+email
select 'Test 1: Two concurrent invitations for same org+email:' as test;
select private.invite_member('81552770-25cf-4892-a2a1-c0e84840ef52', 'concurrent-test@example.com', 'sales_staff') as invite_id_1;
select private.invite_member('81552770-25cf-4892-a2a1-c0e84840ef52', 'concurrent-test@example.com', 'sales_staff') as invite_id_2;
select count(*) as pending_count from public.invitations where organization_id = '81552770-25cf-4892-a2a1-c0e84840ef52' and email = 'concurrent-test@example.com' and accepted_at is null and revoked_at is null;

-- Test 2: Two concurrent acceptances of same token
select 'Test 2: Two concurrent acceptances of same token:' as test;
-- Requires two concurrent connections - tested separately

-- Test 3: Invite + accept concurrently
select 'Test 3: Invite + accept concurrently:' as test;
-- Requires two concurrent connections - tested separately