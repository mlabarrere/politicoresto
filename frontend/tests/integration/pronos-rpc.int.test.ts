/**
 * Integration — Pronostics RPCs (lot 1).
 *
 * Cycle complet : request → publish → bets → resolve → reputation_ledger
 * + chemins refus, RLS bets, cas voided. Tout contre Supabase local.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  adminClient,
  createEphemeralUser,
  userClient,
} from '../fixtures/supabase-admin';

interface TestUser {
  email: string;
  userId: string;
  client: SupabaseClient;
}

async function ephemeral(handle: string): Promise<TestUser> {
  const u = await createEphemeralUser(handle);
  return { ...u, client: await userClient(u.email) };
}

async function promoteToModerator(userId: string): Promise<void> {
  const admin = adminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { app_role: 'moderator' },
  });
  if (error) throw new Error(`promoteToModerator failed: ${error.message}`);
}

describe('pronos rpcs (integration)', () => {
  let modo: TestUser;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;
  const cleanupUserIds: string[] = [];
  const cleanupTopicIds: string[] = [];

  beforeAll(async () => {
    alice = await ephemeral('prono-alice');
    bob = await ephemeral('prono-bob');
    carol = await ephemeral('prono-carol');
    const m = await createEphemeralUser('prono-modo');
    await promoteToModerator(m.userId);
    modo = { ...m, client: await userClient(m.email) };
    cleanupUserIds.push(modo.userId, alice.userId, bob.userId, carol.userId);
  });

  afterAll(async () => {
    const admin = adminClient();
    if (cleanupTopicIds.length > 0) {
      await admin.from('topic').delete().in('id', cleanupTopicIds);
    }
    for (const id of cleanupUserIds) {
      await admin.auth.admin.deleteUser(id).catch(() => undefined);
    }
  });

  it('happy path: request → publish → bets → resolve distributes points', async () => {
    const { data: topicId, error: requestErr } = await alice.client.rpc(
      'rpc_request_prono',
      {
        p_title: 'Macron 2027 : se représentera-t-il ?',
        p_question_text:
          'Macron annoncera-t-il sa candidature avant 2027-01-01 ?',
        p_options: ['Oui', 'Non'],
        p_allow_multiple: false,
      },
    );
    expect(requestErr).toBeNull();
    expect(typeof topicId).toBe('string');
    cleanupTopicIds.push(topicId as string);

    const admin = adminClient();
    const { data: question } = await admin
      .from('prono_question')
      .select('id, topic_id')
      .eq('topic_id', topicId)
      .single();
    expect(question?.id).toBeTruthy();

    const { data: options } = await admin
      .from('prono_option')
      .select('id, label, is_catchall, sort_order')
      .eq('question_id', question!.id)
      .order('sort_order', { ascending: true });
    expect(options).toHaveLength(3);
    expect(options!.find((o) => o.is_catchall)?.label).toBe('Autre');

    const ouiOption = options!.find((o) => o.label === 'Oui')!;
    const nonOption = options!.find((o) => o.label === 'Non')!;

    // Topic must be pending; alice (non-modo) cannot publish.
    const { error: aliceCannotPublish } = await alice.client.rpc(
      'rpc_publish_prono',
      { p_topic_id: topicId },
    );
    expect(aliceCannotPublish).not.toBeNull();
    expect(
      aliceCannotPublish?.code === '42501' ||
        aliceCannotPublish?.message?.toLowerCase().includes('forbidden'),
    ).toBe(true);

    // Bets are refused while pending.
    const { error: earlyBetErr } = await alice.client.rpc('rpc_place_bet', {
      p_question_id: question!.id,
      p_option_id: ouiOption.id,
    });
    expect(earlyBetErr).not.toBeNull();

    // Modo publishes.
    const { error: publishErr } = await modo.client.rpc('rpc_publish_prono', {
      p_topic_id: topicId,
    });
    expect(publishErr).toBeNull();

    const { data: pub } = await admin
      .from('topic')
      .select('topic_status')
      .eq('id', topicId)
      .single();
    expect(pub?.topic_status).toBe('open');

    // Three users place bets at different times.
    const { error: aliceBetErr } = await alice.client.rpc('rpc_place_bet', {
      p_question_id: question!.id,
      p_option_id: ouiOption.id,
    });
    expect(aliceBetErr).toBeNull();

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 30);
    });
    await bob.client.rpc('rpc_place_bet', {
      p_question_id: question!.id,
      p_option_id: ouiOption.id,
    });
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 30);
    });
    await carol.client.rpc('rpc_place_bet', {
      p_question_id: question!.id,
      p_option_id: nonOption.id,
    });

    // Snapshot count : 3 bets × 3 active options = 9 rows
    const { count: snapshotCount } = await admin
      .from('prono_distribution_snapshot')
      .select('id', { count: 'exact', head: true })
      .eq('question_id', question!.id);
    expect(snapshotCount).toBe(9);

    // RLS: alice can only see her own bet; modo sees all.
    const { data: aliceVisible } = await alice.client
      .from('prono_bet')
      .select('user_id')
      .eq('question_id', question!.id);
    expect(aliceVisible?.map((b) => b.user_id)).toEqual([alice.userId]);

    const { data: modoVisible } = await modo.client
      .from('prono_bet')
      .select('user_id')
      .eq('question_id', question!.id);
    expect(modoVisible).toHaveLength(3);

    // Resolve : "Oui" wins.
    const { error: resolveErr } = await modo.client.rpc('rpc_resolve_prono', {
      p_question_id: question!.id,
      p_resolution_kind: 'resolved',
      p_winning_option_ids: [ouiOption.id],
      p_betting_cutoff_at: null,
      p_resolution_note: 'Annoncé en conférence de presse.',
      p_void_reason: null,
    });
    expect(resolveErr).toBeNull();

    // Topic flipped to resolved.
    const { data: post } = await admin
      .from('topic')
      .select('topic_status')
      .eq('id', topicId)
      .single();
    expect(post?.topic_status).toBe('resolved');

    // Reputation ledger : exactly 2 entries (alice + bob), nothing for carol.
    const { data: ledgerRows } = await admin
      .from('reputation_ledger')
      .select('user_id, delta, metadata')
      .eq('reference_entity_type', 'prono_question')
      .eq('reference_entity_id', question!.id)
      .order('created_at', { ascending: true });
    expect(ledgerRows).toHaveLength(2);
    const winners = (ledgerRows ?? []).map((r) => r.user_id);
    expect(winners).toContain(alice.userId);
    expect(winners).toContain(bob.userId);
    expect(winners).not.toContain(carol.userId);

    // Multiplier sanity : alice was first → smallest snapshot → highest mult.
    const aliceLedger = ledgerRows!.find((r) => r.user_id === alice.userId)!;
    const bobLedger = ledgerRows!.find((r) => r.user_id === bob.userId)!;
    expect(aliceLedger.delta).toBeGreaterThanOrEqual(bobLedger.delta);

    // Notifications sent to all three bettors.
    const { data: notifs } = await admin
      .from('user_notification')
      .select('user_id, kind')
      .eq('kind', 'prono_resolved')
      .in('user_id', [alice.userId, bob.userId, carol.userId]);
    expect(notifs).toHaveLength(3);

    // After resolution, RLS lets a third party read all bets.
    const { data: allBets } = await alice.client
      .from('prono_bet')
      .select('user_id')
      .eq('question_id', question!.id);
    expect(allBets).toHaveLength(3);
  });

  it('reject path: modo rejects pending request, demandeur is notified', async () => {
    const { data: topicId } = await alice.client.rpc('rpc_request_prono', {
      p_title: 'Test reject',
      p_question_text: 'Question rejetée',
      p_options: ['A', 'B'],
      p_allow_multiple: false,
    });
    cleanupTopicIds.push(topicId as string);

    const { error } = await modo.client.rpc('rpc_reject_prono', {
      p_topic_id: topicId,
      p_reason: 'Hors charte éditoriale.',
    });
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: t } = await admin
      .from('topic')
      .select('topic_status, locked_reason')
      .eq('id', topicId)
      .single();
    expect(t?.topic_status).toBe('rejected');
    expect(t?.locked_reason).toBe('Hors charte éditoriale.');

    const { data: notif } = await admin
      .from('user_notification')
      .select('kind, payload')
      .eq('user_id', alice.userId)
      .eq('kind', 'prono_rejected')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(notif?.kind).toBe('prono_rejected');
  });

  it('voided path: bets kept but no points awarded', async () => {
    const { data: topicId } = await alice.client.rpc('rpc_request_prono', {
      p_title: 'Test void',
      p_question_text: 'Question annulée',
      p_options: ['Pour', 'Contre'],
      p_allow_multiple: false,
    });
    cleanupTopicIds.push(topicId as string);

    await modo.client.rpc('rpc_publish_prono', { p_topic_id: topicId });

    const admin = adminClient();
    const { data: q } = await admin
      .from('prono_question')
      .select('id')
      .eq('topic_id', topicId)
      .single();
    const { data: opt } = await admin
      .from('prono_option')
      .select('id')
      .eq('question_id', q!.id)
      .eq('label', 'Pour')
      .single();

    await alice.client.rpc('rpc_place_bet', {
      p_question_id: q!.id,
      p_option_id: opt!.id,
    });

    const { error: voidErr } = await modo.client.rpc('rpc_resolve_prono', {
      p_question_id: q!.id,
      p_resolution_kind: 'voided',
      p_winning_option_ids: null,
      p_betting_cutoff_at: null,
      p_resolution_note: null,
      p_void_reason: 'Événement reporté sine die.',
    });
    expect(voidErr).toBeNull();

    const { data: ledger } = await admin
      .from('reputation_ledger')
      .select('id')
      .eq('reference_entity_type', 'prono_question')
      .eq('reference_entity_id', q!.id);
    expect(ledger).toHaveLength(0);

    const { data: bets } = await admin
      .from('prono_bet')
      .select('id')
      .eq('question_id', q!.id);
    expect(bets).toHaveLength(1);
  });

  it('cutoff prunes late bets from scoring', async () => {
    const { data: topicId } = await alice.client.rpc('rpc_request_prono', {
      p_title: 'Test cutoff',
      p_question_text: 'Question avec cutoff',
      p_options: ['X', 'Y'],
      p_allow_multiple: false,
    });
    cleanupTopicIds.push(topicId as string);
    await modo.client.rpc('rpc_publish_prono', { p_topic_id: topicId });

    const admin = adminClient();
    const { data: q } = await admin
      .from('prono_question')
      .select('id')
      .eq('topic_id', topicId)
      .single();
    const { data: optRows } = await admin
      .from('prono_option')
      .select('id, label')
      .eq('question_id', q!.id);
    const x = optRows!.find((o) => o.label === 'X')!;

    await alice.client.rpc('rpc_place_bet', {
      p_question_id: q!.id,
      p_option_id: x.id,
    });
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    const cutoff = new Date().toISOString();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    await bob.client.rpc('rpc_place_bet', {
      p_question_id: q!.id,
      p_option_id: x.id,
    });

    await modo.client.rpc('rpc_resolve_prono', {
      p_question_id: q!.id,
      p_resolution_kind: 'resolved',
      p_winning_option_ids: [x.id],
      p_betting_cutoff_at: cutoff,
      p_resolution_note: null,
      p_void_reason: null,
    });

    const { data: bets } = await admin
      .from('prono_bet')
      .select('user_id, is_pruned')
      .eq('question_id', q!.id)
      .order('bet_at', { ascending: true });
    expect(bets!.find((b) => b.user_id === alice.userId)?.is_pruned).toBe(
      false,
    );
    expect(bets!.find((b) => b.user_id === bob.userId)?.is_pruned).toBe(true);

    const { data: ledger } = await admin
      .from('reputation_ledger')
      .select('user_id')
      .eq('reference_entity_type', 'prono_question')
      .eq('reference_entity_id', q!.id);
    expect(ledger!.map((l) => l.user_id)).toEqual([alice.userId]);
  });

  it('add_option notifies existing bettors and exposes the option for new bets', async () => {
    const { data: topicId } = await alice.client.rpc('rpc_request_prono', {
      p_title: 'Test add option',
      p_question_text: 'Liste évolutive',
      p_options: ['A', 'B'],
      p_allow_multiple: false,
    });
    cleanupTopicIds.push(topicId as string);
    await modo.client.rpc('rpc_publish_prono', { p_topic_id: topicId });

    const admin = adminClient();
    const { data: q } = await admin
      .from('prono_question')
      .select('id')
      .eq('topic_id', topicId)
      .single();
    const { data: optA } = await admin
      .from('prono_option')
      .select('id')
      .eq('question_id', q!.id)
      .eq('label', 'A')
      .single();

    await alice.client.rpc('rpc_place_bet', {
      p_question_id: q!.id,
      p_option_id: optA!.id,
    });

    const { data: newOptId, error: addErr } = await modo.client.rpc(
      'rpc_add_option',
      { p_question_id: q!.id, p_label: 'C' },
    );
    expect(addErr).toBeNull();

    const { data: notif } = await admin
      .from('user_notification')
      .select('kind, payload')
      .eq('user_id', alice.userId)
      .eq('kind', 'prono_option_added')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(notif?.kind).toBe('prono_option_added');
    expect((notif?.payload as { option_id?: string })?.option_id).toBe(
      newOptId,
    );

    // Bob can now bet on the new option.
    const { error: bobBetErr } = await bob.client.rpc('rpc_place_bet', {
      p_question_id: q!.id,
      p_option_id: newOptId as string,
    });
    expect(bobBetErr).toBeNull();
  });
});
