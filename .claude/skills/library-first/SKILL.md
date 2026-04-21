---
name: library-first
description: Decide which library to use for a given concern (auth, forms, validation, dates, UI primitives, env, data fetching, logging). Use before writing any utility that resembles a solved problem. Covers the libraries this project has chosen and the ones it deliberately did NOT adopt.
---

# library-first — decision tree by concern

Before writing any utility, ask: is this a solved problem? If yes, use
the project's chosen library. If the project doesn't have one, prefer
the official framework path. If no official path exists and the utility
would be small (≤30 LoC) and scoped, you may write it — but document the
choice.

## Decision table — this project's commitments

| Concern | Library / approach | Why |
|---|---|---|
| **Auth** | `@supabase/ssr` (+ `@supabase/supabase-js`) | Supabase is the DB; the native Lego is the simplest. Four factories at `frontend/lib/supabase/{client,server,middleware,auth-user}.ts`. `auth.getClaims()` default. See `.claude/skills/authentication`. |
| **Logging** | Pino 9 + pino-pretty (dev only) via `frontend/lib/logger.ts` | One entry point, structured events, secret redaction, AsyncLocalStorage request correlation. Zero `console.*` in app code. See `.claude/skills/logging`. |
| **Env parsing** | `zod` + `@t3-oss/env-nextjs` | Typed, runtime-validated, browser-safe. Single schema at `frontend/lib/supabase/env.ts`. |
| **UI primitives** | `@headlessui/react` + `@base-ui/react` + `components/catalyst/*` wrappers | Already adopted. Styling layer centralised under `components/catalyst/`; `components/app/*` wrap catalyst primitives for app-wide consistency. |
| **Forms** | **Server Actions + native HTML forms** | No React Hook Form. Server Actions are Next.js 16 native; RHF would add client hydration + bundle weight with no win for the small forms we have. If forms grow beyond trivial validation + submit, revisit. |
| **Validation** | **zod** (available via t3-env) + inline regex for fixed formats | `zod` is already in the dep tree. `lib/account/username.ts` uses a regex + blocklist — 30 LoC, tested, simpler than a zod schema for that constraint. Adopt zod when validation logic branches or composes. |
| **Dates / times** | **Native `Intl.RelativeTimeFormat` + `Intl.DateTimeFormat`** | No `date-fns`, no `dayjs`, no `Temporal`. `Intl` is the modern correct path — locale-aware, browser-native, no bundle cost. See `lib/utils/format.ts`. |
| **Data fetching (server)** | Server Components + Supabase client directly | No TanStack Query on the server. Server Components are the framework's data-fetch primitive. |
| **Data fetching (client)** | Server Actions (mutations) or `fetch` to Route Handler (read) | No TanStack Query on the client either. When a client component needs data the server component can't provide, `fetch('/api/...')` + local `useState` is sufficient for our scale. |
| **Routing** | Next.js app router native | No external router. `typedRoutes: true` in `next.config.ts`. |
| **HTTP errors in UI** | `app/error.tsx` + `app/global-error.tsx` + route-level `error.tsx` | No error-boundary library. React's built-in error boundary is enough. |
| **Styling** | Tailwind CSS v4 + `class-variance-authority` + `clsx` + `tailwind-merge` | No CSS-in-JS library. The `cn()` util at `lib/utils.ts` wraps clsx + tailwind-merge and is the only place these are combined. |
| **Icons** | `lucide-react` | One icon library; don't add a second. |
| **Animation** | `motion` (Framer Motion) | Imported but used sparingly. Add sparingly — Server Components don't need it. |
| **Testing** | Vitest + @testing-library/react + jsdom + Playwright | Unit tests via Vitest; e2e via Playwright. No Jest. |
| **Test mocks** | `vi.hoisted` + `vi.mock` | No separate mocking library. |

## Decision table — what we deliberately did NOT adopt

| Candidate | Why not |
|---|---|
| `@supabase/auth-helpers-nextjs` | Deprecated in favour of `@supabase/ssr`. Session 2 confirmed migration. |
| `next-auth` / `@auth/*` | Supabase already handles auth end-to-end; adding another layer buys nothing. |
| `clerk`, `lucia`, `iron-session` | Same reason. |
| `jose`, `jsonwebtoken` | Supabase SDK validates JWTs internally via `getClaims()`. Hand-rolled JWT = security footgun. |
| `react-hook-form` | Server Actions cover our form cases without client state. |
| `formik` | Legacy; see RHF rationale. |
| `date-fns`, `dayjs`, `luxon` | Native `Intl` is the correct modern choice. |
| `@tanstack/react-query`, `swr` | Server Components + Server Actions cover the patterns. Client-side cache isn't needed at our scale. |
| `axios`, `ky` | `fetch` is native. The browser's `fetch` handles our auth cookie propagation. |
| Custom logger (`winston`, `bunyan`, `debug`) | Pino was chosen in Session 1. See `.claude/skills/logging/reference/pino-notes.md`. |
| `shadcn/ui` as a dependency | We reference shadcn patterns but don't pull the full CLI. Our UI layer lives under `components/catalyst` + `components/app` and was built before shadcn matured; migrating would be a deliberate refactor. |

## How to decide when there's no commitment

1. **Is the framework's built-in enough?** (Next.js Server Component, native `fetch`, `Intl`, etc.) — Use it.
2. **Is a small, pure utility enough?** (≤30 LoC, fully testable, no new dep) — Write it, commit it with a test.
3. **Is there a category leader with Vercel / Supabase alignment?** — Evaluate: Vercel Style Guide recommendations, Supabase's own example apps. If it's what they use, odds are it's the right call.
4. **Otherwise** — Surface it in CLAUDE.md's "project-specific decisions" log with a one-line rationale, then install.

Do NOT add a library just because it's popular. Every dep increases
bundle size, CI time, supply-chain risk, and cognitive load.

## Before adopting a new library

Quick checklist:

- [ ] Is there a simpler native / framework path?
- [ ] What's the bundle size (`bundlephobia.com`)? Does it ship types?
- [ ] Is it actively maintained (commits within last 6 months)?
- [ ] Does it have a Supabase / Next.js / Vercel example that's close to our use case?
- [ ] Does it add a peer-dep that conflicts with something we already have? (React 19, ESLint 8, Next 16)
- [ ] If the library disappeared tomorrow, how much code would we have to rewrite?

## If you're replacing a hand-rolled utility with a library

Follow the Session-3 pattern:

1. Announce scope + chosen library + version in the commit message.
2. Install with `--save` (or `--save-dev` for tooling).
3. Migrate ALL call sites in one PR — don't mix old and new.
4. Delete the hand-rolled code.
5. Update tests.
6. Log anything new: if the library has observable behavior (retries,
   fallbacks), add at least one log event.
7. Update `CLAUDE.md` project-specific-decisions with the new entry.
8. If a library replaces something that was intentionally done one
   specific way, document the "why it was written that way before"
   in the commit so we don't regress on that intent.

## See also

- `.claude/skills/authentication` — Supabase auth specifics.
- `.claude/skills/logging` — Pino + event taxonomy.
- `.claude/skills/supabase-migration` — SQL style + RLS.
- `.claude/skills/nextjs-component` — Next.js 16 patterns.
- `.claude/skills/local-dev` — boot the stack locally.
- `CLAUDE.md` § "Project-specific decisions" — the chronological log of
  library choices and deviations.
