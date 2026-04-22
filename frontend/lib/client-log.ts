/**
 * Client-side logger that forwards structured entries to `/api/_log`.
 *
 * Client components cannot import the Pino server logger. Use this tiny
 * helper to produce structured JSON that surfaces in the same log stream
 * as server code.
 *
 *   import { clientLog } from '@/lib/client-log';
 *   const log = clientLog('oauth.google');
 *   log.info('oauth.google.start', { origin, redirectTo });
 *   log.error('oauth.google.signin_failed', { message: err.message });
 *
 * Failures to POST are swallowed — logging must never break the UX.
 * The forwarder itself is fire-and-forget.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

interface ForwardPayload {
  context: string;
  level: Level;
  event: string;
  message?: string;
  fields?: Record<string, unknown>;
}

function post(payload: ForwardPayload): void {
  // Fire-and-forget. `keepalive: true` lets the request survive a
  // navigation (e.g. logs emitted right before window.location.assign).
  // Swallow both sync throws and async rejections — logging must never
  // break the UX (and in unit tests jsdom's fetch rejects on a relative URL).
  if (typeof window === 'undefined') return;
  try {
    void fetch('/api/_log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Logging must never throw.
  }
}

export function clientLog(context: string): {
  debug: (
    event: string,
    fields?: Record<string, unknown>,
    message?: string,
  ) => void;
  info: (
    event: string,
    fields?: Record<string, unknown>,
    message?: string,
  ) => void;
  warn: (
    event: string,
    fields?: Record<string, unknown>,
    message?: string,
  ) => void;
  error: (
    event: string,
    fields?: Record<string, unknown>,
    message?: string,
  ) => void;
} {
  const make =
    (level: Level) =>
    (event: string, fields?: Record<string, unknown>, message?: string) => {
      post({ context, level, event, fields, message });
    };
  return {
    debug: make('debug'),
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
  };
}
