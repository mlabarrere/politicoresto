import { NextResponse } from 'next/server';
import { createLogger, withRequest } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const baseLog = createLogger('geo.resolve-city');

const POSTAL_RE = /^[0-9]{5}$/;
const GEO_ENDPOINT = 'https://geo.api.gouv.fr/communes';

interface CommuneRow {
  nom?: string;
}

export async function GET(request: Request) {
  const log = withRequest(baseLog, request);

  // Auth gate: city resolution is only useful for logged-in users filling
  // their demographic profile. Refuse anonymous callers so this handler
  // isn't a free proxy into the upstream API.
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') ?? '').trim();
  if (!POSTAL_RE.test(code)) {
    return NextResponse.json({ error: 'Invalid postal code' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${GEO_ENDPOINT}?codePostal=${encodeURIComponent(code)}&fields=nom&format=json`,
      { cache: 'no-store' },
    );
  } catch (err) {
    log.error(
      { event: 'geo.upstream.fetch_failed', code, err: String(err) },
      'geo.api.gouv.fr fetch failed',
    );
    return NextResponse.json({ city: null });
  }

  if (!upstream.ok) {
    log.warn(
      { event: 'geo.upstream.non_ok', code, status: upstream.status },
      'geo.api.gouv.fr non-ok',
    );
    return NextResponse.json({ city: null });
  }

  const rows = (await upstream.json().catch(() => [])) as CommuneRow[];
  // Multi-commune postal codes: pick the first match. For weighting strata
  // the precise commune inside a postal zone matters less than the broader
  // geography. UX: "résolu à Lyon 3ème" is acceptable vs "Lyon 1er".
  const city = rows[0]?.nom ?? null;

  log.info({ event: 'geo.resolve.ok', code, city }, 'city resolved');
  return NextResponse.json({ city });
}
