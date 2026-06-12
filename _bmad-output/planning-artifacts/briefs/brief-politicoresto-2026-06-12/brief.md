---
title: "Product Brief — PoliticoResto"
status: ready
created: 2026-06-12
updated: 2026-06-12
author: Micky (facilité par BMAD product-brief)
---

# Product Brief : PoliticoResto

> **Statut : v1.0 — périmètre figé par Micky le 2026-06-12** (« j'ai tout donné »).
> Quelques `[HYPOTHÈSE]` subsistent (chiffrage des critères de succès, modèle
> économique) → **reportés au PRD**. Juridique **parqué**
> (domiciliation non choisie). Bases de preuves : `docs/research/2026-06-12-state-of-the-art.md`
> (produit) + `docs/research/2026-06-12-ux-patterns.md` (UX). Détails techniques &
> arbitrages : `addendum.md`. Mémoire des décisions : `.decision-log.md`.

## Executive Summary

PoliticoResto prend **tout l'outillage du sondage politique professionnel** —
redressement statistique, représentativité, caractérisation idéologique — et le
rend **fun, ludique et grand public**. Aujourd'hui, faire un sondage *vraiment
représentatif* est réservé aux instituts (YouGov, Ipsos, Civey) ; le citoyen
ordinaire ne dispose que de sondages-jouets sans valeur (« cliquez pour voter »,
zéro représentativité). PoliticoResto inverse ça : **n'importe qui lance un
sondage qui est redressé automatiquement et dont la représentativité est affichée
de façon visible et rassurante** — l'utilisateur *sait* à quel point son résultat
est solide, et ce qui lui manque pour l'être davantage.

Le socle est un **forum de débat politique** : la conversation est la fin, tout
le reste est moyen. Autour gravitent des outils qui *augmentent* la conversation
— **sondages redressés**, une **boussole « quel candidat me ressemble »**, un
**jeu de pronostics** (sans argent, scoré à la précision), des **soirées
électorales live**, et des **« tables »** (salons créés par les utilisateurs,
ouverts ou en **« discussion à l'aveugle »** anonyme).

**Pourquoi maintenant :** le forum est déjà en production et fonctionnellement
complet ; le moteur de redressement (calibration Deville-Särndal, worker Python)
est entièrement conçu et aligné sur l'état de l'art, mais **gelé**. La décision
du 2026-06-12 est de **tout dégeler, élargir et terminer le produit** — en
faisant de la rigueur statistique pro une **expérience grand public joyeuse**.
L'**ancre court terme est la présidentielle française 2027** (premier grand
rendez-vous : soirées électorales, boussole des candidats, sondages de campagne)
— mais le produit est conçu **par design pour être mondial et multi-événements**
(cf. Vision). 2027 est le banc d'essai, pas le plafond.

## Le problème

- **Les sondages grand public sont des jouets.** Les sondages de forum / réseaux
  sociaux n'ont aucune représentativité : un échantillon auto-sélectionné, biaisé,
  sur-représentant les plus militants. Personne ne sait à quel point se fier au
  résultat — et la plupart le surestiment.
- **La rigueur est enfermée chez les pros.** Le redressement (raking/MRP), la
  marge d'erreur honnête (design-effect), la transparence méthodologique existent
  — mais coûtent cher, sont opaques, et hors de portée du citoyen.
- **Le débat politique en ligne est toxique par défaut.** L'amplification
  algorithmique récompense l'outrage (modèle MAD), pas la qualité délibérative.
- **On ne sait pas à qui on parle** — ni l'affiliation de l'interlocuteur, ni si
  son avis « pèse » dans un ensemble représentatif.
- **La politique locale est délaissée.** Les gens s'intéressent d'abord à ce qui se
  passe **près d'eux** (quartier, arrondissement, commune, département, leur
  député) — mais l'offre en ligne est nationale et centralisée. Ce besoin de
  proximité est massivement mal servi.

## La solution

Une plateforme où **l'outillage pro tourne sous le capot, mais l'expérience est
celle d'un jeu social** :

- **Sondage redressé par défaut & transparent.** À chaque sondage, le moteur
  redresse selon le profil des répondants et affiche un **score de confiance /
  représentativité ludique** (« ton sondage est représentatif à 72 % — il te
  manque des 18-24 ans pour le rendre béton »), jamais du jargon (`deff`) brut.
  Toujours un **intervalle**, jamais un nombre nu.
- **Tout est un nœud, chaque nœud est un forum (graphe politique).** Les **nœuds**
  (territoires, **députés / élus** avec **« fiche »**, candidats, partis, thèmes) sont
  **créés par les utilisateurs** : le graphe et la **maille territoriale**
  **s'auto-construisent** (bottom-up — du quartier au national, la **politique locale
  prioritaire**), avec **dédoublonnage** (un nœud par entité/territoire) et
  **vérification** pour les entités réelles. Chaque nœud est un **forum** (flux continu
  façon subreddit : poster, discuter, sonder, parier), **relié en graphe** (thème →
  candidats → partis ; territoire → député). Un nœud est un objet **partagé** du graphe,
  distinct des **Tables** (salons sociaux). *(Amorçage à auditer/réutiliser :
  `political_entity`, seed partis/politiciens, enum `space_role`.)*
- **Tables** — l'unité « groupe / sous-forum », créable par tout le monde, où
  l'on **discute, sonde et parie** comme partout ailleurs. **Deux curseurs
  indépendants** : **accès** (publique & découvrable ↔ **privée/secrète, sur
  invitation seulement**) et **identité des participants** (*ouverte* ↔ *aveugle /
  anonyme intégral, « discussion à l'aveugle »*). Combinables librement. Modération
  déléguée par table. *(Les forums thématiques / par-entité sont les **nœuds
  canoniques** ci-dessus, distincts des Tables — ce qui tranche la « piste tables
  thématiques ». Risque d'entre-soi géré par le feed bridging.)*
- **Flair parti** — chaque membre peut afficher (opt-in) son parti de prédilection
  à côté de son pseudo : on sait si on débat avec quelqu'un de LFI ou du RN. Le
  pendant assumé du mode aveugle (deux crans d'un même axe identité visible↔masquée).
- **Comptes officiels & messagerie.** Les partis / organisations peuvent obtenir
  un **compte officiel** (macaron distinctif, **octroyé manuellement via le
  back-office**) et publient comme tout le monde. Les membres peuvent aussi
  **s'envoyer des messages privés (DM)**.
- **Boussole « quel candidat me ressemble »** — un quiz court, scoring transparent
  (façon Wahl-O-Mat 2/1/0), restitution sur des axes 2D + match candidat/parti.
- **Pronos** — pronostics *sans argent* à **durée longue** (un pari présidentiel
  vit des **mois**, ce n'est pas un post éphémère). **Section/hub dédié** pour
  suivre ses paris ouverts et où la **discussion vit dans le temps**, **+
  apparition dans le feed**. Mécanique de **cote/multiplicateur** (le frisson) **+
  classement de précision** (Brier/peer, calibration). Résolution **en direct**
  lors des soirées électorales.
- **Soirées électorales** — événements live le soir d'un scrutin : remontée des
  résultats en temps réel, fil de commentaires live, **résolution des pronos en
  direct** ; ambiance watch-party.
- **Posts riches** — texte, images, GIF, **vidéos YouTube en embed**.
- **International dès le départ** (i18n FR/EN) et **MCP public** : des agents
  externes (Claude & autres) peuvent se connecter à PoliticoResto.
- **Découvrable par les humains ET les machines.** SEO classique (rendu
  server-side, HTML sémantique, **données structurées schema.org/JSON-LD**,
  sitemaps, OpenGraph, hreflang) **et** « SEO des agents/LLM » (GEO/AEO) : contenu
  **entièrement parsable** (jamais de texte piégé dans une image), `llms.txt`, MCP
  public comme canal d'accès. Objectif : **être la source que les LLM citent** sur
  la politique.
- **Sécurité comme étalon-maître.** La plateforme manipule des données
  personnelles **sensibles** (opinions politiques, **pièces d'identité KYC**) →
  posture **defense-in-depth maximale** : RLS Supabase systématique (déjà la
  règle), `service_role` jamais côté client, chiffrement, **isolation/délégation
  des données d'identité**, anti-fraude/bot, audit logs, scanning de dépendances.
  *La sécurité n'est pas une feature, c'est le socle.* (détail : addendum §F.)

Fil rouge de modération : **récompenser la qualité délibérative, pas la chaleur**
— gates de confiance progressifs (façon Discourse), ranking « bridging » plutôt
qu'engagement, transparence des décisions.

**Boucle vertueuse des 3 piliers.** L'IA tisse **Forum ↔ Pronos ↔ Sondages** : on
débat, on parie, on sonde, puis on revient débattre. Chaque pilier nourrit les
autres (un pari ouvre un débat ; un débat appelle un sondage). Naviguer entre les
trois doit être **sans friction** — chacun est une **destination de premier rang**.
C'est le moteur de rétention « on y passe des heures ».

**Direction UI/UX :** **copier la simplicité et l'efficacité des réseaux sociaux
modernes** (Reddit, X, Threads, Instagram…) — **mobile-first**, friction minimale,
codes connus de tous. La rigueur statistique se cache derrière une UX familière et
fluide.

## Ce qui rend ça différent

**Comparable le plus proche : Reddit.** L'expérience cible est la même —
*la* destination où l'on va dès qu'on veut se renseigner sur la politique, où
l'on passe des heures à lire les commentaires (« waouh », « c'est dingue »), où
l'on apprend et comprend, et où **on s'amuse**. Les **Tables** sont nos
subreddits, la réputation/les flairs sont là. Mais là où Reddit s'arrête,
PoliticoResto ajoute trois choses que Reddit n'a pas et ne peut pas bricoler
après coup : **(1)** des **sondages réellement représentatifs** (redressés,
score de confiance visible), **(2)** un **débat sain par design** (ranking
bridging, gates de confiance, pas l'amplification d'outrage), **(3)** un produit
**purpose-built pour la politique** (boussole, pronos, soirées électorales).

- **« Civey pour tout le monde », mais joyeux.** Le redressement représentatif —
  d'habitude un produit B2B opaque — devient une mécanique de jeu grand public,
  transparente et auto-explicative. C'est le cœur du positionnement.
- **La représentativité comme objet d'UI, pas comme note de bas de page.** Le
  score de confiance et « ce qu'il te manque » sont l'aimant d'engagement (et le
  moteur de la ré-invitation ciblée : « il nous faut des jeunes en Bretagne »).
- **Forum-first.** Les outils servent la conversation, pas l'inverse — ce qui
  évite le piège du sondage-jouet déconnecté du débat.
- **Honnêteté statistique comme marque.** Toujours un intervalle ; ne jamais
  survendre (le redressement corrige la représentativité, pas le biais de mesure).
- **Avance d'exécution réelle :** forum en prod + moteur de redressement déjà
  conçu/aligné état de l'art. Le moat est l'exécution et la cohérence produit,
  pas un secret technique. *(honnête : les méthodes — raking, Wahl-O-Mat, Brier —
  sont publiques.)*

## Pour qui

- **Tête de pont (acquisition v1) : les « orphelins politiques » de Reddit.** Les
  gens qui utilisent Reddit pour parler politique mais s'y sentent **muselés** —
  en France, la modération des subs politiques penche fortement à gauche, ce qui
  **enterre les avis minoritaires** (la recherche le documente : biais de
  modération Reddit → chambres d'écho). PoliticoResto leur offre un lieu où **on
  n'est pas enterré pour un avis** : **pas de downvote public**, modération
  transparente, exposition cross-bord (bridging). Capter ceux qui « n'arrivent
  plus à parler sur Reddit » = la brèche d'entrée. **Ambition large : tout le monde.**
- **Primaire : le citoyen politisé grand public** — suit la politique, a des
  opinions, veut être entendu *et* veut savoir si son avis est représentatif.
  Succès = « j'ai lancé un sondage que mes amis prennent au sérieux parce qu'il
  est vraiment représentatif, et je me suis amusé. »
- **Secondaire : la communauté d'une table** — un groupe (asso, fac, bande
  d'amis politisés) qui veut son salon, parfois à l'abri (mode aveugle).
- **Tertiaire (cible assumée v1) : journalistes / médias** qui citent un résultat
  représentatif produit par la foule. Les sondages sont conçus pour être **citables**
  (provenance structurée). *(Démarchage presse actif après le légal dé-parqué.)*

## Critères de succès `[HYPOTHÈSE]` (à valider/chiffrer avec Micky)

- **Activation :** part des nouveaux qui lancent ou votent à un sondage en J+7.
- **Cœur de valeur :** part des sondages atteignant un score de confiance
  « robuste » (vs « indicatif »).
- **Conversation :** commentaires par sujet ; ratio réponses délibératives /
  réactions à chaud.
- **Rétention événementielle :** participants à une soirée électorale qui
  reviennent à la suivante.
- **Pronos :** nb de parieurs actifs ; **intensité du challenge entre joueurs**
  (classements consultés, duels) ; amélioration de la calibration moyenne.
- **Aspiration ultime (objectif, pas feature) :** la communauté **s'auto-organise
  politiquement** — capacité à faire émerger une action collective réelle (un
  mouvement façon Gilets Jaunes pourrait y naître). Signe que la plateforme rend
  un **pouvoir d'agir** aux citoyens.
- *(Pas d'objectif business monétaire à ce stade — passion project / pré-domiciliation.)*

## Modèle économique `[HYPOTHÈSE — à valider, légal parqué]`

L'argent entre par les **pros/sponsors, jamais par les participants** :

1. **Sondages payants (B2B).** Une entreprise / un institut commande un sondage
   représentatif ; le **moteur de redressement est l'actif vendable**. Revenu le
   plus « propre ».
2. **Sondages & pronos sponsorisés avec dotation.** Un sponsor met une cagnotte
   (ex. 1000 €) sur un sondage ou un prono ; elle est **distribuée aux
   participants** ; la plateforme prélève un **pourcentage**. **Seuls les comptes
   certifiés sont éligibles à la rémunération** (cf. ci-dessous).

**Compte certifié (électeur vérifié).** Pour toucher une rémunération, un compte
doit être **certifié** : **pièce d'identité uploadée** + **preuve d'électeur
local** (croisement avec la situation électorale — modalités à définir). Au-delà
de la rému, c'est un **double levier produit** : **anti-fraude** (les sondages
internet meurent du faux compte/bot) et **qualité du redressement** (un électeur
local vérifié est un signal de représentativité en or). Un **badge « vérifié »**
distingue ces comptes ; la certification reste **optionnelle** (le forum/les
sondages restent ouverts aux comptes non certifiés, sans rému ni poids « vérifié »).

3. **(Exploratoire `[À EXPLORER]`) Rémunérer la qualité.** Payer les contributeurs
   qui produisent du contenu de grande qualité (logique « créateur/influenceur »),
   financé par la plateforme **et/ou** par des sponsors / partis / institutions /
   financeurs privés. **Se branche sur le système qualité** (deltas, trust levels,
   précision pronos) → récompense un signal réel. **Garde-fou intégrité** :
   **transparence du financement obligatoire** (qui finance qui), sinon risque
   d'astroturfing / influence cachée — fatal pour la crédibilité en politique.

**Invariant de design qui garde le modèle défendable** (le point que Micky sent
« légalement limite ») : **le participant ne mise jamais rien** — l'argent est
injecté par le sponsor, pas par le joueur. Sans *sacrifice financier* du
participant, on reste côté **panel rémunéré** + **jeu-concours gratuit doté**
(légal, cf. recherche §5) plutôt que **jeu d'argent** (interdit en FR, L320-1 /
ANJ). Dès qu'on demanderait une mise au participant, ou qu'on laisserait des
particuliers parier entre eux pour de l'argent, on bascule dans le jeu d'argent.
→ **Validation juridique PARQUÉE** (domiciliation non choisie) ; à confirmer avec
un avocat au moment voulu. Détail : `addendum.md` §A.

## Périmètre

> **Ordre de construction :** la v1 **ne sort pas d'un coup** — elle est **phasée
> P1 → P2 → P3** (défini au PRD §15bis). Tête de pont **P1** = Boussole + graphe/fiches
> + forum sûr.

**Dans la v1 (tout dégelé + élargi) :**

| # | Axe | Note |
|---|---|---|
| 1 | **Forum** (topics, posts, commentaires, réactions, feed) | existant, à conserver |
| 1b | **Posts riches** (images, GIF, embed YouTube) | ajout |
| 1c | **Flair parti** (opt-in, à côté du pseudo) | socle data partiel existant |
| 1d | **Compte certifié** (ID + électeur local → rému + anti-fraude + poids redressement) | nouveau, KYC |
| 1e | **Messagerie privée (DM)** | nouveau |
| 1f | **Comptes officiels** (partis/orgs, macaron) | nouveau |
| 10 | **Back-office admin** (octroi comptes officiels, certifs, sponsors) | étendre `/admin` existant |
| 2 | **Tables** (sous-forums ; accès public/privé-sur-invitation × identité ouverte/aveugle ; discuss+sondages+pronos ; modération déléguée) | nouveau |
| 2b | **Graphe politique : entités-nœuds = forums** (territoires/**local**, députés/élus + **fiche**, candidats, partis, thèmes ; reliés en graphe) | nouveau ; socle `political_entity` à auditer |
| 3 | **Sondage redressé fun & grand public** (redressé par défaut, score visible) | dégeler + grand-publiciser |
| 4 | **Boussole / candidat-match (VAA)** | nouveau |
| 5 | **Pronos** (sans argent, score précision) | dégeler |
| 6 | **Soirées électorales** (live temps réel) | nouveau |
| 7 | **i18n** (FR/EN, next-intl) | transverse, prérequis |
| 8 | **MCP public** (étendre + référencer) | étendre l'existant |
| 9 | **Modération/réputation qualité>chaleur** | transverse |

**Explicitement hors v1 :**
- **Replay vidéo** des soirées électorales → roadmap post-v1 (décision Micky).
- **Ventilations MRP** sous-nationales fines → `[HYPOTHÈSE]` v2 (raking d'abord).
- **Mise en conformité juridique active** (domiciliation, DPIA, enregistrement
  Commission des sondages) → **parqué** jusqu'au choix du pays/entité ; voir addendum.
- Langues au-delà de FR/EN.

## Vision (2-3 ans)

PoliticoResto devient **LA plateforme de référence politique mondiale** —
*purpose-built* pour la politique — où l'opinion citoyenne acquiert de la
crédibilité : un lieu où un sondage lancé par un particulier peut être cité parce
qu'il est *visiblement* représentatif, où le débat est plus sain qu'ailleurs
parce que l'architecture récompense la qualité, et où **chaque événement
politique de la planète** (élection, référendum, débat) a sa soirée live, ses
sondages redressés et sa boussole. Multi-pays par conception (données de
référence par locale, distinction sondage/jeu paramétrable par juridiction),
ouvert aux agents via MCP. **Étape 1 : être incontournable sur la présidentielle
française 2027. Étape 2 : répliquer le playbook pays par pays, événement par
événement.** La rigueur d'un institut, l'énergie d'un jeu. **L'aspiration ultime
(un objectif, pas une feature) : que la communauté s'auto-organise politiquement —
qu'une action collective réelle puisse y naître, preuve que la plateforme rend aux
citoyens un véritable pouvoir d'agir.**
