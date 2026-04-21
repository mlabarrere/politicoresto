---
name: logging
description: How to emit structured logs via lib/logger.ts. Use when adding a new server entry point (server component, server action, route handler, middleware), when converting a console.* call, when wiring request correlation, or when deciding which log level to use.
---

# logging — Structured logging conventions

All server-side logging goes through `frontend/lib/logger.ts` (Pino).
Zero `console.*` in `frontend/app`, `frontend/lib`, `frontend/components`.

## The one import you need

```ts
import { createLogger, logError, withRequest, withUser } from "@/lib/logger";
```

Create one logger per module, pinning a stable `context`:

```ts
const log = createLogger("auth");          // http | auth | db | home | api.* | ...
```

See `reference/log-event-catalog.md` for the canonical context list.

## Call convention — fields first, message second

```ts
log.info({ event: "login.start", user_id: userId }, "login requested");
log.warn({ event: "login.rate_limited", user_id: userId }, "too many attempts");
log.error({ event: "db.timeout", table: "app_profile", duration_ms }, "query timed out");
```

Never concatenate values into the message. The message is a stable human
phrase; the *object* carries the variables.

## Level semantics

| Level   | Use for                                                      |
|---------|--------------------------------------------------------------|
| `trace` | Per-query diagnostics. Dev only.                             |
| `debug` | Intermediate state for dev. Dev only.                        |
| `info`  | Operational narrative: request start/end, successful mutations, auth transitions. |
| `warn`  | Unexpected but recovered: validation fail, rate limit, optimistic lock miss. |
| `error` | Attention needed: unhandled DB error, external API failure, broken invariant. |
| `fatal` | Subsystem failure (unhandledRejection / uncaughtException). Auto-emitted. |

If it's expected-and-handled, it's `info` or `warn`. If it surprises you in
prod, it's `error`.

## Required fields per context

| Context / event                 | Required fields                               |
|---------------------------------|-----------------------------------------------|
| `http` request.start/end/error  | `request_id`, `method`, `path`, `duration_ms` (end/error), `status` (end) |
| `auth` login / logout / session | `user_id` (when known), `event`               |
| `db`                            | `table` or `rpc`, `duration_ms` on failure    |
| Server actions                  | `event: "<action>.<state>"`, `user_id` when authenticated |
| Route handlers                  | same as http — the `withRequest` helper fills these |
| Errors                          | use `logError(log, err, { event, ...extra })` — it serializes `err` including cause chain + stack |

Never log: `password`, raw `token`, full `cookie`, `service_role_key`, full
auth headers. These are redacted automatically, but don't stage them into
call sites either.

## Errors — always via `logError`

```ts
try {
  await doThing();
} catch (err) {
  logError(log, err, { event: "thing.failed", user_id: userId });
  throw err;   // re-throw unless the caller genuinely expects a soft failure
}
```

`logError` serializes `Error` instances with `type`, `message`, `stack`, and
recurses into `cause`. Default level is `error`; pass `{ level: 'warn' }` or
`{ level: 'fatal' }` to override.

## Request correlation

`proxy.ts` generates (or respects) `x-request-id`, binds a request-scoped
logger into `AsyncLocalStorage`, and sets the header on the response. Every
log emitted within that request chain carries `request_id` automatically
when you pull the logger via:

```ts
import { getRequestLogger } from "@/lib/logger";

const log = getRequestLogger() ?? createLogger("fallback");
```

Inside server components / actions / handlers, prefer a module-level
`createLogger("<context>")` and let ALS merge the `request_id` via child
binding. Only reach for `getRequestLogger()` when you genuinely need the
exact request-scoped instance (e.g. deep utilities).

## Local output (`LOG_PRETTY=true`)

```
14:02:19.838 INFO  [home] home data fetched
    event: "home.rendered"
    feed_count: 3
    authenticated: false
    duration_ms: 0
```

## Production output (JSON, one per line)

```json
{"level":"info","time":"2026-04-21T12:02:19.838Z","env":"production","context":"home","event":"home.rendered","feed_count":3,"authenticated":false,"duration_ms":0,"msg":"home data fetched"}
```

Vercel captures stdout automatically. No log drain configured yet (deferred);
JSON to stdout is immediately queryable via the Vercel dashboard.

## Client-side logging

Client components cannot import the server logger. Two options:

1. **Don't log from client** — let the server handle the client calls
   and log the outcome (preferred).
2. **Client error boundaries** (`app/error.tsx`, `app/global-error.tsx`)
   use a targeted `// eslint-disable-next-line no-console` with a reason.
   Session 3 will add `/api/_log` for client→server log forwarding.

## How to verify logs locally

```bash
LOG_PRETTY=true LOG_LEVEL=debug ./scripts/dev.sh
```

Logs stream to the `vercel dev` terminal. For a specific call, grep:

```bash
./scripts/dev.sh 2>&1 | grep '"context":"auth"'
```

## How to avoid spam

- **One log per operation, not one per step.** `login.start` + `login.end`
  — not `login.step1` / `login.step2` / `login.step3`.
- **Do not log inside tight loops.** If you must, log at `debug` and
  aggregate (count + sample).
- **Do not log successful GETs of static resources.** Focus on mutations
  and failures.
- **Do not log the same event from two layers** (proxy + action + data
  fetcher all logging "request received" = noise).

## See also

- `reference/pino-notes.md` — Pino specifics, Edge runtime caveats.
- `reference/log-event-catalog.md` — canonical context names and event taxonomy.
