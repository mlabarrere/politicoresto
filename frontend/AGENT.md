# AGENT.md

## Principe directeur

Le frontend ne detient aucune logique metier critique. Supabase reste l'unique source de verite pour les regles, la securite, les permissions, les agregations, les workflows et les calculs.

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

## Conventions de routing

- `app/(public)` pour les routes publiques
- `app/(authenticated)` pour les routes necessitant une session
- `app/auth` pour les flux de connexion

## Strategie d'evolution

- enrichir les ecrans via nouvelles vues et RPC Supabase plutot qu'en complexifiant le client
- si un besoin de detail manque cote frontend, verifier d'abord si le contrat Supabase doit evoluer
- preserver le caractere deployable Vercel depuis `frontend/` comme Root Directory unique
