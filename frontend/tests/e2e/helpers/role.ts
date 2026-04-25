/**
 * Promote / reset a user's app_role on the local Supabase instance.
 * Used by E2E tests that need to exercise the moderator-gated routes.
 *
 * The role lives in `auth.users.raw_app_meta_data.app_role` and is read
 * by the SQL helper `current_app_role()`. Updating it via the admin API
 * mints a new value for the next JWT issued — existing sessions keep
 * the old claim until they are re-minted.
 */
import { createClient as createAdminClient } from '@supabase/supabase-js';

function adminFromEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('setUserRole: missing supabase env vars in playwright.');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function setUserRoleByEmail(
  email: string,
  role: string | null,
): Promise<void> {
  const admin = adminFromEnv();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(`setUserRole: listUsers failed: ${error.message}`);
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`setUserRole: no user with email ${email}`);
  const meta = { ...(user.app_metadata ?? {}) };
  if (role) {
    meta.app_role = role;
  } else {
    delete meta.app_role;
  }
  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: meta,
  });
  if (updateErr) {
    throw new Error(`setUserRole: update failed: ${updateErr.message}`);
  }
}
