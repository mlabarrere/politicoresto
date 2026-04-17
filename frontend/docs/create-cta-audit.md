# Create CTA Audit - Global Unification

Statut: valide et applique.

## Scope

Uniformiser l'acces a la creation de contenu avec un seul pattern CTA.

## Legacy entrypoints supprimes ou rediriges

- `components/home/create-post-cta.tsx` supprime.
- floating CTA local homepage supprime.
- CTA ad hoc sidebar supprimes.
- ancien `site-header.tsx` remplace par `app-header.tsx`.

## Entry points courants

- Header desktop/mobile: `AppPrimaryCTA`.
- FAB mobile: `AppPrimaryCTA`.
- Flow creation: `/post/new` (page dediee).

## Regle de gouvernance

Aucun nouveau bouton de creation ad hoc n'est autorise hors `AppPrimaryCTA`.
