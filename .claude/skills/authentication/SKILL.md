---
name: authentication
description: How auth works in this Next.js 16 + Supabase app. Use when touching `lib/supabase/`, `app/auth/`, `components/auth/`, `proxy.ts`, or any code calling `supabase.auth.*`. Covers the four client factories, the HS256 `getUser`-only rule, protecting routes, adding a provider, required log events, and local testing.
---

# authentication — Supabase SSR, the PoliticoResto edition

All auth goes through `@supabase/ssr`. No legacy libraries, no custom JWT, no
custom cookies. This skill encodes the project-specific rules on top of the
official Supabase Next.js pattern.

## The four factories (only ones that may create a Supabase client)

| Path | Runtime | Use from | Why |
|---|---|---|---|
| `frontend/lib/supabase/client.ts` | Browser | Client components | Returns a singleton `createBrowserClient` instance. Used for client-side OAuth redirect in `oauth-buttons.tsx`. |
| `frontend/lib/supabase/server.ts` | Server (Node / Edge) | Server Components, Server Actions, Route Handlers | `createServerSupabaseClient()` builds a fresh `createServerClient` per invocation, bridged to `next/headers` `cookies()`. |
| `frontend/lib/supabase/middleware.ts` | Edge (proxy) | `proxy.ts` only | `updateSession()` — runs `auth.getUser()` to trigger JWT refresh, rewrites rotated cookies onto the `NextResponse`. |
| `frontend/lib/supabase/auth-user.ts` | Server | Anywhere server-side that needs the current user | `getAuthUserId(client)` and `getAuthUser(client)`. Memoized per-request via `react.cache()` — one round-trip per request no matter how many callers. |

**Do not** call `createClient` / `createBrowserClient` / `createServerClient`
anywhere else in the codebase. If a new caller needs auth, reuse one of the
four factories.

## The `getUser()` rule — and why **not** `getClaims()`

- **Always** `supabase.auth.getUser()` in server contexts. It validates the
  access token against the Supabase Auth API.
- **Never** `supabase.auth.getSession()`. It reads the cookie without
  revalidation — spoofable.
- **Never** `supabase.auth.getClaims()` on this project. Supabase staging and
  prod still run **HS256 legacy symmetric keys**. `getClaims()` tries local
  JWT verification, which requires asymmetric keys exposed via JWKS — not
  available on HS256 projects. Symptom: `getClaims()` returns `null`
  silently, the user appears logged out, auth breaks. This was tried in
  commits #33 and #34; the burn is documented in the header of
  `frontend/lib/supabase/auth-user.ts`.

  Once Supabase rotates this project's keys to asymmetric (separate session,
  Dashboard → Project Settings → JWT Keys), `getClaims()` becomes usable and
  preferred. Until then, `getUser()` is the only option.

## Protecting a Server Component / Server Action / Route Handler

**Server Component** — pattern from `app/(authenticated)/layout.tsx`:

```ts
import { requireSession } from "@/lib/guards/require-session";

export default async function Page() {
  const userId = await requireSession("/current-path");   // redirects if not authed
  // userId is guaranteed present
}
```

`requireSession` internally calls `getAuthUserId` (cached) and
`redirect("/auth/login?next=...")` if null.

**Server Action** — pattern from `lib/actions/account.ts`:

```ts
"use server";
import { getAuthUserId } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function doThing(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) throw new Error("Authentication required");
  // ...
}
```

**Route Handler** — pattern from `app/api/account/username-availability/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) return NextResponse.json({ error: "unauth" }, { status: 401 });
  // ...
}
```

**Middleware `/me` gate** — already handled by `lib/supabase/middleware.ts`.
Do not replicate the pattern elsewhere; per-route gating lives in the route,
not in the middleware.

## Adding a new OAuth provider

Supabase owns the OAuth config (Dashboard → Authentication → Providers).
Application-side:

1. Supabase Dashboard — enable the provider, set client ID + secret, add
   your local callback URL (`http://127.0.0.1:54321/auth/v1/callback` in
   dev, `https://<your-prod>/auth/callback` in prod).
2. `frontend/components/auth/oauth-buttons.tsx` — add a new button with
   the provider name. The `signInWithOAuth({ provider, options: { redirectTo } })`
   call is generic; no new file needed.
3. `frontend/supabase/config.toml` if you want the provider enabled for
   `supabase start` locally — see `[auth.external.<provider>]`.
4. No new callback route needed. `app/auth/callback/route.ts` handles all
   providers uniformly via `exchangeCodeForSession`.

**Do not** create a new OAuth page, a new callback route, or a new client
factory.

## OAuth callback failures

Redirect to `/auth/auth-code-error?reason=<code>` with:

- `oauth_missing_code` — provider redirected without a `code` param.
- `oauth_exchange_failed` — `exchangeCodeForSession` returned an error.

The error page at `app/auth/auth-code-error/page.tsx` renders a short message
and a "Retourner à la connexion" link that carries `?next=` if present.

## Required log events

Every auth operation emits a structured Pino event. Full taxonomy in
`reference/supabase-auth-nextjs.md`. Must-have events:

| Operation | Event | Level |
|---|---|---|
| Middleware session cookie rotation | `auth.session.cookie_rotation` | debug |
| Middleware `getUser()` fails | `auth.session.getuser_failed` | warn (via `logError`) |
| Middleware `/me` unauth redirect | `auth.gate.redirect` | info |
| Callback received | `auth.oauth.callback.received` | info |
| Callback missing code | `auth.oauth.callback.missing_code` | warn |
| Callback exchange start | `auth.oauth.exchange.start` | debug |
| Callback exchange failed | `auth.oauth.exchange.failed` | error (via `logError`) |
| Callback exchange ok | `auth.oauth.exchange.ok` | info |
| No user after exchange | `auth.oauth.callback.no_user_after_exchange` | warn |
| Profile fetch failed (non-blocking) | `auth.profile.fetch_failed_nonblocking` | warn |
| Onboarding redirect | `auth.onboarding.redirect` | info |
| Successful redirect to next | `auth.callback.redirect_next` | info |
| Per-request user resolved (one per request) | `auth.user.resolved` | debug |

Always include `user_id` when known. Never log `email`, `token`, or `session`
objects — the logger redacts `password`/`token`/`cookie`/`authorization` by
default, but don't stage them into call sites either.

## Forbidden patterns

- Custom JWT signing, verification, or decoding.
- Custom session cookies (`Set-Cookie` header munging outside Supabase's
  cookie bridge).
- Auth state mirrored in React Context, Zustand, Redux, or `localStorage`.
- Trivial wrappers around `supabase.auth.*` that don't add value
  (`auth-user.ts` is the sanctioned wrapper — it adds null-safety and the
  per-request cache).
- `createClient` / `createBrowserClient` / `createServerClient` called
  anywhere other than the four factories.
- `getSession()` or `getClaims()` in server code (see `getUser()` rule).
- Middleware doing anything beyond session refresh + the `/me` gate.

## Local test procedure

Pre-req: `supabase start`, `./scripts/dev.sh` running, seed user
`test@example.com` / `password123`. Set `LOG_PRETTY=true LOG_LEVEL=debug`
in `.env.local` so log output is grep-able.

| Flow | Action | Expected logs |
|---|---|---|
| 1. Sign in | Email/password form submit | `auth.session.cookie_rotation` (debug), `auth.user.resolved` **exactly once** per `request_id` |
| 2. OAuth callback success | Real Google round-trip | `auth.oauth.callback.received` → `auth.oauth.exchange.start` → `auth.oauth.exchange.ok` → `auth.onboarding.redirect` (new user) or `auth.callback.redirect_next` (returning) |
| 3. Callback missing code | Visit `/auth/callback` directly | `auth.oauth.callback.missing_code` (warn); browser lands on `/auth/auth-code-error?reason=oauth_missing_code` |
| 4. Callback bad code | Visit `/auth/callback?code=garbage` | `auth.oauth.exchange.failed` (error) with serialized `err`; redirect to `/auth/auth-code-error?reason=oauth_exchange_failed` |
| 5. Sign out | Sign-out button | Subsequent requests stop emitting `auth.user.resolved` |
| 6. Session refresh | Expire access-token cookie in devtools, navigate | `auth.session.cookie_rotation` (debug) with new `sb-*` names; `auth.user.resolved` once |
| 7. Protected route (unauth) | Visit `/me` signed-out | `auth.gate.redirect` with `reason: unauthenticated_me`; browser on `/auth/login?next=/me` |
| 8. Cache invariant | Load `/` signed-in | Grep `auth.user.resolved` by `request_id` — must be **exactly one** line. More = `cache()` broken |

## See also

- `reference/supabase-auth-nextjs.md` — full event taxonomy, cookie model,
  HS256 → asymmetric migration pointer.
- `frontend/lib/supabase/auth-user.ts` — the HS256 rationale header.
- Supabase official docs — https://supabase.com/docs/guides/auth/server-side/nextjs
