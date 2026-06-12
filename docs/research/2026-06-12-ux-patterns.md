# UX patterns — réseaux sociaux modernes appliqués à PoliticoResto

> **Date :** 2026-06-12 · Recherche UX pour le PRD (phase UX). Directive Micky :
> *« copier la simplicité et l'efficacité des réseaux sociaux modernes »*,
> mobile-first. Stack réelle : Next.js 16 (RSC), Tailwind v4.1, `@base-ui/react`,
> Catalyst. Sources citées en bas. *(Couvre les fondations de design system ;
> navigation/feed/composer/interactions à compléter — autres agents UX en méta.)*

## Principe directeur
Ce qui rend X/Threads/Instagram « rapides et simples » = **la retenue** (peu
d'éléments, un seul accent, layout prévisible) + **vitesse perçue** (UI optimiste,
skeletons, prefetch). La rigueur statistique de PoliticoResto se cache derrière une
UX familière et sobre.

## Spec sheet (à porter au PRD / design system)

| Token | Valeur | Source |
|---|---|---|
| Spacing base | 4px (`--spacing` Tailwind par défaut) — **supprimer** les vars custom `--spacing-compact/base/section` (résidu) | Tailwind theme |
| Échelle typo | corps 15px/1.5 · méta 13px · titre 18px (`text-lg`) · heading 20-24px — **4 rôles, pas plus** | Tailwind font-size / X·Threads |
| Carte | bord 1px, rayon **8px** (`--radius: 0.5rem`, garder), **ombre au hover seulement** (pas au repos) | convention X/Reddit |
| Réponses (thread) | **dividers plats**, pas de cartes imbriquées | X/Threads |
| Base sombre | gris ~`#101216` (**pas** noir pur), texte off-white ; vrai noir = opt-in OLED | Uxcel |
| Dark mode | variante `.dark` (class) + `prefers-color-scheme` par défaut + toggle persistant (light/dark/system) | design.dev |
| Motion micro | 120-150ms ease-out (hover, focus, like/react) | Val Head |
| Motion composant | 200ms ease-out (dropdown, popover) | Material 3 |
| Motion overlay | entrée 250-300ms / sortie 150-200ms ease-out (asymétrique) | appypie |
| Reduced motion | kill-switch global `prefers-reduced-motion: reduce` (corrige aussi `scroll-smooth`) | NN/g |
| Contraste texte | 4.5:1 corps / 3:1 large | W3C 1.4.3 |
| Contraste UI/icône/ring | 3:1 (1.4.11) | W3C 1.4.11 |
| Cible tactile | **44×44px** (HIG) ; plancher WCAG 24×24 (2.5.8) | W3C 2.5.8 |
| Focus | `:focus-visible` ring 2px, ≥3:1, non masqué par barres sticky (2.4.11) | W3C 2.4.11 |
| Primitives | **Base UI + Catalyst** pour tout composant interactif (a11y géré) — ne pas réinventer | Base UI / Catalyst |
| Perf perçue | `useOptimistic` sur le hot path + skeletons RSC (`loading.tsx`) + prefetch `<Link>` | Simon Hearne / Onething |

## Recommandations par zone
- **Cartes vs dividers** : PoliticoResto = contenu hétérogène (sondages, boussole,
  pronos embarqués) → **cartes légères** (façon Reddit) au niveau feed, **dividers
  plats** dans un fil de réponses (éviter cartes-dans-cartes = bruit #1).
- **Vitesse perçue (déjà à moitié en place)** : CLAUDE.md note que la latence de
  vote a été tuée avec `useOptimistic`. **Généraliser** : réactions, votes de
  sondage, picks de pronos, join-table → flip optimiste dans la même frame,
  réconciliation serveur. Skeletons post-shaped, pas spinners. Prefetch `<Link>`.
- **Retenue chromatique** : un seul accent (`--primary` bleu, déjà commité dans
  `globals.css`), gris neutres partout ailleurs. *C'est* la « simplicité ».

## Trois actions repo impliquées (pour plus tard, phase implémentation)
1. **Supprimer** les 3 vars custom `--spacing-compact/base/section` (= 8/12/24px =
   `space-2/3/6` natifs).
2. **Ajouter** la palette sombre + variante `.dark` + `color-scheme: light dark`
   (dark mode non construit aujourd'hui).
3. **Ajouter** le kill-switch `prefers-reduced-motion` (corrige le `scroll-smooth`
   non gardé actuel).

## Navigation & feed
- **Mobile : bottom tab bar** (~5 destinations) ; l'onglet **loupe = surface
  Explorer/Découverte** (ne pas en faire deux). **Desktop : 3 colonnes** (rail
  gauche communautés / feed / rail droit reco). Action **Créer** persistante.
- **Feed = cartes légères** (contenu hétérogène : sondages, boussole, pronos),
  **dividers plats** dans un fil de réponses. Skeletons post-shaped, prefetch.
- **Tri = sorts nommés transparents** (Populaire/Hot · Nouveau · Top par fenêtre),
  **pas d'algo « pour toi » opaque** en v1 (cohérent avec la confiance civique et
  l'anti-enterrement). Repo déjà shapé (`last_activity_at` + `editorial_feed_rank`).
- **Pagination = bouton « Charger plus »** (pas d'infinite-scroll auto) : meilleur
  pour une tâche (comparer des arguments) + a11y (WCAG 2.1.1/2.4.1). **Déjà le
  pattern repo** (`post-feed.tsx` + `/api/feed?cursor=`). Combler : focus sur le
  1er nouvel item au chargement + skip-link au-delà du feed. Densité : un seul
  toggle confortable/compact suffit.

## Composer (deux archétypes, pas un)
- **Réponses/commentaires → modal/sheet** (corps seul, ouverture < 1 s).
- **Nouveau thread/post de table → page** `/(table)/submit` avec **onglets de
  type** façon Reddit : **Discussion · Sondage · Lien**.
- **Sondage dans le composer = swap façon X** (icône sondage pair de l'icône
  média ; **sondage XOR média** → pas d'encombrement). Pour nos sondages
  **redressés** : afficher durée + « vote final » près des options.
- **Éditeur** : rich-text par défaut + **toggle markdown** (library-first, pas de
  contenteditable maison). **Unfurl** auto au collage, **rendu en vrai `<a>`**,
  re-dérivé à l'édition (éviter les bugs Bluesky). Whitelist YouTube/médias.
- **Identité du posteur visible dans le composer** — bannière explicite
  « Vous postez anonymement dans [table] » en mode aveugle (T&S critique).

## Interactions — **décision de design forte (à valider au PRD)**
- **Upvote seul pour le ranking, PAS de downvote public** (le downvote =
  « bouton désaccord » → suppression des minorités = pire échec pour un débat
  représentatif). Démotion = **signalement privé**, pas un compteur public.
- **Réaction phare « ça m'a fait changer d'avis / réfléchir » (delta façon
  r/changemyview)** — récompense le fait de faire bouger les lignes, pas
  l'applaudissement. Tally par profil. **C'est le différenciateur « débat sain ».**
- **Set d'emojis fermé (5-7 : d'accord / pas d'accord / source ? / bien argumenté…)**
  — jamais de palette ouverte (vecteur de brigading). « Pas d'accord » nommé et
  neutre > downvote anonyme.
- **Threading niché + collapse, cap ~4-5 niveaux + « continuer le fil → »**.
- **Optimiste partout** (`useOptimistic`, déjà le pattern repo). Bookmark + share
  = actions secondaires.

## Communautés / Tables
- **Onglet « Explorer les tables »** (Reddit Discover, **localisé FR**) : « près de
  chez vous » (postal→ville déjà en base) / « national » / « recommandées ».
- **Header** : bannière + icône + description + nb membres + **bouton Join/Leave
  unique** + cloche notifs. **Preview avant de rejoindre** (règles + fils récents
  visibles non-membre, façon Discord).
- **Anonyme = mode STRUCTUREL, pas un sticker** : suppression avatars/pseudo
  persistant, **pseudo auto par fil**, bannière composer. Tag « anonyme » lisible
  **avant** d'entrer. **Pas** de member-list live façon Discord (ne scale pas) →
  « X membres · Y actifs cette semaine ».

## Profil & identité — **3 marqueurs (alignés sur le brief)**
- **Macaron officiel (gris, avatar carré)** = partis/élus/institutions, émis par
  la plateforme, **jamais vendu**. *(= « comptes officiels » du brief.)*
- **Vérifié (bleu)** = **compte certifié** (identité/éligibilité électeur). *(= KYC
  du brief.)*
- **Badge d'affiliation (mini-avatar, façon Bluesky, tap = qui a vérifié)**.
- **Jamais vendre la vérification** (sinon l'actif « signal politique fiable »
  s'effondre — l'inverse du blue tick payant de X). **Principe produit dur.**
- **Réputation = trust levels Discourse** (déblocage **silencieux de capacités**,
  perdable ; **pas** de score karma public en v1).
- **Boussole/compass en flair opt-in, scoped par table** (affichable dans une
  table de débat, masqué ailleurs, **supprimé en table anonyme**). *(= « flair
  parti » du brief, enrichi.)* Surfacer le **palmarès de pronos** (% précision —
  épistémiquement utile) plutôt que du karma. **Labelliser bots/parodie.**

## Notifications & temps réel (soirées électorales)
- **Centre de notifs : 2 onglets** (Toutes / Mentions), **agrégation agressive**
  (« Marie et 4 autres ont réagi »), badge plafonné 9+ puis point.
- **Soirée électorale : modes de modération du chat D'ABORD** (façon Twitch :
  slow mode ~10 s en pic, emote/reaction-only, members-only), typing throttlé
  ~2 s. **Résultats : ticker simple/robuste + fallback** (la « needle » NYT est
  le truc le plus fragile à shipper le soir le plus chargé). Engagement interactif
  via **sondages live dans le chat** (nos RPC sondage existants).

## Onboarding & découverte
- **Google One Tap** (cohérent avec l'auth Google-only), **username-only +
  progressive profiling** (déjà décidé), chaque prompt ≤ 2 questions reliées à un
  bénéfice (« réponds pour que ton vote compte dans les sondages représentatifs »).
- **« Tables packs » (façon Bluesky Starter Packs)** : à l'arrivée, choisir 2-4
  centres d'intérêt → **rejoindre en un tap un bundle de tables + feed seedé**
  (tue le « feed vide → rebond »). **Chaque empty state = 1 CTA**, jamais de mur vide.
- **Recherche** : barre top (desktop) / onglet loupe (mobile) ; **3 segments
  Débats / Tables / Membres** ; tendances **fenêtrées dans le temps** ; **contrer
  le biais méga-communautés** (pondérer par vélocité d'activité + diversité des
  contributeurs, pas le nb de membres brut).

## Layout & médias inline (specs concrètes, repo-actionnables)
- **Bottom tab bar mobile (5 max, labellisés, scroll-to-top au re-tap)** :
  **Accueil · Explorer · ➕ Créer (centre) · Activité · Profil**. Convention
  Threads/Reddit (Créer au centre car poster = verbe cœur d'un forum).
- **Desktop 3 colonnes** : **rail gauche** (feeds Accueil/Populaire + Favoris +
  Récents + tables jointes + « Explorer ») · **centre** (onglets *Pour toi /
  Suivis / Récent* + composer inline) · **rail droit** « À propos de la table »
  (description, règles, nb membres, modérateurs — façon Reddit). **Créer** =
  bouton persistant rail gauche + composer inline ; depuis l'Accueil, **forcer le
  choix de la table cible** (pas de post hors-contexte). Séparer les deux
  switchers : onglets de mode (haut du feed) vs switcher de tables (rail gauche).
- **Médias inline** : **snapshot OG au post-time côté serveur** (titre/desc/image
  + **dimensions**) plutôt que re-fetch par render (cohérence + privacy + perf +
  zéro CLS). **Un seul attachement riche par post** (média XOR sondage, règle
  Mastodon). Rendus canoniques : carte lien = vignette+titre+domaine ; **sondage =
  lignes → barres % après vote** (+ total + « votre choix ») ; quote = mini-carte
  nichée (profondeur capée) ; **YouTube = facade click-to-load** (pas d'iframe au
  render) ; galerie = grille fixe + alt-text requis.
- **Chargement** : **skeletons post-shaped** (pas de spinners) via `loading.tsx` +
  `<Suspense>` streamé ; **lazy-load** tout sous la ligne de flottaison
  (`loading="lazy"`) **sauf le 1er post** ; **réserver l'aspect-ratio** de chaque
  média (zéro layout shift).

## Sources
Tailwind theme/font-size · WCAG 2.2 (1.4.3, 1.4.11, 2.4.11, 2.5.8) · NN/g
animation · Material 3 motion · Val Head · appypie · Uxcel dark mode · design.dev ·
Simon Hearne optimistic UI · Onething skeleton vs spinner · Base UI · Catalyst.
(URLs complètes dans le rapport d'agent ; pages primaires W3C/NN/g/Tailwind/Base UI
à vérifier en direct — 403 au fetcher automatique, corroborées par extraits.)
