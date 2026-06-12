# Anti-patterns & dark patterns à éviter — PoliticoResto

> **Date :** 2026-06-12 · Demande Micky : « il y a peut-être des dark/anti-patterns
> UX que je n'ai pas identifiés — remonte-les ». Objectif produit : plateforme
> **hands-off, auto-organisée façon Reddit**. Ce doc liste les pièges et comment le
> design actuel les neutralise (ou pas encore). Sources : `docs/research/2026-06-12-
> state-of-the-art.md` et `…-ux-patterns.md` (citées).

## Tension de fond
**« Laisser les gens s'organiser librement » ne marche que si le substrat est bien
conçu.** En pur hands-off, la liberté est captée par les plus bruyants/coordonnés →
on **recrée Reddit** (modération biaisée, chambres d'écho, pile-ons), càd le problème
qu'on fuit. La réponse n'est pas « plus de modération à la main » mais **des
garde-fous structurels** (les règles du jeu) qui rendent l'auto-organisation saine
**par architecture**.

---

## A. Dark patterns (manipulation) — à NE PAS construire, même si les autres le font
| Anti-pattern | Pourquoi c'est toxique ici | Statut design |
|---|---|---|
| **Ranking à l'engagement/outrage** (modèle MAD) | récompense la colère, dégrade le débat | ✅ neutralisé : **ranking bridging**, pas l'engagement (FR-5) |
| **Infinite scroll + autoplay** | piège attentionnel sans fin/contrôle | ✅ **« charger plus »** + a11y (FR-4) |
| **Feed « voyeur »** (activité des autres, façon IG) | bombe de vie privée | ✅ notifs = **soi**, 2 onglets (FR-35) |
| **Notifs manipulatrices** (faux badges, fausse urgence, spam de ré-engagement) | dark pattern d'attention | ⚠️ à interdire explicitement : badge = état réel, pas d'urgence factice |
| **Roach motel** (facile d'entrer, dur de partir/supprimer le compte) | piège, surtout avec données KYC | ⚠️ à garantir : **suppression de compte + export** simples (RGPD-ready même si légal parqué) |
| **Privacy zuckering** (pousser à sur-partager l'opinion politique) | opinion = donnée sensible (Art. 9) | ✅ opt-in (flair), mode aveugle, certif optionnelle — **jamais public par défaut** |
| **Confirmshaming / forced continuity / coûts cachés** | manipulation à la conversion | ⚠️ pertinent quand le modèle éco s'active (sponsors) |
| **Pay-for-verification** | détruit l'actif « signal fiable » | ✅ macaron/vérifié **jamais vendus** (FR-15) |

## B. Échecs du modèle « auto-organisation façon Reddit » (les pièges de Reddit lui-même)
| Anti-pattern | Risque | Garde-fou |
|---|---|---|
| **Capture / biais des modérateurs** → chambres d'écho | recrée la censure que les « orphelins de Reddit » fuient | ⚠️ **partiel** : modération **transparente** (motif + appel, FR-37) ; à renforcer : limites de pouvoir des modos de Table, méta-modération |
| **Domination des méga-communautés** | quelques Tables/Nœuds écrasent les petits | ✅ tri par **vélocité + diversité**, pas nb de membres (FR-33) |
| **Brigading / manipulation de votes** | prises de contrôle coordonnées | ✅ détection de **coordination** (FR-37) ; ⚠️ pas de downvote public retire déjà l'arme |
| **Sockpuppets / astroturfing** | **critique en politique** (partis qui manipulent) | ✅ anti-fraude (FR-22), comptes certifiés ; ⚠️ surveiller le financement (transparence) |
| **Pile-on / dogpiling** sur les avis minoritaires | harcèlement de meute | ✅ **pas de downvote public** + réaction **delta** + emojis fermés (FR-3) |
| **Hostilité aux nouveaux / gatekeeping** (piège Stack Overflow) | les trust levels peuvent humilier les débutants | ⚠️ **trust levels = débloquer, jamais humilier** ; onboarding chaleureux (FR-34) — à garder en tête |
| **Goodhart / gaming** (karma farming) | optimiser la métrique, pas le débat | ✅ **pas de karma public** ; capacités, pas points (FR-16) ; counter-metrics (SM-C*) |
| **Chambres d'écho par auto-sélection** (tables thématiques/aveugles) | bulles | ✅ feed **bridging** + counter-metric **entre-soi** (SM-C3) |
| **Abus de l'anonymat** (mode aveugle) | bouclier à harcèlement | ✅ anonymat **d'affichage** : IDs réels côté serveur pour l'anti-abus (FR-11) |

## C. NOUVEAU risque introduit par « les nœuds créés par les utilisateurs »
La décision « le graphe se construit tout seul » ouvre des pièges **à cadrer (Open Q5
gouvernance des Nœuds)** :
- **Squat de namespace / usurpation** : un troll crée un faux Nœud « officiel » d'un
  parti/élu, ou un doublon trompeur. → **dédoublonnage** + **vérification d'entité**
  (FR-8) + macaron officiel distinctif (FR-15) + signalement.
- **Nœuds-spam / nœuds-poubelle** : prolifération de nœuds vides. → seuils (trust
  level pour créer ?), fusion de doublons, archivage des nœuds morts.
- **Nœuds-piège diffamatoires** (fiche d'élu = cible) : modération + sourcing requis.

## D. Anti-patterns spécifiques au produit « représentativité »
- **Survendre le redressement** (« faux robuste ») → ✅ ne jamais survendre + **counter-
  metric SM-C2** (faux représentatif) + toujours un intervalle.
- **Capture par les sponsors** (rému qualité → astroturfing) → ✅ **transparence du
  financement obligatoire** (modèle éco).
- **Confusion des badges de vérification** → ✅ 3 marqueurs distincts, sémantique claire,
  jamais vendus.

---

## Synthèse pour le PRD
Le fil rouge est cohérent : **on ne modère pas plus, on conçoit mieux le terrain.**
Les garde-fous déjà actés (pas de downvote, delta, bridging, emojis fermés, trust
levels-capacités, tri anti-méga, anonymat responsabilisé, transparence de modération,
counter-metrics) couvrent l'essentiel. **À renforcer / ouvrir explicitement :**
1. **Gouvernance des Nœuds** (squat/doublons/spam) — Open Q5.
2. **Limites de pouvoir des modérateurs de Table** + méta-modération (éviter la capture
   à la Reddit).
3. **Suppression/export de compte** sans friction (anti roach-motel, surtout KYC).
4. **Onboarding non-humiliant** (anti-gatekeeping Stack Overflow).
5. **Interdiction explicite** des notifs/badges manipulateurs.
