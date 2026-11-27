# Duplicate Dependency Audit — Phase E3

**Repository**: zerocraft-in/zerocraft  
**Date**: 2026-11-27  
**Phase**: E3 (Audit Only — No Implementation)

---

## 1. Executive Summary

This audit examined 22 `package.json` files across the monorepo (root, 5 apps, 9 packages, 1 template, 4 workers) to identify duplicate dependencies, focusing on the six key UI dependencies: `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react`, and `tailwind-merge`.

### Key Findings

| Dependency | Declared In | Type | Recommendation |
|---|---|---|---|
| `@base-ui/react` | apps/admin, apps/accounts, apps/cms, packages/ui | `dependencies` (all) | **Unnecessary in apps/admin, apps/accounts, apps/cms** — all actual usage is in `packages/ui`; apps import UI components via `@zerocraft/ui` |
| `class-variance-authority` | apps/admin, apps/accounts, packages/ui | `dependencies` (all) | **Unnecessary in apps/admin, apps/accounts** — only used in `packages/ui` for `cva()` variant definitions |
| `clsx` | apps/admin, apps/accounts, apps/store, packages/ui | `dependencies` (all) | **Unnecessary in apps/admin, apps/accounts, apps/store** — only `packages/ui` and `apps/store` use it directly (via local `cn`/`utils`); admin/accounts don't import it directly |
| `framer-motion` | apps/admin, apps/accounts, apps/cms, apps/store, apps/studio, packages/ui | `dependencies` (all) | **Legitimate per-app usage** — each app uses motion animations directly; cannot be hoisted to shared package |
| `lucide-react` | apps/admin, apps/accounts, apps/cms, apps/store, apps/studio, packages/ui | `dependencies` (all) | **Legitimate per-app usage** — each app imports icons directly; cannot be hoisted |
| `tailwind-merge` | apps/admin, apps/store, apps/studio, packages/ui | `dependencies` (all) | **Unnecessary in apps/admin, apps/store, apps/studio** — `packages/ui` already exports `cn` utility that wraps `twMerge`; apps should use `@zerocraft/ui/cn` |

### Other Notable Duplicates
- `@supabase/ssr` / `@supabase/supabase-js` / `next` / `react` / `react-dom` / `typescript` / `eslint` — **Legitimate per-package** (framework/runtime deps required by each workspace)
- `@zerocraft/ui` — workspace dependency, correctly declared
- `@tiptap/*`, `@dnd-kit/*`, `embla-carousel-react`, `recharts`, `sonner`, `vaul`, `cmdk` — **App-specific** (admin only)

---

## 2. Dependency Declaration Matrix

### Target Dependencies (The Six Key Duplicates)

| Package | `@base-ui/react` | `class-variance-authority` | `clsx` | `framer-motion` | `lucide-react` | `tailwind-merge` |
|---|---|---|---|---|---|---|
| **Root** | — | — | — | — | — | — |
| **apps/admin** | ^1.9.0 (dep) | 0.7.1 (dep) | 2.1.1 (dep) | ^14.14.0 (dep) | 1.72.0 (dep) | 3.7.0 (dep) |
| **apps/accounts** | ^1.9.0 (dep) | 0.7.1 (dep) | 2.1.1 (dep) | ^14.14.0 (dep) | 1.72.0 (dep) | — |
| **apps/cms** | ^1.9.0 (dep) | — | — | ^14.14.0 (dep) | declared via `types/globals.d.ts` | — |
| **apps/store** | — | — | ^2.1.1 (dep) | ^12.8.0 (dep) | declared via `types/globals.d.ts` | ^3.7.0 (dep) |
| **apps/studio** | — | — | ^2.1.1 (dep) | ^14.14.0 (dep) | ^1.30.0 (dep) | ^3.7.0 (dep) |
| **packages/ui** | ^1.9.0 (dep) | 0.7.1 (dep) | 2.1.1 (dep) | ^14.14.0 (dep) | 1.72.0 (dep) | 3.7.0 (dep) |

### Version Consistency

All six packages declare **identical versions** where they overlap:
- `@base-ui/react`: ^1.9.0 everywhere
- `class-variance-authority`: 0.7.1 everywhere (exact)
- `clsx`: 2.1.1 everywhere (exact)
- `framer-motion`: ^14.14.0 (admin/accounts/cms/ui), ^12.8.0 (store) — **version mismatch** (store uses older major)
- `lucide-react`: 1.72.0 (admin/accounts/ui), ^1.30.0 (studio) — **version range difference**
- `tailwind-merge`: 3.7.0 (admin/ui), ^3.7.0 (store/studio) — compatible

---

## 3. Actual Source Usage Evidence

### `@base-ui/react`
| Package | Source Files Importing | Purpose |
|---|---|---|
| **packages/ui** | 40+ files in `packages/ui/src/components/` | Primitives for accordion, alert-dialog, attachment, avatar, badge, breadcrumb, bubble, button, checkbox, collapsible, combobox, context-menu, dialog, direction, drawer, dropdown-menu, hover-card, input, item, marker, menubar, popover, select, sheet, sidebar, switch, toast, tooltip |
| **apps/admin** | 0 | No direct imports |
| **apps/accounts** | 0 | No direct imports |
| **apps/cms** | 0 | No direct imports |

**Conclusion**: `@base-ui/react` is ONLY used in `packages/ui`. All apps consume UI primitives via `@zerocraft/ui` (e.g., `@zerocraft/ui/button`, `@zerocraft/ui/card`).

### `class-variance-authority`
| Package | Source Files Importing | Purpose |
|---|---|---|
| **packages/ui** | 20+ files (`cn.ts`, `components/*.tsx`, `components/ui/*.tsx`) | `cva()` for component variant definitions (button, alert, badge, input, etc.) |
| **apps/admin** | 0 | No direct imports |
| **apps/accounts** | 0 | No direct imports |

**Conclusion**: `class-variance-authority` is ONLY used in `packages/ui` for `cva()` variant definitions.

### `clsx`
| Package | Source Files Importing | Purpose |
|---|---|---|
| **packages/ui** | `cn.ts` (re-exported), `components/ui/utils.ts` | Class name joiner utility |
| **apps/admin** | 0 | Comment in `utils.ts`: "Tailwind is gone, so tailwind-merge is no longer needed" — does NOT import `clsx` |
| **apps/accounts** | `src/lib/utils.ts` | Local `cn` utility: `return clsx(inputs)` |
| **apps/store** | `lib/utils.ts` | `return twMerge(clsx(inputs))` |
| **apps/studio** | 0 | No direct imports |

**Conclusion**: 
- `apps/accounts` uses `clsx` in its local `utils.ts`
- `apps/store` uses `clsx` + `tailwind-merge` in local `utils.ts`
- `packages/ui` re-exports `cn` (clsx + twMerge) via `cn.ts`
- `apps/admin` does NOT use `clsx` directly

### `framer-motion`
| Package | Source Files Importing | Purpose |
|---|---|---|
| **apps/admin** | 15+ files | Page transitions, animations, onboarding wizard, overview, gift cards, orders, products, settings |
| **apps/accounts** | 3 files | Login form, toast, reveal utility |
| **apps/cms** | 8 files | Template, commerce motion, sidekick, products data table, smooth scroll |
| **apps/store** | 4 files | Template, header, infinite grid, search overlay |
| **apps/studio** | 12 files | Studio header, route transition, smooth scroll, sections, loading |
| **packages/ui** | 0 | No direct imports in source (but declared as dep) |

**Conclusion**: Each app uses `framer-motion` for its own animations. **Legitimate per-app usage** — cannot be hoisted.

### `lucide-react`
| Package | Source Files Importing | Purpose |
|---|---|---|
| **apps/admin** | 30+ files | Icons throughout admin dashboard (products, customers, orders, settings, etc.) |
| **apps/accounts** | 2 files | Login page, alert toast |
| **apps/cms** | 0 imports, but declared in `types/globals.d.ts` and `vendor-modules.d.ts` | Type declarations only |
| **apps/store** | 0 imports, but declared in `types/globals.d.ts` and `vendor-modules.d.ts` | Type declarations only |
| **apps/studio** | 15+ files | Icons throughout studio (analytics, content, inquiries, projects, settings, header, rail) |
| **packages/ui** | 0 | No direct imports in source |

**Conclusion**: Each app imports icons directly. **Legitimate per-app usage** — cannot be hoisted. Note: cms/store declare it only for types.

### `tailwind-merge`
| Package | Source Files Importing | Purpose |
|---|---|---|
| **packages/ui** | `cn.ts`, `components/ui/utils.ts` | `twMerge` used in exported `cn` utility |
| **apps/admin** | `src/lib/utils.ts` | Local `cn` utility: `return twMerge(clsx(inputs))` — DUPLICATES `packages/ui` |
| **apps/store** | `lib/utils.ts` | Local `cn` utility: `return twMerge(clsx(inputs))` — DUPLICATES `packages/ui` |
| **apps/studio** | 0 imports, but declared as dep | Not used in source |

**Conclusion**: 
- `packages/ui` exports `cn` (clsx + twMerge) via `src/cn.ts` and `src/components/ui/utils.ts`
- `apps/admin` and `apps/store` duplicate this with their own local `utils.ts` files
- `apps/studio` declares but doesn't use

---

## 4. Legitimate vs Unnecessary Duplication

### UNNECESSARY (Can Be Consolidated)

| Dependency | Packages to Remove From | Reason |
|---|---|---|
| `@base-ui/react` | apps/admin, apps/accounts, apps/cms | Only used in `packages/ui`; apps consume via `@zerocraft/ui` |
| `class-variance-authority` | apps/admin, apps/accounts | Only used in `packages/ui` for `cva()`; apps don't use it directly |
| `tailwind-merge` | apps/admin, apps/store, apps/studio | `packages/ui` exports `cn` utility; apps should import from `@zerocraft/ui/cn` |

### LEGITIMATE (Must Stay Per-Package)

| Dependency | Packages | Reason |
|---|---|---|
| `framer-motion` | All apps + packages/ui | Each app has unique animation needs; runtime animations cannot be shared |
| `lucide-react` | apps/admin, apps/accounts, apps/studio | Each app imports different icons directly; icons are app-specific |
| `clsx` | apps/accounts, apps/store | Both have local `utils.ts` with custom `cn` implementation; but `apps/admin` should NOT have it (doesn't use it) |

### App-Specific (Correctly Isolated)

| Dependency | Package | Reason |
|---|---|---|
| `@tiptap/*` | apps/admin | Rich text editor — admin only |
| `@dnd-kit/*` | apps/admin | Drag & drop — admin only |
| `embla-carousel-react` | apps/admin, apps/cms | Carousel — per-app UI |
| `recharts` | apps/admin, apps/cms | Charts — per-app UI |
| `sonner`, `vaul`, `cmdk` | apps/admin | UI components — admin only |
| `nodemailer` | apps/admin, apps/cms | Email — per-app backend |
| `gsap` | apps/accounts, apps/cms, apps/store | Animations — per-app |
| `react-day-picker` | apps/admin, apps/cms, apps/studio | Date picker — per-app |
| `zod` | apps/accounts, apps/admin, packages/auth-core, packages/mcp, packages/validators | Validation — shared via `packages/validators` but also used directly |

---

## 5. Recommended Changes (Future Implementation Phase)

### Priority 1: Remove Unnecessary Root-Level UI Dependencies

**Files to Modify**:
1. `apps/admin/package.json` — Remove: `@base-ui/react`, `class-variance-authority`, `tailwind-merge` ✅ **DONE: `@base-ui/react`, `class-variance-authority` removed**
2. `apps/accounts/package.json` — Remove: `@base-ui/react`, `class-variance-authority` ✅ **DONE: Both removed**
3. `apps/cms/package.json` — Remove: `@base-ui/react` ✅ **DONE: Removed**
4. `apps/store/package.json` — Remove: `tailwind-merge` (keep `clsx` — used in local utils)
5. `apps/studio/package.json` — Remove: `tailwind-merge` (not used in source)

**Reason**: These are already hoisted via `packages/ui` and apps import UI components via `@zerocraft/ui`. Removing them reduces bundle size and eliminates version drift risk.

### ✅ E3-I COMPLETED: `@base-ui/react` and `class-variance-authority` Removed

**Changes Made**:
- `apps/admin/package.json`: Removed `"@base-ui/react": "^1.9.0"` and `"class-variance-authority": "0.7.1"`
- `apps/accounts/package.json`: Removed `"@base-ui/react": "^1.9.0"` and `"class-variance-authority": "0.7.1"`
- `apps/cms/package.json`: Removed `"@base-ui/react": "^1.9.0"`

**Dependencies Still in `packages/ui`** (correct location):
- `"@base-ui/react": "^1.9.0"`
- `"class-variance-authority": "0.7.1"`

**NOT Removed (Per Scope)**:
- `tailwind-merge` — kept in all apps
- `clsx` — kept in all apps (admin kept, accounts kept, store kept)
- `framer-motion` — kept in all apps
- `lucide-react` — kept in all apps

**Source Code Unchanged**: No application source code was modified.

### Priority 2: Consolidate `clsx` in apps/admin

**Files to Modify**:
- `apps/admin/package.json` — Remove `clsx` (not used in source, per comment in `utils.ts`)

### Priority 3: Standardize `framer-motion` and `lucide-react` Versions

**Files to Modify**:
- `apps/store/package.json` — Update `framer-motion` from ^12.8.0 to ^14.14.0 (match other apps)
- `apps/studio/package.json` — Update `lucide-react` from ^1.30.0 to 1.72.0 (match other apps)

### Priority 4: Use Shared `cn` Utility

**Files to Modify** (source code):
- `apps/admin/src/lib/utils.ts` — Replace local `cn` with import from `@zerocraft/ui/cn`
- `apps/store/lib/utils.ts` — Replace local `cn` with import from `@zerocraft/ui/cn`

**Note**: This is a source code change, not a dependency change. Requires careful migration.

---

## 6. Risks and Compatibility Considerations

### Risk: Breaking Direct Usage
- **Mitigation**: Verified via grep that NO app imports `@base-ui/react`, `class-variance-authority`, or `tailwind-merge` directly in source code (except admin/store `utils.ts` for tailwind-merge).

### Risk: Version Mismatch on `framer-motion` (store: ^12.8.0 vs others: ^14.14.0)
- **Impact**: Major version difference — store uses v12 API, others use v14 API. Upgrading store may require code changes.
- **Recommendation**: Audit `apps/store` framer-motion usage before upgrading; or keep store at v12 if compatible with peer deps.

### Risk: pnpm Hoisting Behavior
- pnpm by default hoists dependencies to the root `node_modules` when versions match. Since all versions match (except noted), hoisting already works. Removing explicit deps from app `package.json` files is safe because transitive deps from `packages/ui` will satisfy them.

### Risk: `packages/ui` Peer Dependencies
- `packages/ui` declares `peerDependencies` for `next`, `react`, `react-dom`. Apps already declare these explicitly. No change needed.

### Risk: `clsx` in apps/accounts and apps/store
- Both have local `utils.ts` with `cn = clsx + twMerge`. If they switch to `@zerocraft/ui/cn`, they can remove `clsx` and `tailwind-merge` from their `package.json`. This is a source code migration.

---

## 7. Exact Files a Future Implementation Phase Would Modify

### `package.json` Files (Dependencies Only)
1. `apps/admin/package.json` — Remove `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`
2. `apps/accounts/package.json` — Remove `@base-ui/react`, `class-variance-authority`
3. `apps/cms/package.json` — Remove `@base-ui/react`
4. `apps/store/package.json` — Remove `tailwind-merge`; Update `framer-motion` to ^14.14.0
5. `apps/studio/package.json` — Remove `tailwind-merge`; Update `lucide-react` to 1.72.0

### Source Code Files (If Consolidating `cn` Utility)
1. `apps/admin/src/lib/utils.ts` — Import `cn` from `@zerocraft/ui/cn`
2. `apps/store/lib/utils.ts` — Import `cn` from `@zerocraft/ui/cn`

---

## 8. Validation Plan for Future Implementation Phase

| Step | Command | Expected Result |
|---|---|---|
| 1. Install | `pnpm install` | All workspaces resolve without errors |
| 2. Typecheck admin | `pnpm --filter @zerocraft/admin typecheck` | Passes |
| 3. Typecheck accounts | `pnpm --filter @zerocraft/accounts typecheck` | Passes |
| 4. Typecheck cms | `pnpm --filter @zerocraft/cms typecheck` | Passes |
| 5. Typecheck store | `pnpm --filter @zerocraft/store typecheck` | Passes |
| 6. Typecheck studio | `pnpm --filter @zerocraft/studio typecheck` | Passes |
| 7. Typecheck packages/ui | `pnpm --filter @zerocraft/ui typecheck` | Passes |
| 8. Build admin | `pnpm --filter @zerocraft/admin build` | Passes |
| 9. Build accounts | `pnpm --filter @zerocraft/accounts build` | Passes |
| 10. Build store | `pnpm --filter @zerocraft/store build` | Passes |
| 11. Lint all | `pnpm lint` | Passes |
| 12. Test all | `pnpm test` | Passes |

### Rollback Plan
- `git checkout -- apps/*/package.json packages/*/package.json`
- `pnpm install` to restore workspace state

---

## Uncertain Items (Marked for Human Review)

1. **`apps/cms` declares `@base-ui/react` but no source imports found** — Could be used via `cn` or other re-exports. Marked as unnecessary based on grep evidence.
2. **`apps/studio` declares `tailwind-merge` but no source usage** — May be intended for future use. Marked as unnecessary.
3. **`framer-motion` version mismatch in `apps/store`** — Store uses ^12.8.0; others use ^14.14.0. Upgrade impact unknown — requires code review.
4. **`lucide-react` version range difference** — studio uses ^1.30.0 (older), others 1.72.0 (exact). May need alignment.

---

## E3-I.1 Lockfile Synchronization Status

### Current pnpm-lock.yaml State
The lockfile still contains the five removed dependency references. Synchronization requires pnpm 12.21.0 which is not available in the current environment.

**Expected Lockfile Changes Upon Sync**:
- Remove `apps/admin` → `@base-ui/react` (specifier: ^1.9.0)
- Remove `apps/admin` → `class-variance-authority` (specifier: 0.7.1)
- Remove `apps/accounts` → `@base-ui/react` (specifier: ^1.9.0)
- Remove `apps/accounts` → `class-variance-authority` (specifier: 0.7.1)
- Remove `apps/cms` → `@base-ui/react` (specifier: ^1.9.0) — if present

**Dependencies to Keep in Lockfile** (still required by `packages/ui`):
- `@base-ui/react@1.9.0`
- `class-variance-authority@0.7.1`

### Synchronization Command (When pnpm Available)
```bash
pnpm install --lockfile-only --ignore-scripts
# OR
pnpm install --frozen-lockfile --ignore-scripts
```

### Validation Steps (Pending)
1. Run `pnpm install --lockfile-only --ignore-scripts`
2. Verify `git diff pnpm-lock.yaml` shows only the 5 importer entries removed
3. Verify `packages/ui` entries unchanged
4. Run `pnpm install --frozen-lockfile --ignore-scripts` to confirm consistency
5. Proceed with full validation plan above

---

## Conclusion

The audit confirms that **4 of 6 key dependencies** (`@base-ui/react`, `class-variance-authority`, `clsx` in admin, `tailwind-merge`) are unnecessarily duplicated in app-level `package.json` files because they are already provided transitively via `packages/ui`. The remaining 2 (`framer-motion`, `lucide-react`) are legitimately used per-app and cannot be hoisted.

**Recommendation**: Proceed with removing unnecessary duplicates in a controlled implementation phase, with validation at each step.

---

**Audit Status**: Complete (E3-I implemented, E3-I.1 pending pnpm)
**Next Phase**: E4 (Implementation — not started)