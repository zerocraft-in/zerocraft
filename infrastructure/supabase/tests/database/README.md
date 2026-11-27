# Database Tests

This directory is reserved for pgTAP / SQL database tests that require a running
local Supabase database (Docker required).

**Status: NOT EXECUTED** — Docker is not installed on this machine. These tests
cannot run until `supabase start` / `supabase db reset` are available.

When Docker is available, place test SQL files here and run them via:
```powershell
pnpm exec supabase db reset
psql "$LOCAL_DB_URL" -f tests/database/<test-file>.sql
```
