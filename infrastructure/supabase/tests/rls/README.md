# RLS Tests

This directory is reserved for RLS isolation test suites that require a running
local Supabase database (Docker required).

**Status: NOT EXECUTED** — Docker is not installed on this machine.

When Docker is available, tests verify:
- Unauthenticated access (anon role denied)
- Authenticated user access (own data only)
- Platform Owner access
- Non-platform-member access
- Cross-organization isolation
- Organization member access
- Sensitive credential protection
