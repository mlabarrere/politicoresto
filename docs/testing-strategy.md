# Strategie de tests

## Objectif

Garantir la stabilite des parcours critiques produit et prevenir les regressions de contrat front/back.

## Pyramide de tests

### Unit

- composants UI partages (`App*`): variants, accessibilite, etats.
- data loaders: mapping des vues SQL, fallback controlle.
- server actions: validation inputs, redirections, erreurs utilisateur.

### Integration

- routes API (`/api/comments`, `/api/reactions`, `/api/polls/vote`).
- coherence entre payload frontend et signatures RPC.

### E2E

- create -> feed -> detail (parcours principal).
- reload URL detail apres creation.
- commentaires/reactions sur contenu public.
- parcours profil `/me` (navigation sections, etats indisponibles).

## Parcours critiques obligatoires

1. Creation d'un post publie ouvrable.
2. Affichage feed sans lien casse.
3. Soumission/lecture sondage.
4. Reaction post/comment avec compteurs cohérents.
5. Affichage `/me` sans erreur technique brute.

## Garde-fous d'architecture

- interdire import direct `components/catalyst/*` hors wrappers.
- interdire import `components/ui/*` legacy.
- verifier qu'aucune page ne contourne les modules `lib/data/*` pour parler a Supabase directement.

## Commandes standard

```powershell
cd frontend
npm run typecheck
npm run test:unit
npm run test:e2e
```

## Politique de non-regression

- Toute correction de bug prod ajoute au moins un test qui reproduit puis verrouille le cas.
- Une erreur `schema cache` constatee en prod doit conduire a:
  - test unitaire de fallback/contrat
  - migration SQL ou correction frontend explicite
  - verification e2e du flux utilisateur impacte
