# State of the art — PoliticoResto (recherche préalable au PRD)

> **Date :** 2026-06-12 · **But :** base de preuves citée pour le Product Brief / PRD
> BMAD. Issue de 6 flux de recherche web parallèles. Chaque affirmation non
> triviale est sourcée par URL. Les features candidates sont taguées
> `[table-stakes]` / `[differentiator]` / `[advanced]`.
>
> **Cadrage produit (décisions utilisateur du 2026-06-12) :**
> - Dégeler **sondage + pronos** et **terminer le site**.
> - Élargir le périmètre via recherche (ci-dessous).
> - Nouveaux concepts demandés : **Tables** (sous-forums créables, mode
>   ouvert/anonyme = « discussion à l'aveugle »), **Soirées électorales**
>   (live), **i18n** (FR/EN dès le départ), **MCP public**, **Boussole /
>   candidat-match** (VAA).
> - **Juridique = parqué** : la domiciliation (pays/entité) n'est pas choisie ;
>   aucune feature n'est bloquée par la conformité. Les contraintes légales
>   sont **documentées** (annexe) et l'architecture reste **neutre vis-à-vis de
>   la juridiction** (données de référence paramétrables par pays).

---

## 1. Sondage en ligne redressé (le cœur « pro »)

Le problème partagé avec les acteurs pro : un échantillon **auto-sélectionné,
non aléatoire** (les votants du forum) qu'il faut transformer en estimation
représentative.

- **Raking / IPF** (le défaut de l'industrie — Pew, Morning Consult) : on aligne
  l'échantillon sur des marges de population connues (âge, sexe, région,
  diplôme, parfois vote passé) par ajustement itératif des poids.
  [Pew — weighting methods](https://www.pewresearch.org/methods/2018/01/26/how-different-weighting-methods-work/) ·
  [Morning Consult](https://pro.morningconsult.com/articles/how-morning-consult-weights-u-s-voter-survey-data)
- **Le redressement corrige la représentativité, jamais le biais de mesure.**
  Pew : ajouter des variables politiques au rake réduit la *variance* mais le
  biais résiduel reste ~6,3 pts.
  [Pew — what matters most](https://www.pewresearch.org/methods/2018/01/26/for-weighting-online-opt-in-samples-what-matters-most/)
- **MRP** (Multilevel Regression with Poststratification — YouGov) : régression
  multiniveau + poststratification sur une trame de population → estimations
  **sous-nationales stables** (circonscription) qu'un rake ne peut pas produire.
  Coût : modélisation lourde, sensible à la mauvaise spécification.
  [YouGov MRP](https://today.yougov.com/politics/articles/50587-how-yougov-mrp-model-works-2024-presidential-congressional-elections-polling-methodology) ·
  [MRP — Wikipedia](https://en.wikipedia.org/wiki/Multilevel_regression_with_poststratification)
- **Civey = le précédent le plus proche.** River sampling (sondages embarqués
  sur des sites de presse, n'importe quel visiteur répond — exactement « tout le
  monde vote sur le forum »). Recette : (1) **sur-collecter** (~5× le pool),
  (2) **sous-échantillonner à quota**, (3) **pondérer** — et être transparent.
  [Civey](https://medium.com/rewrite-tech/janina-m%C3%BCtze-civey-our-purpose-is-to-understand-peoples-opinion-better-75408e21d439) ·
  [critique académique (arXiv)](https://arxiv.org/pdf/2109.12069)
- **Communiquer l'incertitude.** La marge d'erreur doit refléter le poids via le
  **design effect** (`deff ≈ 1 + CV²(poids)`), pas un √n naïf. YouGov publie des
  **intervalles crédibles à 90 %** ; Pew affiche des **barres d'erreur 95 %**
  pour décourager la sur-confiance.
  [Pew — variabilité](https://www.pewresearch.org/methods/2018/01/26/variability-of-survey-estimates/) ·
  [Pew — barres d'erreur](https://www.pewresearch.org/decoded/2025/09/16/understanding-error-bars-in-charts/)

**Note repo :** le design `docs/weighting-architecture.md` existant
(calibration **Deville-Särndal** via `samplics`, bornes `[0.5, 2.0]`, score de
confiance 0–100 en 4 composantes Kish/coverage/variability/concentration, worker
Python) est **cohérent avec l'état de l'art** et déjà très abouti. La vue
`v_post_poll_summary` expose déjà le contrat (colonnes à 0 aujourd'hui).

**Features candidates :**
- Capter les covariables de redressement à l'inscription (tranche d'âge, sexe,
  région/code postal, diplôme). `[table-stakes]`
- Raking/IPF contre marges INSEE + croisements, recalculé par sondage. `[table-stakes]`
- **MoE pondérée incluant le design effect** (pas √n). `[table-stakes]`
- **Intervalle de confiance / barre d'erreur visible sur chaque résultat publié.** `[differentiator]`
- **Sous-échantillonnage à quota façon Civey** quand une cellule déborde. `[differentiator]`
- Pipeline **MRP** pour les ventilations région/département. `[advanced]`
- **Badge qualité par résultat** (n, deff, cellules fines exposées au lecteur). `[advanced]`

---

## 2. Moteur de questionnaire / sondage

Benchmark Qualtrics / SurveyMonkey / Typeform / LimeSurvey.

- **Types de questions** : choix simple/multiple, **échelle de Likert**, matrice,
  classement, **slider** (intensité), texte libre, **0–10 (NPS)**.
  [Qualtrics A–Z](https://www.qualtrics.com/support/survey-platform/getting-started/qualtrics-topics-a-z/) ·
  [SurveyMonkey](https://help.surveymonkey.com/en/surveymonkey/create/question-types/)
- **Logique** : display / skip / branch (router selon réponses, profil,
  quota). [Qualtrics logic](https://www.qualtrics.com/support/survey-platform/survey-module/using-logic/)
- **Quotas** : compter les répondants d'une condition → fermer la cellule /
  écran de sortie / marquer over-quota. [Qualtrics quotas](https://www.qualtrics.com/support/survey-platform/survey-module/survey-tools/quotas/)
- **Anti-fraude = existentiel pour un sondage internet public** : détection
  multi-soumission, **bot (reCAPTCHA + comportemental)**, doublons ; flags
  qualité (>30 % de questions sautées, charabia, straight-lining, speeders).
  [Qualtrics fraud](https://www.qualtrics.com/support/survey-platform/survey-module/survey-checker/fraud-detection/) ·
  [Qualtrics response quality](https://www.qualtrics.com/support/survey-platform/survey-module/survey-checker/response-quality/)

**Features candidates :** types Likert/matrice/classement/slider/0–10
`[table-stakes]` · logique conditionnelle (réponses + profil) `[table-stakes]` ·
quotas qui ferment/dépondèrent une cellule `[differentiator]` ·
détection bot/doublon + flags qualité `[table-stakes]` · score qualité par
réponse alimentant l'exclusion/pondération `[advanced]`.

---

## 3. Caractérisation politique (VAA / boussole / « candidat qui me ressemble »)

Trois philosophies de scoring — à choisir délibérément.

- **(a) Wahl-O-Mat — accord symétrique aux thèses (le plus simple, le plus
  défendable).** 38 thèses ; accord/neutre/désaccord ; score `2 / 1 / 0` sommé
  par parti ; possibilité de **doubler le poids** des thèses « qui comptent ».
  Curation statistique rigoureuse (≈100 → 38, items les plus discriminants).
  [Wahl-O-Mat facts (HHU)](https://www.sozwiss.hhu.de/en/institut/abteilungen/politikwissenschaft/politik-ii/prof-dr-stefan-marschall/forschungsprojekte/wahl-o-mat-research/facts-about-the-wahl-o-mat)
- **(b) Political Compass / quadrant 2D** — intuitif visuel ; axe économique
  gauche↔droite + axe social libertaire↔autoritaire. Scoring **opaque** (critique
  connue). [Political Compass — Wikipedia](https://en.wikipedia.org/wiki/The_Political_Compass)
- **(c) Kieskompas / Boussole — positionnement expert + sourcé (le plus
  crédible).** Axes socio-économique × culturel ; partis positionnés par
  **méthode hybride** (experts + analyse des programmes + auto-placement), et
  **chaque position justifiée par une citation sourcée** inspectable. C'est ce
  qui distingue d'un simple quiz.
  [Springer — calibrating parties](https://link.springer.com/article/10.1007/s11135-013-9846-0) ·
  [Boussole présidentielle (Sciences Po)](https://www.sciencespo.fr/actualites/actualit%C3%A9s/la-boussole-pr%C3%A9sidentielle-une-arme-contre-l%E2%80%99ind%C3%A9cision/2927)
- **(d) iSideWith — pondération par « passion » + « confiance/conviction »**
  (pénalise les revirements). [iSideWith FAQ](https://www.isidewith.com/faqs/)

**Recommandation produit :** démarrer sur le **scoring transparent 2/1/0 de
Wahl-O-Mat**, ajouter une **visualisation 2D** (axes FR : économique × culturel,
pas lib/auth US) pour l'UX, et réserver le **positionnement expert sourcé**
(Boussole) comme montée en crédibilité. Double-poids « ça compte pour moi »
`[differentiator]`. Pipeline de curation statistique des thèses `[advanced]`.

**Axes FR pertinents** (Sciences Po / Cautrès) : économique (interventionnisme↔
libéralisme) × culturel (progressisme↔conservatisme : autorité, mœurs,
immigration, écologie, UE).
[Émile — Cautrès](https://www.emilemagazine.fr/article/2025/1/9/bruno-cautres-les-questions-culturelles-ont-tendu-le-paysage-politique-franais-vers-davantage-de-polarisation)

---

## 4. Représentativité & invitation ciblée (produire l'échantillon)

- **Quotas à strates fines** : Morning Consult échantillonne sur **600+ strates**
  (âge × genre × diplôme × langue). [Morning Consult](https://pro.morningconsult.com/our-methodology)
- **Boosting ciblé en cours de collecte** : solliciter activement le sous-groupe
  en retard (multi-canal) plutôt qu'attendre.
  [Healthy NYC (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9879422/)
- **Arbitrage représentativité ↔ qualité bien réel** : les quotas montent la
  représentativité mais peuvent baisser la validité → il faut **quotas + filtrage
  qualité**, pas l'un sans l'autre.
  [Representativeness vs response quality](https://www.researchgate.net/publication/380128870_Representativeness_versus_Response_Quality_Assessing_Nine_Opt-In_Online_Survey_Samples)

**Features candidates :** dashboard de cellules-quotas (cible vs rempli) +
**score de représentativité live** `[differentiator]` · **ré-invitation ciblée**
(« il nous manque des 18-24 femmes en Bretagne ») `[differentiator]` · nudge
gamifié « compléter le tableau » `[advanced]` · quota **+** filtrage qualité `[table-stakes]`.

---

## 5. Pronos — scoring & frontière jeu d'argent

**Scoring (proper scoring rules, sans argent) :**
- **Brier** (0–1, plus bas = mieux), **log-loss** (strictement propre, local),
  **calibration** (reliability diagram, diagonale 45°).
  [Brier — Wikipedia](https://en.wikipedia.org/wiki/Brier_score) ·
  [Gneiting & Raftery](https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf)
- **Metaculus** : baseline score + **peer score** (relatif aux autres, somme nulle).
  [Metaculus scores](https://www.metaculus.com/help/scores-faq/)
- **Manifold (Mana, play-money)** : **pas du gambling** (pas de valeur cash → pas
  de « consideration »). [Manifold review](https://cryptonews.com/cryptocurrency/manifold-markets-review/)

**Frontière légale FR (parqué, mais structurant pour le design) :**
- **Art. L320-1 (Code sécurité intérieure)** : un jeu d'argent =
  **3 éléments cumulatifs** — *sacrifice financier (mise)* + *espérance de gain*
  + *hasard*. **La France n'exempte PAS les jeux d'adresse.**
  [L320-1 (Légifrance)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000025503132/LEGISCTA000025505690/)
- **Conséquence design : sans mise (sacrifice financier), on sort de la
  définition.** Les concours de pronostics **gratuits** (pas de mise, pas de
  coût) sont **légaux** (art. L121-20 Code conso), sous réserve de label « gratuit
  sans obligation d'achat ». [reglementdejeu](https://www.reglementdejeu.com/jeux-concours/legislation.html)
- ⚠️ **« Mise » interprétée largement** (argent, crypto, **données perso**,
  cosmétiques). Un prono « gratuit » doit l'être réellement. ⚠️ L'**ANJ (fév.
  2026)** considère les *prediction markets* (à mise) **illégaux** en France ;
  un prix de valeur peut basculer en loterie.
  [ANJ — prediction markets illégaux](https://anj.fr/prediction-market-platforms-illegal-france-and-potentially-risky-users)

→ **Le design pronos « sans argent, classement de précision seul, pas de prix
monétaire » est sur de bonnes bases** (indépendant de la juridiction). Garder le
**score de précision** (Brier/peer) plutôt qu'un multiplicateur « cote » qui
mime un pari.

---

## 6. Débat sain : délibération, modération, réputation

**Plateformes civiques :**
- **Pol.is / vTaiwan** : on soumet des affirmations courtes, on vote
  agree/disagree/pass ; clustering (PCA + k-means) → **points de consensus** et
  **bridge statements**. **Pas de reply** → pas d'escalade personnelle.
  [Pol.is](https://en.wikipedia.org/wiki/Pol.is) ·
  [vTaiwan](https://congress.crowd.law/case-vtaiwan.html)
- **Decidim / Loomio** : étapes délibératives explicites, amendement, **veto/
  block** qui force la négociation, suivi d'accountability. [Decidim](https://decidim.org/features/)
- **Kialo** : **arbres d'arguments** pro/con — les arguments faibles deviennent
  visibles, freine le gish-gallop. [Kialo](https://en.wikipedia.org/wiki/Kialo)
- **Bridging-based ranking (Ovadya)** : classer pour **réduire la division**, pas
  l'engagement. Le défi Prosocial Ranking montre : **bridging + downrank toxique**
  ensemble réduisent la polarisation affective ; le bridging seul ne suffit pas.
  [Belfer — bridging ranking](https://www.belfercenter.org/publication/bridging-based-ranking) ·
  [Prosocial Ranking Challenge](https://arxiv.org/html/2603.19626)
- **Steel-manning / test de Turing idéologique** : la polarisation est surtout
  **affective** (on se comprend mais on se déteste) → récompenser la
  reformulation charitable. [Ideological Turing Test (2025)](https://onlinelibrary.wiley.com/doi/10.1111/cogs.70126)

**Modération & intégrité :**
- **Anti-brigading / sockpuppet / CIB** : détection par **coordination**
  (timing, IP, graphe), pas par texte seul. Les campagnes « low-and-slow »
  échappent au seuil. [Coordinated behavior survey](https://arxiv.org/pdf/2408.01257)
- **Classifieurs de toxicité (Perspective) = biaisés** (sur-flag les termes
  d'identité, l'AAVE ; sunset 2026). **Ne pas s'y fier seul** pour du discours
  politique. [AlgorithmWatch](https://algorithmwatch.org/en/automated-moderation-perspective-bias/)
- **Community Notes (bridging)** : utile mais **lent** (24-48 h), **~12 %** des
  notes publiées, sous-modère le contenu polarisant **par design**.
  [From Birdwatch to Community Notes](https://arxiv.org/html/2510.09585v2)
- **Transparence** : principes **Santa Clara** + **DSA** (notice-and-action,
  statement of reasons, appels). [Santa Clara](https://santaclaraprinciples.org/) ·
  [DSA](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act)

**Réputation & engagement :**
- **Discourse trust levels (TL0-TL4)** : on **débloque des capacités** (dont la
  modération) en prouvant sa fiabilité — bat le **karma-vanité** de Reddit
  (farmable, sans garde-fou qualité).
  [Discourse trust levels](https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/)
- **Goodhart** : « quand une mesure devient une cible, elle cesse d'être une
  bonne mesure » → ne pas tout réduire à un score unique.
- **Modèle MAD (Brady-Crockett)** : le contenu moral-émotionnel (surtout la
  colère) est sur-partagé ; les plateformes **apprennent** à l'amplifier. →
  optimiser pour la **qualité délibérative**, pas la chaleur.
  [MAD model](https://journals.sagepub.com/doi/10.1177/1745691620917336)

**Principe directeur PoliticoResto :** *aucune mécanique seule ne règle la
toxicité.* Empiler : **structure délibérative** + **ranking bridging (pas
l'engagement)** + **modération forte + gates de confiance progressifs (Discourse)**
+ **transparence des décisions**. L'anonymat (mode « table aveugle ») n'est PAS
le moteur principal de toxicité — c'est l'amplification algorithmique + le
threading qui le sont ; donc anonymat OK **si** ranking + modération tiennent.

---

## 7. Catalogue de features consolidé (par epic)

| Epic | Feature | Tag |
|---|---|---|
| **Tables** (sous-forums) | Créer une table, rôles, mode **ouvert / aveugle (anonyme)** | core |
| Tables | Modération déléguée par table (trust levels Discourse-like) | `[differentiator]` |
| Tables | Anti-brigading / détection coordination par table | `[advanced]` |
| **Sondage pro** | Covariables de redressement au signup + redressement raking/INSEE | `[table-stakes]` |
| Sondage pro | MoE avec design-effect + **intervalle visible** sur chaque résultat | `[table-stakes]` |
| Sondage pro | Anti-fraude (bot/doublon) + flags qualité | `[table-stakes]` |
| Sondage pro | Quota sub-sampling (Civey) + dashboard représentativité | `[differentiator]` |
| Sondage pro | Ventilations MRP région/dépt | `[advanced]` |
| Sondage pro | Distinction **sondage (revendique représentatif) vs consultation/jeu** | `[differentiator]` |
| **Boussole / candidat-match** | Quiz thèses, scoring transparent **2/1/0**, match candidat/parti | core |
| Boussole | Double-poids « ça compte pour moi » | `[differentiator]` |
| Boussole | Visualisation 2D (économique × culturel) | `[differentiator]` |
| Boussole | Positions partis **sourcées** (citation inspectable) | `[advanced]` |
| **Pronos** | Demande → validation → paris → résolution, **score de précision (Brier/peer)** | core |
| Pronos | Leaderboard + **calibration** (reliability diagram perso) | `[differentiator]` |
| Pronos | **Sans mise / sans prix monétaire** (label gratuit) | core (contrainte design) |
| **Soirées électorales** | Live results (Supabase Realtime) + fil commentaires live | core |
| Soirées | Résolution pronos en direct + sondage live | `[differentiator]` |
| Soirées | Replay vidéo | `[advanced]` (roadmap post-v1) |
| **Modération/réputation** | Trust levels progressifs, flagging hors-thread | `[differentiator]` |
| Modération | **Bridging-based ranking** du feed (pas l'engagement) | `[advanced]` |
| Modération | Community-notes-like (vérification cross-partisane) | `[advanced]` |
| **i18n** | next-intl, FR/EN, messages typés, routing localisé | core (prérequis transverse) |
| **MCP public** | Étendre les outils (sondage/prono/table) + référencer registries | core |

---

## 8. Takeaways structurants (à porter dans le PRD)

1. **Civey est le précédent** : sur-collecter → sous-échantillonner à quota →
   pondérer → être transparent. Le design `weighting-architecture.md` du repo est
   aligné.
2. **Ne jamais survendre le redressement** : il corrige la représentativité, pas
   le biais de mesure (Pew).
3. **Toujours livrer un intervalle, jamais un nombre nu** (design-effect-aware).
   Peu coûteux, fort différenciateur de confiance.
4. **L'anti-fraude/bot est existentiel** pour un sondage internet public.
5. **VAA** : démarrer transparent (Wahl-O-Mat 2/1/0) + compas 2D, monter en
   crédibilité avec positions sourcées (Boussole).
6. **Pronos sans mise = hors champ jeux d'argent** ; garder un **score de
   précision**, pas une cote/multiplicateur qui mime un pari.
7. **Débat sain = empilement** (structure + bridging + modération + trust levels),
   jamais une mécanique unique.
8. **Réputation : débloquer des capacités (Discourse), pas des points-vanité
   (Goodhart).**

---

## Annexe — Contraintes légales (PARQUÉES : domiciliation non décidée)

> Documentées pour ne pas être surprises plus tard ; **non bloquantes**
> aujourd'hui ; à revisiter une fois le pays/entité choisi. L'architecture reste
> neutre vis-à-vis de la juridiction.

- **RGPD Art. 9** — les **opinions politiques sont des données sensibles** ;
  traitement interdit par défaut, **consentement explicite** requis. Inférer
  l'orientation depuis le comportement = aussi de la donnée sensible (EDPB
  8/2020). **DPIA obligatoire** pour traitement à grande échelle (Art. 35).
  [Art. 9](https://gdpr-info.eu/art-9-gdpr/) ·
  [EDPB 8/2020](https://www.edpb.europa.eu/system/files/2021-04/edpb_guidelines_082020_on_the_targeting_of_social_media_users_en.pdf)
- **Règlement UE 2024/900** (oct. 2025) — interdit la donnée sensible pour le
  **ciblage publicitaire politique**, **même avec consentement**.
  [EUR-Lex 2024/900](https://eur-lex.europa.eu/eli/reg/2024/900/oj/eng)
- **CNIL** — sanctions politiques 2024-2025 ; minimisation, sécurité (Art. 32),
  pseudonymisation. [CNIL 2025](https://www.cnil.fr/en/sanctions-and-corrective-measures-cnils-actions-2025)
- **Commission des sondages (Loi 77-808)** — si un résultat est **publié comme
  représentatif** sur un sujet électoral, mentions obligatoires (organisme,
  commanditaire, n, dates, texte des questions, MoE, notice) + **interdiction de
  publication la veille/jour du vote**. → Modéliser ces **mentions comme données
  structurées** et **distinguer sondage vs jeu** dès le schéma.
  [Commission des sondages](https://www.commission-des-sondages.fr/oblig/obligations.htm)
- **Jeux d'argent (L320-1 / ANJ)** — pronos **sans mise** = hors champ ;
  *prediction markets* à mise = illégaux en FR.
- **DSA** — notice-and-action, statement of reasons, appels (modération).

**Implication d'architecture (à faire dès maintenant, sans dépendre du droit) :**
modéliser les données de référence (marges INSEE, élections, axes) **par
pays/locale**, et la distinction **sondage représentatif vs consultation/jeu**
en first-class, pour que le choix de juridiction soit un paramètre, pas une
réécriture.
