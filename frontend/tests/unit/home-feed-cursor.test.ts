/**
 * Unit — cursor encode / decode for the home feed.
 *
 * This is a pure-logic check; the server-side query is exercised via the
 * existing integration suite (feed is a view of seeded data).
 */
import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '@/lib/data/public/home';

describe('home feed cursor', () => {
  it('encode → decode round-trips the fields', () => {
    const cursor = {
      latest_thread_post_at: '2026-04-22T10:00:00Z',
      editorial_feed_rank: 5,
      topic_id: 'abc-123',
    };
    const encoded = encodeCursor(cursor);
    expect(typeof encoded).toBe('string');
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it('decode returns null for undefined / empty / garbage', () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor('')).toBeNull();
    expect(decodeCursor('not-base64!!!')).toBeNull();
  });

  it('decode tolerates missing editorial_feed_rank / latest_thread_post_at', () => {
    const encoded = Buffer.from(
      JSON.stringify({ topic_id: 'only-id' }),
      'utf8',
    ).toString('base64url');
    expect(decodeCursor(encoded)).toEqual({
      latest_thread_post_at: null,
      editorial_feed_rank: null,
      topic_id: 'only-id',
    });
  });

  it('decode rejects payloads without topic_id', () => {
    const encoded = Buffer.from(
      JSON.stringify({ latest_thread_post_at: '2026-01-01' }),
      'utf8',
    ).toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });
});
