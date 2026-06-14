import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  adminClient,
  createEphemeralUser,
  userClient,
} from '../fixtures/supabase-admin';

/**
 * Integration — Delta (réaction « ça m'a fait réfléchir ») via toggle_delta.
 * Cible polymorphe sans FK sur target_id → on teste le toggle avec un UUID
 * arbitraire (pas besoin d'un post réel). Nettoyage par cascade (user_id).
 */
describe('toggle_delta (integration)', () => {
  const ephemeralIds: string[] = [];

  afterEach(async () => {
    const admin = adminClient();
    for (const id of ephemeralIds.splice(0)) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it('décerne puis retire le Delta (toggle) ; compteur lisible publiquement', async () => {
    const user = await createEphemeralUser('eph-delta');
    ephemeralIds.push(user.userId);
    const client = await userClient(user.email);
    const targetId = randomUUID();

    const on = await client.rpc('toggle_delta', {
      p_target_type: 'thread_post',
      p_target_id: targetId,
    });
    expect(on.error).toBeNull();
    expect(on.data).toBe(true);

    const afterOn = await adminClient()
      .from('post_delta')
      .select('user_id')
      .eq('target_id', targetId);
    expect(afterOn.data?.length).toBe(1);

    const off = await client.rpc('toggle_delta', {
      p_target_type: 'thread_post',
      p_target_id: targetId,
    });
    expect(off.error).toBeNull();
    expect(off.data).toBe(false);

    const afterOff = await adminClient()
      .from('post_delta')
      .select('user_id')
      .eq('target_id', targetId);
    expect(afterOff.data?.length).toBe(0);
  });
});
