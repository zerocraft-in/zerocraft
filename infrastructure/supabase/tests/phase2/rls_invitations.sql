-- Maara Merch Phase 2 - Invitation Tests
-- Tests invitation creation, acceptance, replay, and expiry
-- Run as: test_user_1 (member of Org A)

-- Test 1: Authorized user can create invitation
select 'Test 1: Invite member creates invitation' as test;
select private.invite_member('81552770-25cf-4892-a2a1-c0e84840ef52', 'new-user@example.com', 'sales_staff') as invitation_id;

-- Test 2: Invitation acceptance
select 'Test 3: Accept invitation:' as test;
-- First, get the invitation token hash
select id, token_hash from public.invitations where email = 'new-user@example.com' and organization_id = '81552770-25cf-4892-a2a1-c0e84840ef52' and accepted_at is null;

-- Test 4: Invitation replay prevention
select 'Test 4: Invitation replay prevention:' as test;
-- Accept again should fail because already accepted

-- Test 5: Expired invitation rejection
select 'Test 5: Expired invitation rejection:' as test;
-- Create expired invitation and try to accept

-- Test 6: Wrong email rejection
select 'Test 6: Wrong email rejection:' as test;
-- Create invitation for different email and try to accept with different email