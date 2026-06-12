---
title: PRD Quality Review — PoliticoResto
reviewer: BMAD PRD rubric (7 dimensions)
date: 2026-06-12
prd: prd-politicoresto-2026-06-12/prd.md
---

## Overall verdict

This is an unusually strong chain-top PRD: the glossary is rich and consistently
exercised, the FR/UJ/SM ID system is contiguous and cross-referenced, the legal
park is a *documented decision* rather than a gap, and Non-Goals + counter-metrics
do real load-bearing work. The dominant weakness is **done-ness clarity**: a large
fraction of the 39 FRs describe *what* the system does but lack a single
*falsifiable* consequence — "redresse automatiquement", "détecte la fraude",
"agrégation", "transparence" sit at the spec-of-intent altitude, not the
spec-of-acceptance altitude UX/architecture/stories need. Secondary risk is
**open-items density at the green-light line**: several v1-critical mechanisms
(Trust-level→capability mapping, KYC "preuve d'électeur local", Nœud governance,
SM targets) are all simultaneously open, and three of them gate features that the
MVP scope lists as in-scope.

## 1. Decision-readiness — adequate

### Findings
- **[low]** Decisions are genuinely stated as decisions (§4.7 FR-27 "**Décision :**
  on garde la **Cote** ET un **Score de précision** … Les deux coexistent"; §8
  header records three resolved questions with date). This is exemplary — decisions
  are dated, the alternative ("retirer la cote") is named and rejected. *Fix:* none.
- **[medium]** Trade-offs are frequently stated without naming *what was given up*.
  §4.4 FR-13 "surface le **Score de précision** … **plutôt qu'un** karma" names the
  rejected alternative well; but §4.1 FR-4 "**pas d'algo opaque « pour toi »** en v1"
  states the rejection without the cost (lower engagement / cold-start feed quality)
  that was accepted in exchange. *Fix:* for the 3-4 highest-stakes design
  rejections (no "pour toi" feed, no toxicity classifier, vote final), add a
  one-clause "au prix de …" so downstream UX knows the tension it inherits.
- **[medium]** Several Open Questions are *parked* rather than *open* — fine — but
  Q2 ("Modèle économique … périmètre v1 de la rému") and Q3 (KYC modalities) are
  framed as open while §13 + FR-14 already build the rails. The reader cannot tell
  whether rému is in v1 scope or not. §6.1 lists "Compte certifié KYC" in scope but
  §6.2 lists "rémunération « qualité » (exploratoire)" out. *Fix:* state explicitly:
  "Certification + KYC capture ship v1; *payout* of any kind is deferred (Open Q2)."

## 2. Substance over theater — strong

### Findings
- **[low]** Personas are protagonist-driven and tied to JTBD, not demographic
  furniture — each UJ names a person, a friction, a climax, and (mostly) an edge
  case. No "innovation theater" section exists. *Fix:* none.
- **[low]** NFRs (§10) are concrete and testable-ish (default-deny RLS, WCAG 2.2 AA
  with 4.5:1 / 44×44, next-intl, Pino zero-console) and map to the project's actual
  CLAUDE.md constraints rather than boilerplate. *Fix:* none.
- **[medium]** The Vision (§1) and "Why Now" (§14) restate the brief almost
  verbatim ("boucle vertueuse", "la rigueur d'un institut, l'énergie d'un jeu",
  "plateforme de référence politique mondiale"). It is the one place where the PRD
  *duplicates* the brief it claims (§0) not to duplicate. Not harmful, but it is
  furniture. *Fix:* compress §1 to the thesis + the one differentiator (representativity
  as UI object), and cite the brief for the rest.

## 3. Strategic coherence — strong

### Findings
- **[low]** A real thesis exists and the features serve it: "pro polling tooling
  rendered fun + visible representativity" → FR-17..22 are its spine, and the
  3-pillar loop (Forum↔Pronos↔Sondages) is asserted as an IA principle (§12) and
  measured (SM-3). *Fix:* none.
- **[low]** Counter-metrics are present, named, and explicitly tied to what they
  counterbalance (SM-C1 outrage vs SM-3/5; SM-C2 faux-representatif vs SM-2; SM-C3
  entre-soi vs retention). This is the strongest counter-metric set I'd expect to
  see in a consumer PRD. *Fix:* none.
- **[medium]** SMs validate the thesis but several SMs reference FRs loosely. SM-3
  "Valide §IA + FR-25/18/1" cites "§IA" (informal) rather than §12; SM-4 "Valide
  FR-3/5" is right, but bridging (FR-5) carries an `[ASSUMPTION]` for its core
  signal — so the metric that proves the thesis depends on an unvalidated signal
  definition. *Fix:* make the bridging-signal definition a tracked Open Question,
  since SM-4 cannot be computed without it.
- **[medium]** No SM covers the entire UX-heavy left flank: Tables (FR-9..12),
  Graphe (FR-6..8), Boussole (FR-23/24), DM (FR-31), Onboarding (FR-34), i18n
  (FR-39), MCP (FR-38) have **no** success metric. For a launch-stakes PRD, "did
  Tables/Boussole get used" is unmeasured. *Fix:* add at least a Boussole-completion
  and a Table-creation/retention SM, or explicitly note these are not v1 success
  gates.

## 4. Done-ness clarity — thin

This is the dimension that most threatens downstream usefulness. Story creation
will stall on the FRs whose only consequence is a restatement of intent.

### Findings
- **[high]** Multiple FRs have **zero testable consequence** — the bullets restate
  the headline. §4.5 FR-22 Anti-fraude: "Détection bot/doublon + flags qualité
  (speeders, straight-lining)" names categories but no threshold, no observable
  outcome a test could assert; "réponses suspectes pondérées/exclues" — by what
  rule, observable where? §4.9 FR-31 DM: "Throttling/anti-spam" — unquantified.
  §4.10 FR-35 Notifications: "agrégation (« X et 4 autres »)" is the one testable
  bit; the rest is a coverage list. §4.13 FR-38 MCP: "Référencement … dans les
  registres" is not a system behavior. *Fix:* every FR needs ≥1 consequence phrased
  as an observable ("given X, the system shows/blocks/returns Y"). Sweep FR-22, 31,
  33, 35, 36, 38 first.
- **[high]** Pervasive soft-verbs that hide acceptance criteria. "**dégradation
  gracieuse**" (NFR-4, FR-28 fallback), "**transparence**" used as a consequence in
  FR-12/15/37/36, "**robuste**" (FR-28 "ticker simple et robuste"), "**ludique**"
  (FR-20 "affichés de façon ludique"), "**sans friction**" (§12). None of these are
  testable as written. FR-37 "traite avec **transparence**" → the *consequences*
  bullets do redeem it (motif + appeal + audit log), so the pattern is: headline
  vague, consequences sometimes rescue it, sometimes not. *Fix:* delete the soft
  word from the headline and let the consequence carry it; where no consequence
  exists (FR-28 "robuste", FR-20 "ludique"), add the falsifiable form (e.g. "le
  ticker rafraîchit ≤Ns; au-delà, affiche 'dernière MAJ HH:MM'").
- **[medium]** Good counter-examples exist and should be the template: FR-2 (alt-text
  required, single rich attachment XOR, facade click-to-load, OG snapshot at
  post-time → zero layout shift), FR-19 (snapshot written atomically with vote;
  incomplete profile accepted + flagged partial), FR-4 (focus moved to first new
  item + skip-link, WCAG 2.4.1). These are crisp and testable. *Fix:* hold every FR
  to the FR-2/FR-19 bar.
- **[medium]** Quantities hidden in `[ASSUMPTION]` are doing real spec work but are
  unconfirmed: threading depth "4-5 niveaux" (FR-1), score threshold "<40" (FR-20),
  "~30 thèses" (FR-23), slow-mode "≈10 s" (FR-29). These are testable numbers, which
  is good, but they ride into stories as assumptions. *Fix:* confirm or convert to
  Open Questions the ones that gate a story's acceptance (depth cap, score threshold).

## 5. Scope honesty — strong

### Findings
- **[low]** Non-Goals (§5) do real work and are mostly *invariants* not omissions:
  "Pas de jeu d'argent", "Pas de downvote public", "Pas de classifieur de toxicité
  comme juge". Each is referenced from the FRs/guardrails that enforce it. *Fix:* none.
- **[low]** `[NOTE FOR PM]` markers land at genuine tensions: §4.2 the Nœud-vs-Table
  distinction "Résout la question « tables thématiques » du brief" — this is exactly
  the open question the addendum (§B-bis) flagged, closed in the PRD. §6.2 "Replay
  vidéo — émotionnellement load-bearing; revisiter" honestly flags a cut that hurts.
  *Fix:* none.
- **[medium]** Open-items density is high for a green-light PRD. Counting: §8 has 7
  open questions; §9 indexes 11 assumptions; plus inline `[HYPOTHÈSE]` on all SM
  targets (§7) and on Monétisation (§13). Three open items gate **in-scope** v1
  features: Open Q3 (KYC "preuve d'électeur local") gates FR-14; Open Q4 (Trust-level
  mapping) gates FR-9/16 (who can create a Table at all); Open Q5 (Nœud governance)
  gates FR-6/7 dedup/anti-spam. A reader cannot green-light Tables or Certification
  to *build* without these. *Fix:* either pull the Trust-level→capability mapping and
  a minimal Nœud-dedup rule into this PRD (they are design, not legal, so not parked),
  or explicitly down-scope the dependent FRs to "v1 = creator-only Table, governance
  v1.1".
- **[medium]** The legal park is handled honestly (§0, §11.1, §6.2) and is correctly
  *not* counted as a gap. But it silently couples to scope: §6.1 lists "Compte
  certifié KYC" in scope while the *purpose* of certification (payout) is parked.
  Building KYC capture with no payout path risks speculative code (CLAUDE.md #10).
  *Fix:* state the v1 *use* of certification that is independent of payout
  (anti-fraude + redressement weight) so the build is justified without the parked
  rému.

## 6. Downstream usability — strong (one structural risk)

### Findings
- **[low]** Glossary (§3) is consistently exercised: capitalized defined terms
  (Nœud, Table, Sondage redressé, Consultation, Delta, Cote, Score de confiance,
  Bande, Cellule-quota, Trust level, Boussole, Thèse) reappear verbatim in the FRs,
  UJs and SMs. Consultation vs Sondage redressé is defined once and used as a
  first-class distinction in FR-18, §11.1, SM. *Fix:* none.
- **[low]** Every UJ has a named protagonist with a city/situation, climax, and (4
  of 6) an edge/resolution. UJ→FR mapping is bidirectional: FRs cite "Réalise UJ-n"
  and UJs are realized by named FRs. *Fix:* none.
- **[low]** FR IDs FR-1..FR-39 are contiguous, unique, no gaps, no dupes (verified
  per-section, see Mechanical notes). SM-1..6 + SM-C1..3 unique. UJ-1..6 unique.
  *Fix:* none.
- **[medium]** One glossary term drifts: "**Consultation**" (§3) = non-representative
  poll. In UJ-3 Marc "lance une **consultation** « êtes-vous d'accord… »" (lowercase,
  reads as the common noun) and FR-8 Fiche d'élu does not reference the poll type.
  Minor, but UX could mis-map. *Fix:* capitalize "Consultation" in UJ-3 or reword to
  the common verb to disambiguate from the defined term.
- **[medium]** Some cross-refs are informal and won't resolve mechanically: SM-3
  "Valide §IA" (no such anchor; §12 is "Information Architecture"); §4.5 references
  `docs/weighting-architecture.md` and FR-37 references "§4.12" (correct) but FR-5
  "voir §4.12" while §4.12 is the modération section (correct) — mixed quality.
  *Fix:* normalize internal refs to the §-number form (§12 not §IA) so the
  UX/architecture pass can follow them programmatically.
- **[medium]** Two referenced design docs are cited as if they exist and ground v1
  scope: `docs/weighting-architecture.md` (FR-16/§4.5/§4.7 base much "(existant)" on
  it) and `docs/pronos.md`, `docs/mcp.md`. The PRD asserts large swaths are
  "(existant)" leaning on these. If any cited doc is stale/absent, downstream
  architecture inherits a false floor. *Fix (verification task):* confirm those four
  docs exist and that the "(existant)" tags (FR-1 invariant, FR-19 on-conflict vote,
  FR-27 resolution, FR-34 onboarding, FR-38 MCP) match the actual repo before
  architecture starts.

## 7. Shape fit — strong

### Findings
- **[low]** Correct shape recognition: consumer multi-stakeholder + heavy UX → UJs
  are load-bearing and present (6, protagonist-driven), IA section (§12) and
  nav/discovery FRs (FR-32..35) carry the UX weight. *Fix:* none.
- **[medium]** Brownfield accuracy mostly good but unverified in-PRD. The PRD tags
  many behaviors "(existant)": FR-1 "invariant existant", FR-19 "`on conflict do
  nothing` … (existant)", FR-13 "`app_profile.declared_partisan_term_id`", FR-17
  "Manquent au schéma actuel : sexe, CSP, diplôme…", FR-38 "OAuth 2.1 Supabase + DCR"
  (existant). These align with the addendum §B inventory and CLAUDE.md's stated
  schema, so they're plausibly accurate — but the PRD also inherits the addendum's
  caution (CLAUDE.md #7: "Existing code is not evidence of necessity… verify actual
  usage"). The `space_role`/`space_status` residue is named (addendum) as the reuse
  candidate for Tables but the PRD's FR-9 does **not** mention reusing it. *Fix:* in
  FR-9, state the intended disposition of the legacy `space_role` enum (reuse vs
  replace) so architecture doesn't rediscover the pivot residue.
- **[low]** The frozen weighting worker is treated correctly as a fixed dependency
  (FR-20 "asynchrone (Worker)", §4.5 "S'appuie sur docs/weighting-architecture.md +
  Worker"), consistent with the Railway constraint in CLAUDE.md. *Fix:* none.

## Mechanical notes

**FR ID continuity (FR-1..FR-39).** Contiguous and unique. Per-section roll-up:
§4.1 FR-1..5; §4.2 FR-6..8; §4.3 FR-9..12; §4.4 FR-13..16; §4.5 FR-17..22; §4.6
FR-23..24; §4.7 FR-25..27; §4.8 FR-28..30; §4.9 FR-31; §4.10 FR-32..35; §4.11 FR-36;
§4.12 FR-37; §4.13 FR-38; §4.14 FR-39. **No gaps, no duplicates.** Total = 39, matches
the "~39 FRs across 14 feature groups" claim exactly (14 sub-sections §4.1–§4.14).

**UJ continuity.** UJ-1..UJ-6, unique, all named protagonists: Karim (UJ-1), Sophie
(UJ-2), Marc (UJ-3), Inès (UJ-4), Lucas (UJ-5), Léa (UJ-6). Edge/resolution present
on UJ-1, 2, 3, 4, 5; UJ-6 has resolution but no edge case. Each UJ is realized by ≥1
FR; each FR group cites the UJ(s) it serves.

**SM continuity.** SM-1..SM-6 (3 primary, 3 secondary) + SM-C1..SM-C3 counter-metrics.
Unique, no gaps. Every SM cites the FRs it validates **except** the validation of the
UX left-flank (Tables, Boussole, DM, Graphe, MCP, i18n) which no SM covers (see Dim 3).

**Assumptions index roundtrip (§9 ↔ inline `[ASSUMPTION]`).** §9 lists 11 assumptions.
Inline `[ASSUMPTION]` tags found: FR-1 (depth), FR-5 (bridging signal), FR-11 (pseudo),
FR-14 (preuve électeur), FR-16 (mapping), FR-18 (redressé default), FR-20 (seuil 40),
FR-23/24 (~30 thèses + positions curées), FR-28 (results source), FR-31 (DM 1:1),
FR-39 (FR+EN), FR-21 (ré-invitation v1/v2), FR-22 (certified accounts reinforce
filtering), FR-36 (MFA back-office). **Roundtrip gap:** FR-5's bridging-signal
assumption, FR-21's re-invitation assumption, FR-22's certified-signal assumption,
and FR-36's MFA assumption appear **inline but are NOT in the §9 index** — the index
under-counts (~14 inline vs 11 indexed). *Fix:* add FR-5, FR-21, FR-22, FR-36
assumptions to §9, or the index can't be trusted as the canonical list.

**Glossary drift.** One term: "Consultation" used lowercase as a common noun in UJ-3
(ambiguous vs the §3 defined term). All other defined terms used consistently and
capitalized. "Forum canonique" vs "Forums canoniques" — pluralization only, not drift.

**Cross-ref hygiene.** SM-3 cites "§IA" (no anchor; should be §12). Otherwise §-refs
(§4.12, §11, §5, §10, FR-n) resolve. Four external doc refs
(`docs/weighting-architecture.md`, `docs/pronos.md`, `docs/mcp.md`,
`docs/research/2026-06-12-*.md`) are cited as load-bearing for "(existant)" claims and
should be confirmed to exist before architecture relies on them.
