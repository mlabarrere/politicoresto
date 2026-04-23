import { NextResponse } from 'next/server';
import {
  decodeCursor,
  encodeCursor,
  getHomeScreenData,
} from '@/lib/data/public/home';
import { createLogger, withRequest } from '@/lib/logger';

const baseLog = createLogger('api.feed');

export async function GET(request: Request) {
  const log = withRequest(baseLog, request);
  const { searchParams } = new URL(request.url);
  const cursor = decodeCursor(searchParams.get('cursor'));
  const limitRaw = Number(searchParams.get('limit') ?? 0);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined;

  const { data, error } = await getHomeScreenData(null, { cursor, limit });

  if (error) {
    log.warn({ event: 'feed.page.error', error }, 'feed page fetch failed');
    return NextResponse.json({ error }, { status: 503 });
  }

  return NextResponse.json({
    items: data.feed,
    nextCursor: data.nextCursor ? encodeCursor(data.nextCursor) : null,
  });
}
