import { describe, expect, it } from 'vitest';
import {
  createLogger,
  logError,
  rootLogger,
  withRequest,
  withUser,
  runWithRequest,
  getRequestId,
  getRequestLogger,
} from '@/lib/logger';

describe('lib/logger', () => {
  it('rootLogger exposes the configured level', () => {
    expect(typeof rootLogger.level).toBe('string');
    expect(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).toContain(
      rootLogger.level,
    );
  });

  it('createLogger binds the context field', () => {
    const log = createLogger('test.ctx');
    expect(log.bindings().context).toBe('test.ctx');
  });

  it('withRequest binds method, path, user_agent, and request_id from headers', () => {
    const req = new Request('http://example.test/feed?x=1', {
      method: 'POST',
      headers: {
        'x-request-id': 'req-abc',
        'user-agent': 'vitest/0',
      },
    });
    const log = withRequest(createLogger('test.http'), req);
    const bindings = log.bindings();
    expect(bindings.request_id).toBe('req-abc');
    expect(bindings.method).toBe('POST');
    expect(bindings.path).toBe('/feed');
    expect(bindings.user_agent).toBe('vitest/0');
  });

  it('withRequest omits request_id when header absent', () => {
    const req = new Request('http://example.test/', { method: 'GET' });
    const log = withRequest(createLogger('test.http2'), req);
    expect(log.bindings().request_id).toBeUndefined();
  });

  it('withUser binds user_id and is opt-in for user_email', () => {
    const noEmail = withUser(createLogger('test.user'), { id: 'u-1' });
    const withEmail = withUser(createLogger('test.user'), {
      id: 'u-2',
      email: 'a@b.c',
    });
    expect(noEmail.bindings().user_id).toBe('u-1');
    expect(noEmail.bindings().user_email).toBeUndefined();
    expect(withEmail.bindings().user_id).toBe('u-2');
    expect(withEmail.bindings().user_email).toBe('a@b.c');
  });

  it('withUser ignores a null email', () => {
    const log = withUser(createLogger('test.user2'), {
      id: 'u-3',
      email: null,
    });
    expect(log.bindings().user_email).toBeUndefined();
  });

  it('logError calls logger.error by default', () => {
    const log = createLogger('test.err');
    const calls: { level: string; args: unknown[] }[] = [];
    const shim = {
      error: (...args: unknown[]) => calls.push({ level: 'error', args }),
      warn: (...args: unknown[]) => calls.push({ level: 'warn', args }),
      fatal: (...args: unknown[]) => calls.push({ level: 'fatal', args }),
    };
    // Cast shim to satisfy the Logger shape required by logError.
    logError(shim as unknown as typeof log, new Error('boom'), {
      event: 'oops',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.level).toBe('error');
    const payload = calls[0]!.args[0] as {
      event: string;
      err: { type: string; message: string; stack?: string };
    };
    expect(payload.event).toBe('oops');
    expect(payload.err.type).toBe('Error');
    expect(payload.err.message).toBe('boom');
    expect(payload.err.stack).toBeTypeOf('string');
    expect(calls[0]!.args[1]).toBe('unhandled error');
  });

  it('logError honours level override', () => {
    const calls: { level: string }[] = [];
    const shim = {
      error: () => calls.push({ level: 'error' }),
      warn: () => calls.push({ level: 'warn' }),
      fatal: () => calls.push({ level: 'fatal' }),
    };
    logError(shim as never, new Error('x'), { level: 'warn' });
    logError(shim as never, new Error('y'), { level: 'fatal' });
    expect(calls.map((c) => c.level)).toEqual(['warn', 'fatal']);
  });

  it('logError serializes Error cause chain', () => {
    const calls: unknown[][] = [];
    const shim = { error: (...a: unknown[]) => calls.push(a) };
    const cause = new Error('root');
    const outer = new Error('outer', { cause });
    logError(shim as never, outer);
    const payload = calls[0]![0] as {
      err: { message: string; cause: { message: string } };
    };
    expect(payload.err.message).toBe('outer');
    expect(payload.err.cause.message).toBe('root');
  });

  it('logError handles non-Error values', () => {
    const calls: unknown[][] = [];
    const shim = { error: (...a: unknown[]) => calls.push(a) };
    logError(shim as never, 'a string');
    logError(shim as never, 42);
    logError(shim as never, { foo: 'bar' });
    expect((calls[0]![0] as { err: { value: string } }).err.value).toBe(
      'a string',
    );
    expect((calls[1]![0] as { err: { value: string } }).err.value).toBe('42');
    expect((calls[2]![0] as { err: Record<string, unknown> }).err.foo).toBe(
      'bar',
    );
  });

  it('runWithRequest exposes requestId and logger via AsyncLocalStorage', async () => {
    const logger = createLogger('test.als');
    expect(getRequestId()).toBeUndefined();
    expect(getRequestLogger()).toBeUndefined();

    await runWithRequest({ requestId: 'als-1', logger }, async () => {
      expect(getRequestId()).toBe('als-1');
      expect(getRequestLogger()).toBe(logger);
    });

    expect(getRequestId()).toBeUndefined();
    expect(getRequestLogger()).toBeUndefined();
  });

  it('runWithRequest isolates concurrent scopes', async () => {
    const loggerA = createLogger('A');
    const loggerB = createLogger('B');
    const results: string[] = [];

    await Promise.all([
      runWithRequest({ requestId: 'a', logger: loggerA }, async () => {
        await new Promise((r) => { setTimeout(r, 5); });
        results.push(`A:${getRequestId()}`);
      }),
      runWithRequest({ requestId: 'b', logger: loggerB }, async () => {
        await new Promise((r) => { setTimeout(r, 1); });
        results.push(`B:${getRequestId()}`);
      }),
    ]);

    expect(results.sort()).toEqual(['A:a', 'B:b']);
  });
});
