import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  adminClient,
  createEphemeralUser,
  createTestPost,
  SEED_USER,
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

  it('count_deltas_received agrège les Delta reçus sur les contenus de l’auteur', async () => {
    // L'auteur du contenu est le seed user (createTestPost). Un autre membre
    // décerne le Delta → le compteur reçu de l'auteur augmente de 1.
    const post = await createTestPost(`Delta count post ${Date.now()}`);
    const giver = await createEphemeralUser('eph-delta-count');
    ephemeralIds.push(giver.userId);
    const giverClient = await userClient(giver.email);

    const admin = adminClient();
    const before = await admin.rpc('count_deltas_received', {
      p_user_id: SEED_USER.userId,
    });
    expect(before.error).toBeNull();
    const baseline = typeof before.data === 'number' ? before.data : 0;

    const awarded = await giverClient.rpc('toggle_delta', {
      p_target_type: 'thread_post',
      p_target_id: post.postItemId,
    });
    expect(awarded.error).toBeNull();
    expect(awarded.data).toBe(true);

    const after = await admin.rpc('count_deltas_received', {
      p_user_id: SEED_USER.userId,
    });
    expect(after.error).toBeNull();
    expect(after.data).toBe(baseline + 1);

    // Nettoyage : retirer le Delta puis le post (post enfant avant thread_post).
    await admin.from('post_delta').delete().eq('target_id', post.postItemId);
    await admin.from('post').delete().eq('thread_post_id', post.postItemId);
    await admin.from('thread_post').delete().eq('id', post.postItemId);
    await admin.from('topic').delete().eq('id', post.threadId);
  });
});
