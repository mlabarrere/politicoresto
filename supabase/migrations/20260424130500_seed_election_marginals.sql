begin;

-- ─────────────────────────────────────────────────────────────
-- Phase 3d.2 — Marginales par candidat × élection, tirées des vrais
-- chiffres du Ministère de l'Intérieur déjà seedés dans
-- `public.election_result` (phase 1, migration 20260420120000).
--
-- Pour chaque élection on produit :
--   * une entrée par candidat listé (pct_exprimes / 100 sur exprimés)
--   * une entrée "abstention"     = (inscrits - votants) / inscrits
--   * une entrée "blanc"          = blancs / votants
--   * une entrée "nul"            = nuls / votants
--
-- Note de normalisation : les shares stockées dans `survey_ref_marginal`
-- doivent sommer à 1 pour chaque (dimension, as_of). On produit donc
-- les shares sur base INSCRITS (abstention incluse), pas sur exprimés.
-- Formule :
--     share_candidat  = pct_exprimes × (votants - blancs - nuls) / (100 × inscrits)
--                     ≈ votes_candidat / inscrits
--     share_blanc     = blancs / inscrits
--     share_nul       = nuls   / inscrits
--     share_abstention= (inscrits - votants) / inscrits
--
-- Ces shares reflètent la population 18+ INSCRITE SUR LES LISTES. On
-- laisse le "unknown bucket" (K-1a) couvrir les non-inscrits et les
-- users qui déclineront de répondre.
--
-- Idempotent : DELETE d'abord les lignes electorales existantes pour
-- cette as_of, puis INSERT recalculé.
-- ─────────────────────────────────────────────────────────────

-- On utilise la même `as_of` que la seed INSEE RP 2021 (2021-01-01).
-- C'est l'ancre temporelle de référence pour les sondages d'aujourd'hui.
do $$
declare
  v_as_of date := '2021-01-01';
begin
  -- Purge des marges electorales pré-existantes à cette as_of.
  delete from public.survey_ref_marginal
    where as_of = v_as_of
      and dimension like 'past_vote_%';

  -- Pour chaque élection, insérer une marge par (candidat | abstention | blanc | nul).
  -- On ignore les lignes incomplètes (pct_exprimes null) — typique quand
  -- un scrutin n'a que le total votes/pct_inscrits mais pas pct_exprimes.
  insert into public.survey_ref_marginal (as_of, dimension, category, share, source_label, source_url)
  select
    v_as_of                                                                     as as_of,
    'past_vote_' || replace(e.slug, '-', '_')                                   as dimension,
    coalesce(er.candidate_name, er.list_label)                                  as category,
    round(
      (er.pct_exprimes::numeric / 100)
      * ((e.votants - coalesce(e.blancs, 0) - coalesce(e.nuls, 0))::numeric
         / nullif(e.inscrits, 0)),
      10
    )                                                                           as share,
    'Ministère de l''Intérieur'                                                 as source_label,
    e.source_url                                                                as source_url
  from public.election_result er
  join public.election e on e.id = er.election_id
  where (er.candidate_name is not null or er.list_label is not null)
    and er.pct_exprimes is not null
    and e.votants is not null
    and e.inscrits is not null
    and e.inscrits > 0;

  -- Abstention / blanc / nul par élection.
  insert into public.survey_ref_marginal (as_of, dimension, category, share, source_label, source_url)
  select
    v_as_of,
    'past_vote_' || replace(e.slug, '-', '_'),
    'abstention',
    round(((e.inscrits - e.votants)::numeric / nullif(e.inscrits, 0)), 10),
    'Ministère de l''Intérieur',
    e.source_url
  from public.election e
  where e.inscrits > 0 and e.votants > 0;

  insert into public.survey_ref_marginal (as_of, dimension, category, share, source_label, source_url)
  select
    v_as_of,
    'past_vote_' || replace(e.slug, '-', '_'),
    'blanc',
    round((coalesce(e.blancs, 0)::numeric / nullif(e.inscrits, 0)), 10),
    'Ministère de l''Intérieur',
    e.source_url
  from public.election e
  where e.inscrits > 0 and coalesce(e.blancs, 0) > 0;

  insert into public.survey_ref_marginal (as_of, dimension, category, share, source_label, source_url)
  select
    v_as_of,
    'past_vote_' || replace(e.slug, '-', '_'),
    'nul',
    round((coalesce(e.nuls, 0)::numeric / nullif(e.inscrits, 0)), 10),
    'Ministère de l''Intérieur',
    e.source_url
  from public.election e
  where e.inscrits > 0 and coalesce(e.nuls, 0) > 0;

  raise notice 'Election marginals seeded for as_of=%', v_as_of;
end $$;

commit;
