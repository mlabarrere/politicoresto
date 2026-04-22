/**
 * Integration test — sign-in flow, server side.
 *
 * Exercises real Supabase auth against the local stack. Proves that the
 * same admin-magic-link flow our E2E uses actually produces a session
 * with correct claims, and that the resulting user client can read its
 * own `app_profile` row under RLS (which is how most of the app decides
 * whether to send a newly-signed-in user to /onboarding).
 *
 * Nothing is mocked. No password.
 */
import { describe, expect, it } from 'vitest';
import { SEED_USER, userClient } from '../fixtures/supabase-admin';

describe('auth.sign-in (integration)', () => {
  it('admin-generated magic-link → verifyOtp produces a session with seed claims', async () => {
    const client = await userClient(SEED_USER.email);

    const { data: claimsData, error: claimsErr } =
      await client.auth.getClaims();
    expect(claimsErr).toBeNull();
    expect(claimsData?.claims).toBeTruthy();

    const claims = claimsData!.claims;
    expect(claims.email).toBe(SEED_USER.email);
    expect(claims.sub).toBe(SEED_USER.userId);
    // Asymmetric JWT keys — `role` in claims is either `authenticated`
    // or `anon`. Sign-in must put us in the authenticated bucket.
    expect(claims.role).toBe('authenticated');
  });

  it('signed-in user client can read its own app_profile row under RLS', async () => {
    const client = await userClient(SEED_USER.email);

    const { data, error } = await client
      .from('app_profile')
      .select('user_id, username')
      .eq('user_id', SEED_USER.userId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.user_id).toBe(SEED_USER.userId);
  });
});
