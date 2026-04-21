import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { supabaseEnv } from '@/lib/supabase/env';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseEnv.url(), supabaseEnv.publishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>,
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies during render.
        }
      },
    },
  });
}
