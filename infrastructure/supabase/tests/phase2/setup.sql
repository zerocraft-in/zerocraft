-- Maara Merch Phase 2 — Database Test Setup
-- Creates test organizations, auth.users, profiles, and memberships
-- Run as: maara_test_user (superuser for test setup)
-- This script creates ONLY test data in the disposable test database.

-- Clean up any previous test data
delete from public.organization_members;
delete from public.invitations;
delete from public.profiles;
delete from auth.users;
delete from public.organizations;

-- Create test organizations
insert into public.organizations (id, name, slug, timezone, currency) values
  ('81552770-25cf-4892-a2a1-c0e84840ef52', 'Org A', 'org-a', 'Asia/Kolkata', 'INR'),
  ('f450107c-ca20-4aab-a28c-618442c6870e', 'Org B', 'org-b', 'Asia/Kolkata', 'INR')
on conflict (id) do nothing;

-- Create auth.users (Simulates Supabase Auth users table)
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'admin-a@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'manager-a@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'staff-a@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'owner-b@example.com'),
  ('66666666-6666-6666-6666-666666666666', 'unauth-user@example.com')
on conflict (id) do nothing;

-- Create profiles
insert into public.profiles (id, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'Owner A'),
  ('22222222-2222-2222-2222-222222222222', 'Admin A'),
  ('33333333-3333-3333-3333-333333333333', 'Manager A'),
  ('44444444-4444-4444-4444-444444444444', 'Staff A'),
  ('55555555-5555-5555-5555-555555555555', 'Owner B'),
  ('66666666-6666-6666-6666-666666666666', 'Unauth User')
on conflict (id) do nothing;

-- Create organization memberships
insert into public.organization_members (organization_id, user_id, role_id, status, joined_at) values
  ('81552770-25cf-4892-a2a1-c0e84840ef52', '11111111-1111-1111-1111-111111111111', '40b7c091-ed4f-4e5a-94b4-086e8fd8fa10', 'active', now()),
  ('81552770-25cf-4892-a2a1-c0e84840ef52', '22222222-2222-2222-2222-222222222222', 'bf89ffe6-1123-4a25-8960-154e3a43c4b2', 'active', now()),
  ('81552770-25cf-4892-a2a1-c0e84840ef52', '33333333-3333-3333-3333-333333333333', '4ceb4879-206b-4d0f-bcb5-9d0806cb003f', 'active', now()),
  ('81552770-25cf-4892-a2a1-c0e84840ef52', '44444444-4444-4444-4444-444444444444', '948d7fac-b770-4d34-a991-8dadc1005e97', 'active', now()),
  ('f450107c-ca20-4aab-a28c-618442c6870e', '55555555-5555-5555-5555-555555555555', '40b7c091-ed4f-4e5a-94b4-086e8fd8fa10', 'active', now())
on conflict (organization_id, user_id) do nothing;