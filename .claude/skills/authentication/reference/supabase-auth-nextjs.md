# Supabase Auth on Next.js — reference for this project

Condensed from the Supabase official tutorial with the deviations this project
takes. Canonical upstream:
https://supabase.com/docs/guides/auth/server-side/nextjs

## Deviations from the official example (intentional)

| Area | Official | Here | Reason |
|---|---|---|---|
| Session validation | `auth.getClaims()` | `auth.getUser()` | Project on HS256 legacy keys; `getClaims()` returns null silently. See `auth-user.ts` header. |
| Middleware | Cookie refresh + `getClaims()` only | + `/me` redirect if unauthenticated | Product routing choice (the home page is public; `/me` must force login at the edge for a cleaner UX than a late redirect). |
| OAuth callback | Redirect to `/` on success | Redirect to `/onboarding` if the user has no `username` in `app_profile` | Onboarding is mandatory before entering the app; the callback is the cheapest place to enforce it. |
| OAuth button | Server action | Client-side `signInWithOAuth` | Both patterns are documented by Supabase. Client-side keeps the redirect under the user's own origin and is simpler to reason about. |
| Per-request user fetch | Not discussed | `react.cache()` around `resolveAuth` in `auth-user.ts` | Middleware + layout + page + data loaders can all legitimately ask for the user. `cache()` collapses them to a single `getUser()` call per request. |
| Error UX | `/auth/auth-code-error` | Same | No deviation — we match official. |

## Full event taxonomy

Every row below is a real event name emitted somewhere in the auth code. When
adding a new event, keep the `<domain>.<object>.<state>` shape and update this
table so the skill stays searchable.

### `auth.session.*` — proxy middleware

| Event | Level | Required fields | Where |
|---|---|---|---|
| `auth.session.cookie_rotation` | debug | `path`, `cookie_names[]` | `lib/supabase/middleware.ts` — fires when Supabase rotates session cookies |
| `auth.session.getuser_failed` | warn | serialized `err` | same — `getUser()` returned an error |
| `auth.gate.redirect` | info | `path`, `reason` | same — `/me` gate triggered a redirect to login |

### `auth.oauth.*` — callback route

| Event | Level | Required fields | Where |
|---|---|---|---|
| `auth.oauth.callback.received` | info | `has_code`, `next` | `app/auth/callback/route.ts` — entry |
| `auth.oauth.callback.missing_code` | warn | `query` | same — no `?code=` |
| `auth.oauth.exchange.start` | debug | — | same — before `exchangeCodeForSession` |
| `auth.oauth.exchange.failed` | error | serialized `err`, `status`, `code` | same — via `logError` |
| `auth.oauth.exchange.ok` | info | `cookie_names[]` | same — after a successful exchange |
| `auth.oauth.callback.no_user_after_exchange` | warn | — | same — `getUser()` returned null despite OK exchange |

### `auth.profile.*` — callback profile fetch

| Event | Level | Required fields | Where |
|---|---|---|---|
| `auth.profile.fetch_failed_nonblocking` | warn | `user_id`, `code`, `db_message` | callback route — profile lookup failed but we proceed |

### `auth.onboarding.*` / `auth.callback.*` — routing

| Event | Level | Required fields | Where |
|---|---|---|---|
| `auth.onboarding.redirect` | info | `user_id`, `next` | callback — new user without `username` |
| `auth.callback.redirect_next` | info | `user_id`, `next`, `username` | callback — returning user with a profile |

### `auth.user.*` — per-request resolution

| Event | Level | Required fields | Where |
|---|---|---|---|
| `auth.user.resolved` | debug | `user_id` | `lib/supabase/auth-user.ts` — fires once per (client, request) thanks to `react.cache()` |

### Client-side (`oauth-buttons.tsx`)

Currently emits to `console.*` behind `/* eslint-disable no-console */` with a
header comment listing the intended event names. Once `/api/_log` lands in
Session 3, these get forwarded to the Pino logger.

Intended events:
- `auth.oauth.google.start`
- `auth.oauth.google.signin_failed`
- `auth.oauth.google.redirect_to_provider`
- `auth.oauth.google.no_url`

### `account.*` — server actions

Not strictly auth, but listed here because they live in the same `lib/actions/
account.ts` file and depend on `getAuthUserId()`.

| Event | Level | Where |
|---|---|---|
| `setUsername.start/validation_failed/unauthenticated/duplicate/update_failed/success` | info / warn / error | `setUsernameAction` |
| `account.upsert_identity.duplicate_check_failed` | error (via `logError`) | `upsertAccountIdentityAction` |
| `account.upsert_identity.update_failed` | error | same |
| `account.upsert_private.rpc_failed` | error | `upsertPrivateProfileAction` |
| `account.clear_private.rpc_failed` | error | `clearPrivateProfileAction` |
| `account.deactivate.update_failed` | error | `deactivateAccountAction` |
| `account.delete.update_failed` | error | `deleteAccountAction` |

## Cookie model

`@supabase/ssr` writes session cookies with names like
`sb-<project-ref>-auth-token` (access + refresh combined, chunked if long).
Two rules that burn six times each if you break them:

1. **Cookies are rewritten onto the same `NextResponse` that redirects.** In
   `callback/route.ts` the `response = NextResponse.redirect(...)` is
   constructed **before** `exchangeCodeForSession`, and the `setAll`
   callback writes onto that exact response via `response.cookies.set(...)`.
   If you later redirect to a different URL (e.g. `/onboarding`), you must
   **clone** the cookies from the original response onto the new one. See
   the `for (const c of response.cookies.getAll()) { onboardingResponse.cookies.set(c); }`
   block — that's why.

2. **Middleware must rebuild the response after cookie mutation.** Inside
   `updateSession()`, every time Supabase's `setAll` fires, the helper
   reconstructs `response = NextResponse.next(...)` and copies the cookies.
   This is the official pattern and it is load-bearing.

## HS256 → asymmetric migration (future)

To unblock `getClaims()`:

1. Supabase Dashboard → Project Settings → JWT Keys → rotate to asymmetric
   (ES256 or RS256). Stage first; prod after a verification window.
2. Once rotated, the project exposes a JWKS endpoint at
   `<project-url>/auth/v1/.well-known/jwks.json`, and `getClaims()` can
   validate tokens locally (no round-trip to `/auth/v1/user`).
3. Swap the call in `lib/supabase/auth-user.ts:resolveAuth`:
   ```ts
   const { data, error } = await client.auth.getClaims();
   if (error || !data?.claims) return null;
   return { id: data.claims.sub, email: data.claims.email ?? null };
   ```
4. Update this skill's `getUser()` rule section.
5. Run all 8 smoke tests from the skill's local-test section.

Do not attempt this inside a normal session — it's a keys rotation, not a
code change.

## Useful upstream links

- https://supabase.com/docs/guides/auth/server-side/nextjs — canonical SSR
- https://supabase.com/docs/guides/auth/social-login/auth-google — Google
  OAuth config
- https://github.com/supabase/supabase/tree/master/examples/user-management/nextjs-user-management —
  reference example to diff against
- https://supabase.com/docs/guides/auth/sessions — session lifecycle,
  refresh semantics
