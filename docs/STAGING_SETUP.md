# Setup environnements — procédure à suivre UNE FOIS

Objectif : rendre `https://politicoresto-staging.vercel.app` fonctionnel pour Google SSO, E2E automatisés et accès externe. Pareil pour `https://politicoresto.vercel.app` en prod.

Après ce setup, **plus aucune régression silencieuse** — l'E2E de [deploy-preview.yml](../.github/workflows/deploy-preview.yml) pète rouge si le cookie de session ne persiste pas.

**Architecture** : un **client OAuth Google séparé par environnement** (staging/prod), chacun branché sur le projet Supabase correspondant. Les URIs sont symétriques : JavaScript origins = l'URL Vercel de l'env, redirect URI = l'URL Supabase de l'env (fixe, ne change jamais).

Ordre à respecter : Google → Vercel (désactiver protection) → Supabase → vérif.

---

## 1. 🔑 Google Cloud Console — OAuth 2.0 Clients ✅

🎯 **Principe** : **un OAuth client Google par environnement**. Isolation claire (pas de fuite du secret prod en dev, rotation indépendante). Même projet GCP (`705641825728`), deux Client IDs séparés.

🎯 **Où** : https://console.cloud.google.com/apis/credentials

### 🔹 Client **Production**

Client ID : `705641825728-2h2fgn18csoqk9akh3iglt0b3dijnogq.apps.googleusercontent.com` (secret finit par `tuBH`).

- **Authorized JavaScript origins**
  - `https://politicoresto.vercel.app`
- **Authorized redirect URIs**
  - `https://gzdpisxkavpyfmhsktcg.supabase.co/auth/v1/callback`

À brancher côté Supabase **production** (`gzdpisxkavpyfmhsktcg`) → Auth → Providers → Google → Client ID + Client Secret.

### 🔹 Client **Staging**

Client ID : `705641825728-hvp8gluvukjokhi3v493t0uj2jg062h8.apps.googleusercontent.com` (secret finit par `EUzm`).

- **Authorized JavaScript origins**
  - `https://politicoresto-staging.vercel.app`
  - `http://localhost:3000`
- **Authorized redirect URIs**
  - `https://nvwpvckjsvicsyzpzjfi.supabase.co/auth/v1/callback`

À brancher côté Supabase **staging** (`nvwpvckjsvicsyzpzjfi`) → Auth → Providers → Google → Client ID + Client Secret.

💡 Propagation Google : 2-5 minutes à quelques heures.

---

## 2. 🔓 Vercel — Désactiver Deployment Protection sur Preview

🎯 **Pourquoi** : Vercel bloque par défaut l'accès anonyme aux deploys preview (401). Conséquence : Google OAuth ne peut pas faire son callback (Vercel coupe la requête avant que Next la voie), les utilisateurs externes voient un écran de login Vercel, et les E2E plantent.

🎯 **Où** : https://vercel.com/martoai/politicoresto/settings/deployment-protection

📋 **Action** :

🔹 Section **Vercel Authentication** → sélectionner **Only Production Deployments** (donc Preview = accès libre). C'est l'option la plus simple et la plus propre pour une app web publique.

🔹 OU si tu veux garder une protection : générer un **Automation Bypass Secret** (section « Protection Bypass for Automation »), le stocker dans GitHub repo secret `VERCEL_AUTOMATION_BYPASS_SECRET`. Le callback Google restera cassé, mais l'E2E utilisera le bypass.

💾 **Save**.

✅ **Vérif** : `curl -I https://politicoresto-staging.vercel.app/` doit renvoyer `200` (pas `401`).

---

## 3. 🔐 Supabase — Staging (`nvwpvckjsvicsyzpzjfi`)

🎯 **Où** : https://supabase.com/dashboard/project/nvwpvckjsvicsyzpzjfi/auth/url-configuration

📋 **Action** :

🔹 **Site URL** → `https://politicoresto-staging.vercel.app`

🔹 **Redirect URLs** → ajouter ces deux lignes :
- `https://politicoresto-staging.vercel.app/**`
- `http://localhost:3000/**`

💾 **Save**.

### Bonus — Provider Google Supabase

🎯 **Où** : https://supabase.com/dashboard/project/nvwpvckjsvicsyzpzjfi/auth/providers → Google

🔹 **Client ID** : `705641825728-hvp8gluvukjokhi3v493t0uj2jg062h8.apps.googleusercontent.com`
🔹 **Client Secret** : le secret qui finit par `EUzm` (à récupérer depuis Google Console, « Add secret » si perdu).
🔹 **Enable Google provider** : ON.

💾 **Save**.

---

## 4. 🔐 Supabase — Production (`gzdpisxkavpyfmhsktcg`)

🎯 **Où** : https://supabase.com/dashboard/project/gzdpisxkavpyfmhsktcg/auth/url-configuration

📋 **Action** :

🔹 **Site URL** → `https://politicoresto.vercel.app`

🔹 **Redirect URLs** :
- `https://politicoresto.vercel.app/**`
- `http://localhost:3000/**`

💾 **Save**.

### Bonus — Provider Google Supabase

🎯 **Où** : https://supabase.com/dashboard/project/gzdpisxkavpyfmhsktcg/auth/providers → Google

🔹 **Client ID** : `705641825728-2h2fgn18csoqk9akh3iglt0b3dijnogq.apps.googleusercontent.com`
🔹 **Client Secret** : le secret qui finit par `tuBH`.
🔹 **Enable Google provider** : ON.

💾 **Save**.

---

## 5. ✅ Smoke test manuel

1. Ouvrir https://politicoresto-staging.vercel.app/auth/login en navigation privée.
2. Cliquer **Continuer avec Google** → choisir un compte.
3. Attendu : redirection sur `/me` ou `/onboarding`, logué. Cookie `sb-nvwpvckjsvicsyzpzjfi-auth-token` visible dans DevTools → Application → Cookies.
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
