/**
 * Forum seed — a living, opinionated debate you can poke at.
 *
 * NOT part of the CI suites (it lives outside the unit/integration globs and
 * runs only via `npm run seed:forum`). It creates PERSISTENT data — there is
 * NO cleanup, on purpose: run it once after `supabase db reset`, then open
 * http://localhost:3000 and interact with a forum that already feels alive.
 *
 * Everything goes through the real app RPCs (rpc_create_post_full /
 * create_comment / react_post), so what you see is exactly what the product
 * produces — long and short posts, threaded replies, and the gauche/droite
 * vote that replaces "good/bad" with "left/right". Tone: sharp opinions,
 * people who disagree and needle each other — civilly. That is the ambiance.
 *
 *   supabase start
 *   supabase db reset      # fresh DB
 *   npm run seed:forum     # populate
 *   ./scripts/dev.sh       # then browse http://localhost:3000
 */
import { expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adminClient,
  createEphemeralUser,
  userClient,
} from '../fixtures/supabase-admin';

function out(line: string): void {
  process.stdout.write(`${line}\n`);
}

interface Persona {
  handle: string;
  displayName: string;
  client: SupabaseClient;
}

async function ensurePersona(
  handle: string,
  displayName: string,
): Promise<Persona> {
  const { email } = await createEphemeralUser(handle);
  // createEphemeralUser sets display_name = handle; give it a human name.
  await adminClient()
    .from('app_profile')
    .update({ display_name: displayName })
    .eq('username', handle);
  return { handle, displayName, client: await userClient(email) };
}

async function makePost(
  p: Persona,
  title: string,
  body: string,
): Promise<{ postItemId: string; slug: string }> {
  const { data, error } = await p.client
    .rpc('rpc_create_post_full', {
      p_title: title,
      p_body: body,
      p_mode: 'post',
    })
    .single();
  if (error)
    throw new Error(`post "${title}" by ${p.handle}: ${error.message}`);
  const row = data as { thread_id: string; post_item_id: string };
  const { data: topic } = await adminClient()
    .from('topic')
    .select('slug')
    .eq('id', row.thread_id)
    .single();
  out(
    `  · post "${title}" by ${p.handle} → /post/${(topic as { slug: string }).slug}`,
  );
  return {
    postItemId: row.post_item_id,
    slug: (topic as { slug: string }).slug,
  };
}

async function addComment(
  p: Persona,
  postItemId: string,
  body: string,
  parentId: string | null = null,
): Promise<string> {
  const { data, error } = await p.client.rpc('create_comment', {
    p_thread_post_id: postItemId,
    p_parent_post_id: parentId,
    p_body_markdown: body,
  });
  if (error) throw new Error(`comment by ${p.handle}: ${error.message}`);
  return String((data as { id: string }).id);
}

async function vote(
  p: Persona,
  target: { type: 'thread_post' | 'comment'; id: string },
  side: 'gauche' | 'droite',
): Promise<void> {
  const { error } = await p.client.rpc('react_post', {
    p_target_type: target.type,
    p_target_id: target.id,
    p_reaction_type: side === 'gauche' ? 'upvote' : 'downvote',
  });
  if (error) throw new Error(`vote by ${p.handle}: ${error.message}`);
}

test('seed a living forum debate', { timeout: 180_000 }, async () => {
  out('Seeding personas…');
  const margaux = await ensurePersona('margaux_lfi', 'Margaux');
  const thierry = await ensurePersona('thierry_rn', 'Thierry');
  const claire = await ensurePersona('claire_centre', 'Claire');
  const bernard = await ensurePersona('bernard_lr', 'Bernard');
  const yannis = await ensurePersona('yannis_ecolo', 'Yannis');

  // ── Thread 1: retraites — long OP, real clash ────────────────────────────
  out('Thread: retraites');
  const retraites = await makePost(
    margaux,
    'Les 64 ans, ce n’est pas une réforme, c’est un vol',
    [
      'On nous a vendu les 64 ans comme une « nécessité comptable ». Soyons',
      'sérieux deux minutes. Le déficit annoncé est une rounding error à',
      'l’échelle du budget de l’État, et il fond dès qu’on parle d’exonérations',
      'de cotisations patronales — 75 milliards par an, jamais évalués.',
      '',
      'La vérité c’est qu’on demande aux caissières, aux aides-soignantes, aux',
      'ouvriers du bâtiment de travailler deux ans de plus pendant que les',
      'dividendes battent des records historiques. **Deux ans de vie en bonne',
      'santé volés à ceux qui en ont le moins.**',
      '',
      'Je veux bien entendre des contre-arguments. Des vrais. Pas « il faut',
      'bien financer le système » répété en boucle comme une prière.',
    ].join('\n'),
  );
  const t1c1 = await addComment(
    bernard,
    retraites.postItemId,
    'Toujours le même tour de passe-passe : on agite « les dividendes » pour ne pas parler démographie. Il y avait 4 actifs par retraité en 1960, il y en a 1,7 aujourd’hui. Aucun slogan ne fera disparaître cette courbe.',
  );
  await addComment(
    margaux,
    retraites.postItemId,
    'La démographie, oui, je connais le tract du MEDEF par cœur. Curieux qu’elle n’empêche ni les rachats d’actions ni les cadeaux fiscaux. On finance ce qu’on décide de financer, Bernard.',
    t1c1,
  );
  const t1c2 = await addComment(
    thierry,
    retraites.postItemId,
    'D’accord avec Margaux sur un point, et ça me coûte de l’écrire : on matraque les Français qui bossent pendant qu’on distribue à tout-va. Mais la solution n’est pas de dépenser plus, c’est d’arrêter de payer pour ceux qui n’ont jamais cotisé ici.',
  );
  await addComment(
    yannis,
    retraites.postItemId,
    'Et personne ne parle de la pénibilité réelle. Reculer l’âge légal sans toucher à l’usure des corps, c’est une politique hors-sol. On gère des tableurs, pas des gens.',
    t1c2,
  );
  await vote(
    thierry,
    { type: 'thread_post', id: retraites.postItemId },
    'droite',
  );
  await vote(
    bernard,
    { type: 'thread_post', id: retraites.postItemId },
    'droite',
  );
  await vote(
    yannis,
    { type: 'thread_post', id: retraites.postItemId },
    'gauche',
  );
  await vote(claire, { type: 'comment', id: t1c1 }, 'droite');
  await vote(margaux, { type: 'comment', id: t1c2 }, 'droite');

  // ── Thread 2: immigration — long OP from the other side ──────────────────
  out('Thread: immigration');
  const immigration = await makePost(
    thierry,
    'On ne peut pas accueillir toute la misère du monde, et on le sait tous',
    [
      'Phrase de Michel Rocard, pas de l’extrême droite : « La France ne peut',
      'pas accueillir toute la misère du monde. » Aujourd’hui la dire vous',
      'vaut un procès en sorcellerie.',
      '',
      'Je ne parle pas de haine, je parle de **capacité**. Écoles saturées,',
      'logements introuvables, services publics à l’os. On ne rend service à',
      'personne — ni aux Français, ni aux arrivants — en faisant semblant que',
      'les moyens sont infinis.',
      '',
      'Qu’on m’explique calmement où je me trompe. Sans me traiter de facho au',
      'troisième mot, si possible.',
    ].join('\n'),
  );
  const t2c1 = await addComment(
    claire,
    immigration.postItemId,
    'Le problème Thierry, ce n’est pas la phrase de Rocard, c’est sa deuxième moitié que vous coupez toujours : « …mais elle doit en prendre fidèlement sa part. » L’immigration est aussi un besoin économique : qui pense que nos hôpitaux tournent sans elle ?',
  );
  await addComment(
    margaux,
    immigration.postItemId,
    'Et statistiquement, l’immigration rapporte plus qu’elle ne coûte (OCDE, pas Mediapart). Mais bon, les chiffres n’ont jamais arrêté un bon ressenti de comptoir.',
    t2c1,
  );
  await addComment(
    bernard,
    immigration.postItemId,
    'Claire a raison sur le besoin de main-d’œuvre, Margaux a raison sur les chiffres, et Thierry a raison sur la saturation des services. Bizarrement c’est peut-être ça, la réalité : pas un camp qui a tout bon.',
  );
  await vote(
    margaux,
    { type: 'thread_post', id: immigration.postItemId },
    'droite',
  );
  await vote(
    claire,
    { type: 'thread_post', id: immigration.postItemId },
    'droite',
  );
  await vote(yannis, { type: 'comment', id: t2c1 }, 'gauche');
  await vote(thierry, { type: 'comment', id: t2c1 }, 'gauche');

  // ── Thread 3: nucléaire vs renouvelables ─────────────────────────────────
  out('Thread: énergie');
  const energie = await makePost(
    yannis,
    'Le nucléaire n’est pas « écolo », arrêtons ce conte de fées',
    [
      'À chaque débat un pro-nucléaire débarque avec sa courbe de CO₂ comme si',
      'c’était la fin de la discussion. Le carbone n’est pas le seul critère.',
      'Déchets sur 100 000 ans, dépendance à l’uranium importé, chantiers type',
      'Flamanville à 4× le budget et 12 ans de retard…',
      '',
      'Je ne suis pas anti-science. Je dis que parier la transition sur une',
      'technologie qu’on ne sait plus construire dans les délais, c’est un pari',
      'idéologique déguisé en pragmatisme.',
    ].join('\n'),
  );
  const t3c1 = await addComment(
    bernard,
    energie.postItemId,
    'Le « conte de fées », c’est de croire qu’on chauffe 68 millions de personnes avec du vent et de la bonne volonté. L’Allemagne a fermé ses centrales et rallumé le charbon. Voilà le résultat concret de votre idéologie.',
  );
  await addComment(
    yannis,
    energie.postItemId,
    'L’épouvantail allemand, à chaque fois. Leur problème c’est d’avoir fermé le nucléaire ET sous-investi le renouvelable, pas le renouvelable en soi. Mais c’est plus simple de citer le charbon que de lire un rapport RTE.',
    t3c1,
  );
  await addComment(
    claire,
    energie.postItemId,
    'Et en même temps… les deux ? Du nucléaire pour la base, du renouvelable pour le reste. Je sais, ce n’est pas assez clivant pour faire un bon post.',
  );
  await vote(
    bernard,
    { type: 'thread_post', id: energie.postItemId },
    'gauche',
  );
  await vote(
    margaux,
    { type: 'thread_post', id: energie.postItemId },
    'gauche',
  );
  await vote(thierry, { type: 'comment', id: t3c1 }, 'droite');
  await vote(yannis, { type: 'comment', id: t3c1 }, 'gauche');

  // ── Thread 4: short, spicy ───────────────────────────────────────────────
  out('Thread: VIe République');
  const sixieme = await makePost(
    claire,
    'La VIᵉ République : grande idée ou doudou de ceux qui perdent les élections ?',
    'Question sincère, réponse courte attendue : on change de Constitution, ou on apprend à s’en servir ?',
  );
  await addComment(
    margaux,
    sixieme.postItemId,
    'Doudou ? Le 49.3 à répétition, c’est un doudou peut-être ? La Ve est à bout de souffle, assumez-le.',
  );
  await addComment(
    bernard,
    sixieme.postItemId,
    'On veut changer de Constitution tous les dix ans et on s’étonne que plus personne ne respecte les institutions. Le problème n’est pas le texte, c’est nous.',
  );
  await vote(
    thierry,
    { type: 'thread_post', id: sixieme.postItemId },
    'droite',
  );
  await vote(yannis, { type: 'thread_post', id: sixieme.postItemId }, 'gauche');

  // Confirm the data actually landed (4 article OPs + ~12 comments).
  const { count } = await adminClient()
    .from('thread_post')
    .select('id', { count: 'exact', head: true });
  expect(count ?? 0).toBeGreaterThan(10);

  out('');
  out(
    'Done. Open http://localhost:3000 — five voices, four debates, real votes.',
  );
});
