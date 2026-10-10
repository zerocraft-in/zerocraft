# Studio content and configuration

The public studio pages reuse the existing sections, logo, fonts, theme tokens, and animation libraries.

- `lib/data/studio-projects.ts` contains editable project metadata. The current entries are concept explorations with existing illustrative Unsplash images; they do not assert client relationships or outcomes. Replace with approved project assets and credits when available.
- `lib/studio-config.ts` preserves the existing business email and production domain. `NEXT_PUBLIC_SITE_URL` can override the canonical origin for a deployment.
- Instagram is confirmed by the supplied studio profile. LinkedIn, Behance, and GitHub use the exact profile URLs provided by the owner. X remains optional: set `NEXT_PUBLIC_X_URL` to the studio's exact HTTPS profile URL if one is confirmed. Unconfigured links remain hidden; platform names alone are not profile links.
- The contact form validates a brief and opens a `mailto:` draft. It does **not** transmit or store submissions. Sending directly from the website requires a server-side email provider, credentials, and abuse protection. Until configured, users send from their own email client or use the displayed email address.
- Run `npm run lint`, `npm run typecheck`, and `npm run build`. On Windows machines where Turbopack workers fail to start, `npm run build -- --webpack` is the supported fallback.
- `node scripts/generate-og.js` regenerates the social preview using the existing Zerocraft mark.
