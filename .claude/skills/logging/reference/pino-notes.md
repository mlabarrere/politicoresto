# Pino notes

## Why Pino

- Fastest Node logger with a stable ecosystem.
- First-class JSON output; human-readable pretty mode is a *dev-only transport*,
  not the default.
- Built-in redaction, child loggers, and level filtering.

## Edge runtime caveats

Next.js 16 `proxy.ts` runs in the Edge runtime. Pino works there but:

- **No worker transports in Edge.** `pino-pretty` is a worker transport, so
  it is only loaded when `NEXT_RUNTIME !== 'edge' && NODE_ENV !== 'production'
  && LOG_PRETTY === 'true'`.
- **No `process.on` in Edge.** Process-level handlers
  (`unhandledRejection`, `uncaughtException`) are registered in the logger's
  Node-only branch.
- **`async_hooks`** is polyfilled by Next.js in Edge. We import from
  `"async_hooks"` (not `"node:async_hooks"`) so both runtimes resolve it.

## Version pins

- `pino@^9` — current major. Stable ESM support.
- `pino-pretty@^11` — matching devDependency.

Both are pinned in `frontend/package.json`.

## Configuration surface (env-driven)

| Var            | Local default | Prod default | Effect                          |
|----------------|---------------|--------------|---------------------------------|
| `LOG_LEVEL`    | `debug`       | `info`       | Pino level                      |
| `LOG_PRETTY`   | `true`        | `false`      | Pretty-print (dev Node only)    |
| `NODE_ENV`     | `development` | `production` | Gates pretty and defaults       |
| `NEXT_RUNTIME` | (auto)        | (auto)       | `'edge'` disables transports    |

## Formatter choices

- `formatters.level: (label) => ({ level: label })` — we log the string level
  (`"info"` not `30`) because Vercel's JSON log viewer filters on string.
- `timestamp: pino.stdTimeFunctions.isoTime` — ISO 8601 UTC for human+tool
  readability.

## Redaction

`redact.paths` covers obvious secret fields. `redact.censor` is `"[REDACTED]"`.
Redaction runs at serialization time, so you cannot accidentally leak a secret
even if you pass it into the log object — **but don't rely on it**: avoid
staging secrets into log call sites in the first place.

## Testing

In Vitest, Pino writes to stdout by default. Tests pass because they don't
assert on log output. If you need to assert on logs in a test, use a
`pino-test` stream — do **not** monkey-patch `console`.

## Things to not do

- Don't call `pino()` directly in app code. Use `createLogger(context)`.
- Don't pass `Error` instances as a field without the `err` key — Pino's
  serializers expect `err` (and other conventional fields) to enable
  automatic stack/cause formatting. `logError()` handles this for you.
- Don't use `log.child({})` ad-hoc in hot paths — it allocates. Prefer
  module-level `createLogger` + per-request ALS binding.
