# AGENT.md

## Principe directeur

Le frontend ne détient aucune logique métier critique. Supabase reste l’unique source de vérité pour les règles, la sécurité, les permissions, les agrégations, les workflows et les calculs.

## Interdictions

- ne jamais embarquer de `service_role` key
- ne jamais reprogrammer les validations métier SQL en React
- ne jamais dupliquer scoring, permissions, modération ou agrégations côté frontend
- ne jamais contourner les RPC prévues par un bricolage local
- ne jamais supposer qu’une donnée affichable est juridiquement ou métierement autorisée en dehors de ce que RLS expose

## Accès aux données

- `lib/data/public/` pour les lectures publiques
- `lib/data/authenticated/` pour les lectures liées à la session
- `lib/data/rpc/` pour les mutations ou interactions RPC/Auth
- `lib/types/` pour typer les contrats de vues et les modèles d’écran
- `lib/supabase/` pour les clients SSR/browser et la gestion des cookies

Les pages ne doivent pas parler directement à Supabase si une fonction dédiée peut vivre dans `lib/data/`.

## Conventions de rendu

- Server Components par défaut
- Client Components uniquement quand l’interactivité navigateur est réellement nécessaire
- pages robustes à l’absence de données
- routes dynamiques avec `loading.tsx`, `not-found.tsx`, et `error.tsx` si la route peut échouer au fetch
- shell applicatif centralisé dans `components/layout`

## Conventions de routing

- `app/(public)` pour les routes publiques
- `app/(authenticated)` pour les routes nécessitant une session
- `app/auth` pour les flux de connexion

## Stratégie d’évolution

- enrichir les écrans via nouvelles vues et RPC Supabase plutôt qu’en complexifiant le client
- si un besoin de détail manque côté frontend, vérifier d’abord si le contrat Supabase doit évoluer
- préserver le caractère déployable Vercel depuis `frontend/` comme Root Directory unique
