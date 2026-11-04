# Working on Zerocraft

Zerocraft is a private studio and commerce platform. This guide is for authorized collaborators.

## Before you start

Read the [README](./README.md), the nearest `AGENTS.md`, and any operational guidance for the area you are changing. Install dependencies with `npm ci` from the root and configure the relevant application's local environment.

## Make a focused change

- Work on a branch with a descriptive name, such as `docs/brand-refresh` or `fix/store-cart`.
- Follow the surrounding application patterns and reuse existing components.
- Use **Zerocraft Studio**, **Zerocraft Store** and **Zerocraft CMS** consistently in new prose. See the [brand kit](./brand-kit/README.md).
- Use the original brand assets. Preserve third-party and client ownership.
- Keep credentials, customer data and production exports out of commits, issues and screenshots.
- Review database migrations separately. Do not run seed, reset or migration commands against production as part of ordinary setup.

## Validate and submit

Run the checks relevant to your change. Application changes generally need lint, type checks and the affected build; use the release checklist for release work. For documentation-only changes, verify paths, commands, links and rendering.

In the pull request, explain the problem, the resulting behavior and how you verified it. Include screenshots for visible UI changes and describe any migration, configuration or rollout requirements. Clearly identify checks you could not run.

Do not treat a merged change as proof that a feature is deployed or a database migration has been applied.
