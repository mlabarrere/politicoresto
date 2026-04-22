import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createLogger, withRequest } from '@/lib/logger';

/**
 * Client→server log forwarder.
 *
 * Client Components cannot import the Pino logger (it pulls Node
 * primitives like `async_hooks`). They POST a structured payload here;
 * this route emits it through the same Pino pipeline as server code, so
 * the log stream is unified.
 *
 * The client-side helper at `lib/client-log.ts` should be the only caller.
 * Direct use from Server components is a mistake — use `createLogger`.
 */

const payloadSchema = z.object({
  context: z.string().min(1).max(64),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  event: z.string().min(1).max(128),
  message: z.string().max(256).optional(),
  fields: z.record(z.unknown()).optional(),
});

const moduleLog = createLogger('api._log');

export async function POST(request: NextRequest): Promise<NextResponse> {
  const log = withRequest(moduleLog, request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    log.warn({ event: 'log.forward.invalid_json' }, 'body not JSON');
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    log.warn(
      { event: 'log.forward.invalid_payload', issues: parsed.error.issues },
      'payload failed schema',
    );
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const { context, level, event, message, fields } = parsed.data;

  // Emit via a child logger scoped to the client's declared context.
  // Prefix with `client.` so logs from this pipe are always distinguishable
  // from server-side logs in the same context namespace.
  const clientLog = moduleLog.child({ context: `client.${context}` });
  const entry = { event, ...(fields ?? {}) };
  clientLog[level](entry, message ?? event);

  return NextResponse.json({ ok: true });
}
