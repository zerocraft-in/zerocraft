# Shared UI

The shared UI package is `@zerocraft/ui` (`packages/ui/`). It provides owned
shadcn/ui primitives used by Zerocraft applications.

## Package configuration

- **Name:** `@zerocraft/ui`
- **Type:** Library
- **Entry:** `src/index.ts`
- **Subpath exports:** `./button`, `./input`, `./label`, `./separator`,
  `./skeleton`, `./alert`, `./card`, `./auth-heading`, `./submit-button`,
  `./provider-icons`, `./auth-shell`, `./mark`, `./utils`, `./use-mobile`

## Runtime dependencies

- `class-variance-authority`
- `clsx`
- `lucide-react`
- `tailwind-merge`

## Peer dependencies

- `next` 16.4.6
- `react` 19.3.0
- `react-dom` 19.3.0

## Internal import rules

`packages/ui` must not depend on application-specific `@/` aliases. Internal
package dependencies use relative imports. Public package subpath imports
(`@zerocraft/ui/button`) remain unchanged.

## Components

| Export | Subpath | Description |
| --- | --- | --- |
| `Button`, `buttonVariants` | `@zerocraft/ui/button` | Primary button component |
| `Input` | `@zerocraft/ui/input` | Form input |
| `Label` | `@zerocraft/ui/label` | Form label |
| `Separator` | `@zerocraft/ui/separator` | Visual separator |
| `Skeleton` | `@zerocraft/ui/skeleton` | Loading skeleton |
| `Alert` | `@zerocraft/ui/alert` | Alert dialog |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `@zerocraft/ui/card` | Card composition |
| `AuthHeading` | `@zerocraft/ui/auth-heading` | Auth page heading |
| `SubmitButton` | `@zerocraft/ui/submit-button` | Auth submit button |
| `GoogleIcon`, `AppleIcon` | `@zerocraft/ui/provider-icons` | OAuth provider icons |
| `AuthShell` | `@zerocraft/ui/auth-shell` | Auth page shell |
| `Mark`, `Wordmark` | `@zerocraft/ui/mark` | Brand mark and wordmark |
| `cn()` | `@zerocraft/ui/utils` | Class name utility |
| `useIsMobile()` | `@zerocraft/ui/use-mobile` | Mobile breakpoint hook |

## Apps that consume @zerocraft/ui

- `apps/admin` — Commerce administration dashboard
- `apps/accounts` — Central authentication
