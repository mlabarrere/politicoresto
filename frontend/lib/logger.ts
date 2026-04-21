/**
 * Single logging entry point. All application logging goes through this module.
 *
 *   import { createLogger, withRequest, logError } from "@/lib/logger";
 *   const log = createLogger("auth");
 *   log.info({ userId }, "session exchanged");
 *
 * Hard rules (enforced by CI in Session 3):
 *   - No `console.*` in app code. Tests and `scripts/*` excepted.
 *   - Fields first, message second: `log.info({ fields }, "message")`.
 *   - Secrets are redacted at the logger level — see REDACT_PATHS.
 */

import { AsyncLocalStorage } from "async_hooks";
import pino, { type Logger } from "pino";

const IS_EDGE = process.env.NEXT_RUNTIME === "edge";
const IS_DEV = process.env.NODE_ENV !== "production";
const LOG_LEVEL = (process.env.LOG_LEVEL ?? (IS_DEV ? "debug" : "info")) as
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal";
const LOG_PRETTY = process.env.LOG_PRETTY === "true" && IS_DEV && !IS_EDGE;

/** Redaction paths applied at the logger level (Pino `redact`). */
const REDACT_PATHS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "secret",
  "api_key",
  "apiKey",
  "service_role_key",
  "serviceRoleKey",
  "*.password",
  "*.token",
  "*.cookie",
  "*.authorization",
  "req.headers.cookie",
  "req.headers.authorization",
  "request.headers.cookie",
  "request.headers.authorization",
  "body.password",
  "body.token"
];

function buildLogger(): Logger {
  const base = {
    level: LOG_LEVEL,
    base: { env: process.env.NODE_ENV ?? "unknown" },
    redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
    formatters: {
      level: (label: string) => ({ level: label })
    },
    timestamp: pino.stdTimeFunctions.isoTime
  } as const;

  if (LOG_PRETTY) {
    return pino({
      ...base,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname,env",
          messageFormat: "[{context}] {msg}"
        }
      }
    });
  }

  return pino(base);
}

export const rootLogger: Logger = buildLogger();

/** Factory: bind a stable `context` tag for a module. */
export function createLogger(context: string): Logger {
  return rootLogger.child({ context });
}

/** Enrich a logger with per-request fields. Non-mutating. */
export function withRequest(
  logger: Logger,
  req: Request | { headers: Headers; method: string; url: string }
): Logger {
  const url = "url" in req ? new URL(req.url) : new URL("http://local/");
  return logger.child({
    request_id: req.headers.get("x-request-id") ?? undefined,
    method: req.method,
    path: url.pathname,
    user_agent: req.headers.get("user-agent") ?? undefined
  });
}

/** Enrich a logger with the authenticated user. Email is opt-in per-call. */
export function withUser(
  logger: Logger,
  user: { id: string; email?: string | null }
): Logger {
  return logger.child({
    user_id: user.id,
    ...(user.email ? { user_email: user.email } : {})
  });
}

/**
 * Serialize an error (including cause chain) and log it.
 * Default level is `error`; pass `{ level: 'fatal' }` for process-level.
 */
export function logError(
  logger: Logger,
  err: unknown,
  extra?: { message?: string; level?: "warn" | "error" | "fatal"; [k: string]: unknown }
): void {
  const { message = "unhandled error", level = "error", ...fields } = extra ?? {};
  const serialized = serializeError(err);
  logger[level]({ err: serialized, ...fields }, message);
}

function serializeError(err: unknown): object {
  if (err instanceof Error) {
    const out: Record<string, unknown> = {
      type: err.constructor.name,
      message: err.message,
      stack: err.stack
    };
    if (err.cause !== undefined) out.cause = serializeError(err.cause);
    return out;
  }
  if (typeof err === "object" && err !== null) return err as object;
  return { value: String(err) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Request correlation via AsyncLocalStorage. Works in both Node and Edge
// runtimes (Next.js ships an ALS polyfill for Edge).
// ─────────────────────────────────────────────────────────────────────────────

type RequestStoreEntry = { requestId: string; logger: Logger };
const requestStore = new AsyncLocalStorage<RequestStoreEntry>();

export function runWithRequest<T>(
  entry: RequestStoreEntry,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return requestStore.run(entry, fn);
}

export function getRequestId(): string | undefined {
  return requestStore.getStore()?.requestId;
}

export function getRequestLogger(): Logger | undefined {
  return requestStore.getStore()?.logger;
}

// ─────────────────────────────────────────────────────────────────────────────
// Process-level error handlers (Node only — Edge has no process.on).
// ─────────────────────────────────────────────────────────────────────────────

if (!IS_EDGE && typeof process !== "undefined" && typeof process.on === "function") {
  // Guard against double-registration under HMR.
  const FLAG = "__politicoresto_logger_handlers__";
  const g = globalThis as unknown as Record<string, boolean>;
  if (!g[FLAG]) {
    g[FLAG] = true;
    // Registering a handler suppresses Node's default crash-on-fatal behaviour,
    // so we must log + flush + exit(1) ourselves. Otherwise the process keeps
    // serving requests from an undefined state.
    //
    // Skipped under Vitest: the test runner registers its own handlers and
    // terminating the process would kill the whole suite.
    const isTest =
      process.env.NODE_ENV === "test" || process.env.VITEST === "true";

    const crash = (reason: unknown, source: "unhandledRejection" | "uncaughtException") => {
      logError(rootLogger, reason, { level: "fatal", source });
      if (isTest) return;
      // Give Pino's async destination a chance to flush before exit.
      const maybeFlush = (rootLogger as unknown as { flush?: () => void }).flush;
      if (typeof maybeFlush === "function") {
        try {
          maybeFlush.call(rootLogger);
        } catch {
          // Ignore — we're crashing anyway.
        }
      }
      process.exit(1);
    };

    process.on("unhandledRejection", (reason) => crash(reason, "unhandledRejection"));
    process.on("uncaughtException", (err) => crash(err, "uncaughtException"));
  }
}
