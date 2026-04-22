# Setup environnements — procédure à suivre UNE FOIS

Objectif : rendre `https://politicoresto-staging.vercel.app` fonctionnel pour Google SSO, E2E automatisés et accès externe. Pareil pour `https://politicoresto.vercel.app` en prod.

Après ce setup, **plus aucune régression silencieuse** — l'E2E de [deploy-preview.yml](../.github/workflows/deploy-preview.yml) pète rouge si le cookie de session ne persiste pas.

**Architecture** : un **client OAuth Google séparé par environnement** (staging/prod), chacun branché sur le projet Supabase correspondant. Les URIs sont symétriques : JavaScript origins = l'URL Vercel de l'env, redirect URI = l'URL Supabase de l'env (fixe, ne change jamais).

Ordre à respecter : Google → Supabase → vérif. Vercel Deployment Protection peut rester ON — elle ne bloque pas le flow OAuth, et désactiver requiert le plan Pro à 150 $/mois (Advanced Deployment Protection).

---

## 1. 🔑 Google Cloud Console — OAuth 2.0 Clients ✅

🎯 **Principe** : **un OAuth client Google par environnement**. Isolation claire (pas de fuite du secret prod en dev, rotation indépendante). Même projet GCP (`705641825728`), deux Client IDs séparés.

🎯 **Où** : https://console.cloud.google.com/apis/credentials

### 🔹 Client **Production**

Client ID : `705641825728-2h2fgn18csoqk9akh3iglt0b3dijnogq.apps.googleusercontent.com` (secret finit par `tuBH`).

- **Authorized JavaScript origins**
  - `https://politicoresto.vercel.app`
- **Authorized redirect URIs**
  - `https://<SUPABASE_PROD_PROJECT_REF>.supabase.co/auth/v1/callback`

À brancher côté Supabase **production** (`<SUPABASE_PROD_PROJECT_REF>`) → Auth → Providers → Google → Client ID + Client Secret.

### 🔹 Client **Staging**

Client ID : `705641825728-hvp8gluvukjokhi3v493t0uj2jg062h8.apps.googleusercontent.com` (secret finit par `EUzm`).

- **Authorized JavaScript origins**
  - `https://politicoresto-staging.vercel.app`
  - `http://localhost:3000`
- **Authorized redirect URIs**
  - `https://<SUPABASE_STAGING_PROJECT_REF>.supabase.co/auth/v1/callback`

À brancher côté Supabase **staging** (`<SUPABASE_STAGING_PROJECT_REF>`) → Auth → Providers → Google → Client ID + Client Secret.

💡 Propagation Google : 2-5 minutes à quelques heures.

---

## 2. 🔓 Vercel Deployment Protection — à laisser ON, sauf cas particuliers

🎯 **Contexte** : Vercel Authentication renvoie 401 aux visiteurs anonymes des deploys preview. En Hobby/Free, on ne peut pas la désactiver proprement (l'option « Only Production Deployments » est payante, 150 $/mois Advanced Deployment Protection).

🎯 **Impact réel sur le flow OAuth** : **aucun**. Tu es déjà membre de la team Vercel → tu vois l'app. Google OAuth callback passe par Supabase, pas Vercel. Donc zéro blocage pour ton usage.

**À faire seulement si besoin** :

🔹 **Testeur externe beta (n'est pas dans la team Vercel)** : deux options
   - Activer **Shareable Links** (bouton Share depuis le dashboard de la preview), lui envoyer l'URL partageable.
   - OU créer un **Automation Bypass Secret** (section déjà dispo gratuite), lui transmettre. Chaque requête avec le header `x-vercel-protection-bypass: <secret>` passe.

🔹 **E2E automatisé en CI sans skip** : créer un bypass secret et le stocker dans le GitHub repo comme `VERCEL_AUTOMATION_BYPASS_SECRET`. Le workflow `deploy-preview.yml` peut ensuite injecter ce header. Tant que ce secret n'existe pas, l'E2E skip avec un `::warning::` — pas bloquant.

💡 Pour l'instant on laisse Protection ON. On reviendra sur le bypass si on veut un E2E vraiment automatisé sans concession.

---

## 3. 🔐 Supabase — Staging (`<SUPABASE_STAGING_PROJECT_REF>`)

🎯 **Où** : https://supabase.com/dashboard/project/<SUPABASE_STAGING_PROJECT_REF>/auth/url-configuration

📋 **Action** :

🔹 **Site URL** → `https://politicoresto-staging.vercel.app`

🔹 **Redirect URLs** → ajouter ces deux lignes :
- `https://politicoresto-staging.vercel.app/**`
- `http://localhost:3000/**`

💾 **Save**.

### Bonus — Provider Google Supabase

🎯 **Où** : https://supabase.com/dashboard/project/<SUPABASE_STAGING_PROJECT_REF>/auth/providers → Google

🔹 **Client ID** : `705641825728-hvp8gluvukjokhi3v493t0uj2jg062h8.apps.googleusercontent.com`
🔹 **Client Secret** : le secret qui finit par `EUzm` (à récupérer depuis Google Console, « Add secret » si perdu).
🔹 **Enable Google provider** : ON.

💾 **Save**.

---

## 4. 🔐 Supabase — Production (`<SUPABASE_PROD_PROJECT_REF>`)

🎯 **Où** : https://supabase.com/dashboard/project/<SUPABASE_PROD_PROJECT_REF>/auth/url-configuration

📋 **Action** :

🔹 **Site URL** → `https://politicoresto.vercel.app`

🔹 **Redirect URLs** :
- `https://politicoresto.vercel.app/**`
- `http://localhost:3000/**`

💾 **Save**.

### Bonus — Provider Google Supabase

🎯 **Où** : https://supabase.com/dashboard/project/<SUPABASE_PROD_PROJECT_REF>/auth/providers → Google

🔹 **Client ID** : `705641825728-2h2fgn18csoqk9akh3iglt0b3dijnogq.apps.googleusercontent.com`
🔹 **Client Secret** : le secret qui finit par `tuBH`.
🔹 **Enable Google provider** : ON.

💾 **Save**.

---

## 5. ✅ Smoke test manuel

1. Ouvrir https://politicoresto-staging.vercel.app/auth/login en navigation privée.
2. Cliquer **Continuer avec Google** → choisir un compte.
3. Attendu : redirection sur `/me` ou `/onboarding`, logué. Cookie `sb-<SUPABASE_STAGING_PROJECT_REF>-auth-token` visible dans DevTools → Application → Cookies.
4. Si ça échoue :
   - Console browser → chercher `[oauth/google] …`
   - Vercel logs → chercher `[auth/callback] …`
   - Les logs disent EXACTEMENT ce qui a foiré (status, name, code).

---

## 6. ✅ E2E automatisé (déjà en place)

- `tests/e2e/auth-staging.spec.ts` teste `signInWithPassword` contre staging, vérifie que le cookie persiste sur `/me`.
- User de test : `e2e-test@politicoresto.local` / *(password dans GitHub repo secrets)*.
- Secrets repo déjà set : `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`, `E2E_SUPABASE_PUBLISHABLE_KEY`.
- Le job `E2E auth (staging)` du workflow [deploy-preview.yml](../.github/workflows/deploy-preview.yml) tourne après chaque deploy.
- Tant que Vercel Protection est ON, le job skip gracieusement avec un `::warning::` clair.

---

## 7. 🆘 Debug : si le login Google échoue quand même

1. Vérifier `curl -I https://politicoresto-staging.vercel.app/` → `200` (protection Vercel off).
2. Dashboard Supabase → Authentication → URL Configuration → Site URL + Redirect URLs OK.
3. Vercel logs sur la dernière preview (MCP `get_runtime_logs` ou dashboard) :
   - `[auth/callback] exchangeCodeForSession failed` → côté Supabase (redirect URL mismatch, provider désactivé).
   - `[proxy] cookie mutations` avec `names: []` → cookie pas posé côté browser.
4. Console browser après clic Google :
   - `[oauth/google] signInWithOAuth failed` `status=400 AuthApiError` → redirect URL pas whitelistée côté Supabase.
   - `status=503` → provider Google désactivé dans Supabase.

Les logs sont exhaustifs depuis la PR #25. Plus jamais de silence.
