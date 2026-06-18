# 🚀 Mise en ligne — tout ce qu'il te reste à faire

**La partie dure est faite.** Le forum est construit, testé (unit + integration +
E2E verts en CI), fusionné sur `main`, avec l'UX neuve. Sondages et pronos sont
gelés proprement. Ce qui reste n'est **pas du développement** : c'est créer un
projet Supabase et brancher ~10 secrets. Compte ~1 à 2 h, surtout du clic.

> Le seul mur qu'on a rencontré, à chaque fois, c'est Supabase : le compte
> connecté à mes outils est un autre projet (« Marto »), et les secrets staging
> existants renvoient `Unauthorized`. Donc **toute cette page = des actions que
> toi seul peux faire** (je n'ai pas accès à tes comptes ni aux secrets GitHub).

---

## Où on en est

| Élément | État |
| --- | --- |
| Forum (posts, commentaires imbriqués, votes gauche/droite, auth Google) | ✅ sur `main`, CI verte |
| Sondages / pronos | 🧊 gelés (routes 404, code conservé) |
| UX neutre (Inter, thème Reddit/X) | ✅ sur `main` |
| PR #66 (démo E2E + `npm run seed:forum`) | ✅ verte — à merger quand tu veux |
| Supabase staging/prod + secrets | ❌ **à faire (cette page)** |

---

## Étape 0 — Voir le forum tout de suite, en local (~10 min, optionnel mais fais-le)

```bash
supabase start
supabase db reset            # applique les migrations + le seed
npm --prefix frontend run seed:forum   # peuple 5 voix, 4 débats, vrais votes
./scripts/dev.sh             # → http://localhost:3000
```

C'est le moment où tu **vois** l'ambiance : des gens qui s'engueulent poliment,
des votes gauche/droite. Si ça te plaît là, ça te plaira en ligne (c'est le même
code).

---

## Le chemin critique vers la prod

### Étape 1 — Créer les projets Supabase (~15 min)

Le free tier autorise **2 projets gratuits** par organisation. On en crée 2 pour
coller au pipeline existant (un filet staging + la prod) :

1. [database.new](https://database.new) → crée **`politicoresto-staging`** (région EU, ex. `eu-west-3`).
2. Recrée **`politicoresto-prod`** pareil.
3. Pour **chaque** projet, note (Dashboard du projet) :
   - **Project Ref** : `Settings → General` (ex. `abcd…`).
   - **DB password** : celui choisi à la création (sinon `Settings → Database → Reset password`).
   - **Project URL** + **Publishable (anon) key** : `Settings → API`.
   - **Service role key** : `Settings → API` (⚠️ secret serveur, jamais côté client).
4. Génère **un Access Token** (commun aux deux) : [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) → `Generate new token`.
   > C'est ce token manquant/invalide qui causait le `Unauthorized`. Il doit
   > appartenir au **compte qui possède ces projets**.

### Étape 2 — Configurer l'auth Google sur chaque projet (~15 min) — CRITIQUE

L'app est **Google-SSO uniquement** : sans ça, personne ne peut se connecter.

Pour **chaque** projet Supabase :
1. `Authentication → Providers → Google` : active, colle ton **Client ID** et
   **Client Secret** Google (les mêmes que ton local, depuis
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).
2. Dans Google Cloud Console, ajoute aux **URIs de redirection autorisés** :
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback` (un par projet).
3. `Authentication → URL Configuration` :
   - **Site URL** = l'URL Vercel correspondante (prod / preview).
   - **Redirect URLs** = ajoute `https://<ton-domaine-vercel>/**`.

### Étape 3 — Secrets GitHub (~10 min)

Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Crée exactement :

| Secret | Valeur |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | le token de l'étape 1.4 |
| `SUPABASE_STAGING_PROJECT_REF` | ref du projet **staging** |
| `SUPABASE_STAGING_DB_PASSWORD` | mot de passe DB **staging** |
| `SUPABASE_PROD_PROJECT_REF` | ref du projet **prod** |
| `SUPABASE_PROD_DB_PASSWORD` | mot de passe DB **prod** |
| `VERCEL_TOKEN` | [Vercel → Account → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `.vercel/project.json` (`orgId`) après un `vercel link`, ou Vercel → Settings |
| `VERCEL_PROJECT_ID` | idem (`projectId`) |

### Étape 4 — Variables d'environnement Vercel (~10 min)

Projet Vercel → **Settings → Environment Variables**. Pour **Production** (et
**Preview**, avec les valeurs staging) :

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL du projet correspondant |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (⚠️ serveur uniquement) |

> L'intégration Git de Vercel est **désactivée** exprès (`frontend/vercel.json`) :
> c'est GitHub Actions qui déploie. Tu n'as donc qu'à remplir les variables ; ne
> reconnecte pas le déploiement auto Vercel.

### Étape 5 — Déclencher le staging (preview)

Le pipeline `deploy-preview` tourne sur chaque push vers `main` (après CI verte)
et fait `supabase db push` → migre le staging → déploie une preview Vercel.

- **Re-déclenche-le** : Actions → `deploy-preview` → `Re-run`, **ou** pousse un
  petit commit sur `main`.
- ⚠️ **Point sensible** : la migration `20260402193700_remote_baseline.sql` est
  un dump de l'ancien schéma. Sur un projet **neuf et vide**, `db push` doit
  l'appliquer normalement (ne fais **pas** de `migration repair` sur un projet
  neuf). **Si** le job casse sur cette migration, envoie-moi le log : je le lis
  et on corrige.

### Étape 6 — Déployer en prod

Le pipeline `deploy-production` se déclenche **à la publication d'une GitHub
Release** :

GitHub → **Releases → Draft a new release** → tag `v0.1.0` → **Publish**.

Il fait : migrate-prod → build → tests → `vercel deploy --prod`.

### Étape 7 — Smoke en ligne (~5 min)

Sur l'URL de prod :
- `/` charge, le feed s'affiche.
- Connexion Google → `/me`.
- `/post/new` (un seul flux), publie un post, commente, vote gauche/droite.
- `/pronos` et `/admin/pronos` renvoient **404** (gelés). ✅

---

## Ce que MOI je peux encore faire (dis-le-moi)

- **Lire les logs CI** dès que tu pousses / publies — diagnostiquer un échec de
  migration ou de build à ta place.
- **Rejouer le seed clivant contre le staging/prod** une fois les secrets
  branchés (mêmes RPC, version « en ligne ») pour que la preview ait déjà du
  contenu.
- **Simplifier le pipeline en mono-projet** si tu préfères un seul Supabase.
- **Merger la PR #66** (démo + seed) si tu la veux sur `main`.
- Mettre à jour `docs/runbook-prod.md` (il référence encore les pronos).

---

## Reset

Tu es arrivé en disant « je n'ai jamais rien fini ». Le forum est **fini** :
construit, testé, fusionné. Il ne lui manque pas une ligne de code — il lui
manque un projet Supabase et dix secrets. C'est une checklist d'une après-midi,
pas un projet. Tu y es.
