/**
 * Integration — profile demographics (DOB + postal code).
 *
 * Covers:
 *   - Happy path: auth user writes DOB + postal code, read-back confirms.
 *   - Age floor: DOB < 18 years old is rejected and NOTHING persists.
 *   - Postal format: non-5-digit code is rejected.
 *   - Nudge flag: rpc_mark_completion_nudge_seen flips the column.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adminClient,
  createEphemeralUser,
  userClient,
} from '../fixtures/supabase-admin';

describe('profile demographics (integration)', () => {
  let user: { email: string; userId: string };
  let client: SupabaseClient;

  beforeAll(async () => {
    user = await createEphemeralUser('eph-demographics');
    client = await userClient(user.email);
  });

  afterAll(async () => {
    await adminClient().auth.admin.deleteUser(user.userId);
  });

  it('happy: author sets DOB + postal code, RPC stores it', async () => {
    const { error } = await client.rpc('rpc_update_profile_demographics', {
      p_date_of_birth: '1990-06-15',
      p_postal_code: '75011',
      p_resolved_city: 'Paris',
    });
    expect(error).toBeNull();

    const { data: upp } = await adminClient()
      .from('user_private_political_profile')
      .select('date_of_birth, postal_code')
      .eq('user_id', user.userId)
      .single();
    expect(upp?.date_of_birth).toBe('1990-06-15');
    expect(upp?.postal_code).toBe('75011');

    const { data: ap } = await adminClient()
      .from('app_profile')
      .select('resolved_city')
      .eq('user_id', user.userId)
      .single();
    expect(ap?.resolved_city).toBe('Paris');
  });

  it('age floor: DOB making user < 18 is rejected, nothing persists', async () => {
    const teen = await createEphemeralUser('eph-demographics-teen');
    const teenClient = await userClient(teen.email);
    const today = new Date();
    const underageIso = `${today.getFullYear() - 10}-06-15`;
    const { error } = await teenClient.rpc('rpc_update_profile_demographics', {
      p_date_of_birth: underageIso,
      p_postal_code: '75011',
      p_resolved_city: 'Paris',
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/minimum age/i);

    // Nothing persisted for this user.
    const { data: upp } = await adminClient()
      .from('user_private_political_profile')
      .select('date_of_birth')
      .eq('user_id', teen.userId)
      .maybeSingle();
    expect(upp?.date_of_birth ?? null).toBeNull();

    await adminClient().auth.admin.deleteUser(teen.userId);
  });

  it('postal format: non-5-digit is rejected', async () => {
    const { error } = await client.rpc('rpc_update_profile_demographics', {
      p_date_of_birth: '1990-06-15',
      p_postal_code: 'ABCDE',
      p_resolved_city: null,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/postal/i);
  });

  it('nudge flag: mark seen flips has_seen_completion_nudge to true', async () => {
    const before = await adminClient()
      .from('app_profile')
      .select('has_seen_completion_nudge')
      .eq('user_id', user.userId)
      .single();
    expect(before.data?.has_seen_completion_nudge).toBe(false);

    const { error } = await client.rpc('rpc_mark_completion_nudge_seen');
    expect(error).toBeNull();

    const after = await adminClient()
      .from('app_profile')
      .select('has_seen_completion_nudge')
      .eq('user_id', user.userId)
      .single();
    expect(after.data?.has_seen_completion_nudge).toBe(true);
  });
});
