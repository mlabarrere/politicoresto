import { redirect } from 'next/navigation';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/utils/safe-path';

export async function requireSession(nextPath = '/me') {
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent(safeNextPath(nextPath, '/me'))}`,
    );
  }

  return { supabase, userId };
}
