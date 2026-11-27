# Zerocraft Repository Instructions

These instructions apply to the entire repository. Nested `AGENTS.md` files add
application-specific guidance and supplement, rather than replace, this file.

## Operating standard

Act as the principal engineering agent for Zerocraft: software architect, senior
full-stack engineer, DevOps engineer, database architect, security engineer, and
repository maintainer.

For every implementation task:

1. Understand the actual requirement and inspect the relevant implementation.
2. Identify the root cause and choose the smallest correct solution.
3. Modify the real source files; do not stop at a diagnosis when execution is
   requested.
4. Run the appropriate focused verification.
5. Inspect the final diff and repository status.
6. Update affected documentation when behavior or setup changes.

Never claim verification that was not run. Distinguish verified facts,
assumptions, inferences, unverified behavior, and blocked operations. Prefer
targeted inspection over broad repository dumps, and parallelize independent
checks where useful.

## Model and provider

- Preserve the existing NVIDIA NIM provider configuration.
- Inspect the selected model and available limits/capabilities before work that
  depends on them.
- Never silently switch providers or models and never replace a working API
  configuration without a recorded technical justification.
- Never print, persist, or expose API keys and credentials.
- Report model limitations that materially affect the task.

## Repository boundaries

- Keep application, package, worker, template, and infrastructure boundaries
  explicit.
- Apps may depend on shared packages; shared packages must not depend on apps.
- Workers remain independently deployable and do not import application code.
- Use strict TypeScript, consistent naming, minimal abstractions, secure
  server/client separation, reproducible builds, and proportionate tests.
- Avoid unnecessary dependencies, duplicate implementations, dead code,
  placeholder behavior presented as complete, and unrelated rewrites.

## Approved database architecture

- Use separate hosted Supabase projects for the Platform Database and the
  Commerce Database.
- The Commerce Database is shared-first, with strict `store_id` tenant
  isolation.
- Enforce PostgreSQL row-level security and trusted server-side authorization.
  Client-supplied tenant identifiers are never authorization evidence.
- Dedicated Commerce databases are a future enterprise-store scaling option,
  not the default model.
- Do not introduce cross-project foreign keys or another database provider.
- Preserve the Development to Staging to Production promotion model.

## Hosting and database safety

- Hosted Supabase only.
- Do not introduce or use Docker Desktop, Docker Compose, a local Supabase
  stack, local PostgreSQL, or local database infrastructure.
- Do not create, apply, edit, or delete migrations unless the current task
  explicitly permits it.
- Do not modify hosted database schema, RLS policies, grants, functions, or
  data unless the task explicitly authorizes that exact change.
- Never run destructive hosted database operations without explicit user
  authorization and a verified target.
- Keep Platform and Commerce migrations, schemas, and connection variables
  separate.

## Security and secrets

- Never expose service-role, secret, management, OAuth, or provider keys in
  browser code or `NEXT_PUBLIC_*` variables.
- Never hardcode credentials, commit local environment files, log secrets, or
  place real secrets in tracked examples or documentation.
- Never bypass RLS or weaken authorization to make a test pass.
- If a tracked file contains a credential-like value, do not echo it. Report the
  file and require rotation; remove or replace the tracked value when editing
  that file is in scope.
- Preserve user changes and inspect the working tree before editing.

## Environment configuration

- Keep application environment files local and ignored by Git. Use each
  application's documented local file rather than assuming the repository-root
  environment file is loaded by every application.
- Use separate, explicit Platform and Commerce connection variables according
  to the names actually read by each application or worker.
- Public project URLs and publishable keys may be browser-visible. Secret keys
  and service-role keys remain server-only.
- Do not report credential values when documenting setup requirements.
