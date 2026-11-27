# Helper Scripts

## scripts/bootstrap-platform-owner.sql

Administrative entry point for bootstrapping the first Platform Owner (Mani).

**Purpose:** Promotes an existing Auth user to Platform Owner via the secure,
idempotent `private.bootstrap_platform_owner()` function.

**How to run (local development only, after Docker is available):**

```powershell
# 1. Start the local Supabase stack
pnpm exec supabase start

# 2. Create Mani's Auth account and verify it (email confirmation)

# 3. Obtain Mani's Auth user UUID from auth.users.id

# 4. Run the bootstrap script as the database owner (postgres superuser)
psql "$SUPABASE_DB_URL" `
  -v user_id="<MANI_AUTH_USER_ID>" `
  -v ON_ERROR_STOP=1 `
  -f scripts/bootstrap-platform-owner.sql

# 5. Verify: platform_members has a platform_owner row;
#    platform_bootstrap_events has an audit row

# 6. Stop the local stack
pnpm exec supabase stop
```

**Security:**
- Must be run by a trusted administrator with database-owner (postgres superuser)
  or service_role access.
- The service_role key must NEVER be exposed to browser clients or committed
  to version control.
- No email, password, or UUID is hardcoded. The target user ID is supplied at
  runtime via the `-v user_id=` parameter.
- The bootstrap is one-time: it refuses to run if a Platform Owner already exists.

**Future scripts may include:**
- Migration reset helper
- Commerce template checksum verification
