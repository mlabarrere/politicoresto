import { NextResponse } from 'next/server';

import { normalizeUsername, validateUsername } from '@/lib/account/username';
import { createLogger, logError } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const log = createLogger('api.username-availability');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const value = String(searchParams.get('value') ?? '');
  const username = normalizeUsername(value);

  const validationError = validateUsername(username);
  if (validationError) {
    return NextResponse.json(
      { available: false, reason: validationError, normalized: username },
      { status: 200 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    return NextResponse.json(
      {
        available: false,
        reason: 'Authentication required',
        normalized: username,
      },
      { status: 401 },
    );
  }

  const [
    { data: current, error: currentError },
    { data: duplicate, error: duplicateError },
  ] = await Promise.all([
    supabase
      .from('app_profile')
      .select('username')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('app_profile')
      .select('user_id')
      .eq('username', username)
      .neq('user_id', userId)
      .maybeSingle(),
  ]);

  if (currentError || duplicateError) {
    logError(log, currentError ?? duplicateError, {
      event: 'query.failed',
      user_id: userId,
      duplicate_error: duplicateError?.message,
      message: 'app_profile lookup failed',
    });
    return NextResponse.json(
      {
        available: false,
        reason: 'Verification impossible pour le moment.',
        normalized: username,
      },
      { status: 500 },
    );
  }

  const currentUsername = String(
    (current as { username?: string | null } | null)?.username ?? '',
  ).toLowerCase();
  const isCurrentUsername = currentUsername === username;

  return NextResponse.json({
    available: !duplicate,
    normalized: username,
    isCurrentUsername,
    reason: duplicate ? 'Ce username est deja pris.' : null,
  });
}
