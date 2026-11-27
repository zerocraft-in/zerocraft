# Hosted Supabase project configuration — no local Docker required.
# These values must be set for each customer's hosted Supabase project.
# Never commit real secrets to version control.

# Replace with your hosted Supabase project URL (e.g., https://xyz.supabase.co)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_HOSTED_PROJECT.supabase.co

# Replace with your hosted Supabase publishable key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

# Replace with your hosted Supabase service role secret
SUPABASE_SECRET_KEY=YOUR_SERVICE_ROLE_SECRET

# Replace with your hosted Supabase PostgreSQL connection string
# Format: postgresql://postgres:PASSWORD@aws-region.connect.postgres.database.azure.com:5432/postgres?sslmode=require
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.connect.postgres.database.azure.com:5432/postgres?sslmode=require