# Helper Scripts

## scripts/bootstrap-platform-owner.sql

Administrative entry point for bootstrapping the first Platform Owner (Mani).

**Purpose:** Promotes an existing Auth user to Platform Owner via the secure,
idempotent `private.bootstrap_platform_owner()` function.

**How to run (hosted Supabase only, no Docker required):**

```powershell
# 1. Ensure environment variables are set (SUPABASE_SECRET_KEY, DATABASE_URL)
#    pointing to your hosted Supabase project.

# 2. Create the target Auth user in the hosted Supabase project
#    and verify their email confirmation.

# 3. Obtain the target user's Auth user UUID from auth.users.id

# 4. Run the bootstrap script via the service_role key against the
#    hosted PostgreSQL endpoint:
psql "$DATABASE_URL" `
  -v user_id="<MANI_AUTH_USER_ID>" `
  -v ON_ERROR_STOP=1 `
  -f scripts/bootstrap-platform-owner.sql

# 5. Verify: platform_members has a platform_owner row;
#    platform_bootstrap_events has an audit row
```

**Security:**
- Must be run by a trusted administrator with database-owner (postgres superuser)
  or service_role access to the hosted Supabase project.
- The service_role key must NEVER be exposed to browser clients or committed
  to version control.
- No email, password, or UUID is hardcoded. The target user ID is supplied at
  runtime via the `-v user_id=` parameter.
- The bootstrap is one-time: it refuses to run if a Platform Owner already exists.
- All operations target the hosted Supabase project; no local Docker stack is used.

**Future scripts may include:**
- Migration reset helper
- Commerce template checksum verification
