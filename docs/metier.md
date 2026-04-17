# Documentation metier

## Positionnement

PoliticoResto est un forum politique structure autour de sujets (`topic`) et de contributions (`thread_post`, commentaires), avec une experience de debat lisible, moderee et compatible mobile/desktop.

## Objectifs produit

- Permettre a un utilisateur de creer, publier et suivre des sujets politiques.
- Maintenir un feed editorial utile (pas un flux de bruit).
- Offrir des interactions coherentes (reactions, commentaires, sondages).
- Garder un espace personnel prive par defaut.

## Objets metier principaux

- `topic`: unite de discussion durable (slug, titre, statut, visibilite).
- `thread_post`: post de discussion rattache a un topic.
- `post` (commentaire/revision selon schema): stockage discursive detaille.
- `post_poll`: sondage associe a un post.
- `app_profile`: identite publique minimale.

## Cycle de vie d'un sujet

1. Creation du topic.
2. Creation du post initial (obligatoire pour la lisibilite publique).
3. Publication et exposition dans le feed.
4. Activite (reactions/commentaires/sondage eventuel).
5. Evolution de statut (`open`, `locked`, `resolved`, `archived`).

Regle critique: un topic expose au public doit toujours avoir un post initial ouvrable.

## Parcours utilisateurs cibles

### Parcours public

- Consulter homepage (`/`) puis categorie (`/category/[slug]`).
- Ouvrir un sujet (`/post/[slug]`).
- Lire metadonnees, posts, commentaires, et eventuel sondage.

### Parcours createur connecte

- Acceder a `/post/new` via CTA global.
- Composer en Markdown.
- Choisir mode `Post` ou `Sondage` (`Paris` desactive).
- Publier, puis retrouver son sujet dans le feed et le detail.

### Parcours espace personnel

- Naviguer dans `/me` par sections: profil, votes, brouillons, publications, commentaires, compte/securite.
- Voir clairement ce qui est prive via badge/notices.

## Regles UX metier

- L'action `Creer` est globale et persistante.
- Les messages d'erreur doivent etre explicites pour l'utilisateur, sans exposer du SQL brut.
- Une section indisponible doit afficher un etat sobre (`Indisponible temporairement`) et rester non bloquante.

## Sondages

- Deux resultats sont affiches: brut et redresse.
- Le redressement depend du profil des repondants et de leur historique de vote declare.
- Le wording doit rester non trompeur: panel volontaire, estimation corrigee evolutive.

## Hors scope actuel

- Workflow complet `Paris` (tab present mais desactive).
- Features historiques non alignees au contrat runtime courant.
