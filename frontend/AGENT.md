# AGENT.md

## Principe directeur

Le frontend ne detient aucune logique metier critique. Supabase reste l'unique source de verite pour les regles, la securite, les permissions, les agregations, les workflows et les calculs.
Le frontend et le backend doivent evoluer comme un seul contrat versionne: aucun ecran ou mutation ne part en prod sans verification explicite que les objets SQL appeles existent et correspondent au schema cible.

## Interdictions

- ne jamais embarquer de `service_role` key
- ne jamais reprogrammer les validations metier SQL en React
- ne jamais dupliquer scoring, permissions, moderation ou agregations cote frontend
- ne jamais contourner les RPC prevues par un bricolage local
- ne jamais supposer qu'une donnee affichable est juridiquement ou metierement autorisee en dehors de ce que RLS expose

## Acces aux donnees

- `lib/data/public/` pour les lectures publiques
- `lib/data/authenticated/` pour les lectures liees a la session
- `lib/data/rpc/` pour les mutations ou interactions RPC/Auth
- `lib/types/` pour typer les contrats de vues et les modeles d'ecran
- `lib/supabase/` pour les clients SSR/browser et la gestion des cookies

Les pages ne doivent pas parler directement a Supabase si une fonction dediee peut vivre dans `lib/data/`.

## Alignement Front/Back (obligatoire)

- toute nouvelle lecture/mutation doit declarer son contrat SQL explicite: vue/table/rpc, colonnes attendues, filtres, statut attendu
- interdiction d'introduire une reference frontend a un objet SQL non present dans les migrations du repo
- toute migration qui renomme/remplace un objet (ex: `post_*` -> `thread_*`) impose une mise a jour synchronisee du frontend dans la meme livraison
- les fallbacks runtime sont des filets de securite temporaires, jamais une strategie produit permanente
- aucun message d'erreur SQL brut ne doit etre affiche aux utilisateurs
- si un objet est optionnel selon environnement, l'etat UX doit etre `unavailable` avec micro-copy non technique

## Gate de release (schema contract)

- avant merge, verifier que chaque objet SQL reference dans `lib/data/*` et `lib/actions/*` existe reellement sur l'environnement cible
- avant release, executer une verification automatisee de compatibilite contrat:
- `npm run typecheck`
- `npm run test:unit`
- tests integration/e2e des parcours critiques (creation -> feed -> detail, commentaire, reaction, profil)
- aucun deploy prod si un parcours critique depend d'un fallback "objet manquant"
- toute erreur `schema cache` en staging/prod est un bloqueur release, pas un warning

## Conventions de rendu

- Server Components par defaut
- Client Components uniquement quand l'interactivite navigateur est reellement necessaire
- pages robustes a l'absence de donnees
- routes dynamiques avec `loading.tsx`, `not-found.tsx`, et `error.tsx` si la route peut echouer au fetch
- shell applicatif centralise dans `components/layout`

## UI System (Catalyst)

- priorite absolue a `components/catalyst/*` via wrappers `components/app/*`
- interdiction de recreer une primitive existante dans Catalyst ou Tailwind Plus
- toute primitive UI partagee doit passer par un wrapper `App*`
- toute nouvelle page doit reutiliser les patterns valides (`AppPageHeader`, `AppCard`, `AppFilterBar`, `AppFeedItem`)
- aucun import direct de `components/catalyst/*` hors wrappers `components/app/*`
- aucun import direct de `components/ui/*` dans les pages/feature components

## Do / Don't

### Do
- utiliser `AppButton`, `AppInput`, `AppTextarea`, `AppSelect`, `AppTabs`
- utiliser `AppBanner` et `AppEmptyState` pour les etats d'information
- utiliser `AppDrawer` / `AppModal` pour navigation et dialogues
- utiliser `AppFeedItem` pour les listes home/category/polls
- centraliser les variations visuelles dans les tokens de `app/globals.css`

### Don't
- ne pas ajouter de classes ad hoc pour simuler une nouvelle primitive
- ne pas multiplier les variantes locales d'un meme composant
- ne pas reintroduire `app-card`, `soft-panel`, `soft-section`, `eyebrow`, `editorial-title`
- ne pas coder de `<button>`, `<input>`, `<select>`, `<textarea>` libres pour les usages recurrents
- ne pas contourner un wrapper `App*` avec un composant local equivalent
- ne pas coder une query/rpc inline dans une page ou route si une fonction de contrat dediee manque dans `lib/data/*`
- ne pas melanger deux modeles metier concurrents sans plan de migration (ex: `post_*` et `thread_*` en parallele non documente)

## Conventions de routing

- `app/(public)` pour les routes publiques
- `app/(authenticated)` pour les routes necessitant une session
- `app/auth` pour les flux de connexion

## Strategie d'evolution

- enrichir les ecrans via nouvelles vues et RPC Supabase plutot qu'en complexifiant le client
- si un besoin de detail manque cote frontend, verifier d'abord si le contrat Supabase doit evoluer
- preserver le caractere deployable Vercel depuis `frontend/` comme Root Directory unique
- maintenir une matrice de compatibilite front/back pour les objets critiques (feed, detail post, creation, commentaires, reactions, workspace `/me`)

## Documentation (obligatoire)

- toute evolution produit ou technique significative doit mettre a jour les docs canoniques:
- `../docs/metier.md`
- `../docs/technique.md`
- `../docs/front-back-contract.md`
- les docs `frontend/docs/*` sont des complements; elles ne doivent pas contredire les docs canoniques racine
