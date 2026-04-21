# Log event catalog

Canonical list of log `context` values and the `event` taxonomy used in each.
Keep this file in sync as new contexts are added. One context per module;
events are `<verb>.<state>` or `<noun>.<state>`.

## Context names

| Context                    | Scope                                           |
|----------------------------|-------------------------------------------------|
| `http`                     | `proxy.ts` / middleware — request lifecycle     |
| `auth`                     | Auth flows (login, callback, session, logout)  |
| `db`                       | Raw Supabase queries from `lib/data/*`          |
| `home`                     | `app/page.tsx` home server component            |
| `account`                  | `lib/actions/account.ts` server actions        |
| `api.<route>`              | Route handlers under `app/api/`                 |
| `job`                      | Background jobs (none yet — reserved)          |

Add a new context by appending a row. Keep names lowercase, dot-separated,
stable across refactors.

## Event taxonomy per context

### `http`

| Event              | Level | Fields (beyond base)                     |
|--------------------|-------|------------------------------------------|
| `request.start`    | info  | (request_id, method, path from `withRequest`) |
| `request.end`      | info  | `status`, `duration_ms`                  |
| `request.error`    | error | `duration_ms`, `err`                     |

### `auth` *(Session 2 will expand)*

| Event                       | Level | Fields                             |
|-----------------------------|-------|------------------------------------|
| `login.start`               | info  | `method` (email / oauth-google)    |
| `login.success`             | info  | `user_id`                          |
| `login.failed`              | warn  | `reason`                           |
| `logout`                    | info  | `user_id`                          |
| `callback.session_exchanged`| info  | `user_id`                          |
| `callback.failed`           | error | `err`, `step`                      |

### `home`

| Event            | Level | Fields                                       |
|------------------|-------|----------------------------------------------|
| `home.rendered`  | info  | `feed_count`, `subjects_count`, `authenticated`, `duration_ms` |
| `home.error`     | error | `err`                                        |

### `account`

| Event                               | Level | Fields                       |
|-------------------------------------|-------|------------------------------|
| `setUsername.start`                 | info  | `nextPath`                   |
| `setUsername.validation_failed`     | warn  | `usernameError`              |
| `setUsername.unauthenticated`       | error | —                            |
| `setUsername.duplicate`             | warn  | `user_id`, `username`        |
| `setUsername.update_failed`         | error | `user_id`, `err`             |
| `setUsername.success`               | info  | `user_id`, `username`, `nextPath` |

### `api.username-availability`

| Event            | Level | Fields                                   |
|------------------|-------|------------------------------------------|
| `query.failed`   | error | `user_id`, `duplicate_error`, `err`      |

## Conventions

- **`event`** is always present on non-trivial logs. It is the primary filter
  key in production log queries.
- **`user_id`** when an authenticated user is in scope. Never `user_email`
  except for auditable auth events via `withUser(log, { email })`.
- **`duration_ms`** on any operation that touches the network or DB.
- **`err`** is populated by `logError` — never pass an `Error` as a generic
  field.
