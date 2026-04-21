# Setup staging — procédure à suivre UNE FOIS

Objectif : rendre `https://politicoresto-staging.vercel.app` fonctionnel pour Google SSO, E2E automatisés et accès externe.

Après ce setup, **plus aucune régression silencieuse** — l'E2E de [deploy-preview.yml](../.github/workflows/deploy-preview.yml) pète rouge si le cookie de session ne persiste pas.

Ordre à respecter : Vercel → Supabase → Google → vérif.

---

## 1. 🔓 Vercel — Désactiver Deployment Protection sur Preview

🎯 **Pourquoi** : Vercel bloque par défaut l'accès anonyme aux deploys preview (401). Conséquences : Google OAuth ne peut pas faire son callback, les utilisateurs externes ne voient rien, les E2E plantent.

🎯 **Où** : https://vercel.com/martoai/politicoresto/settings/deployment-protection

📋 **Action** :

🔹 Section **Vercel Authentication** → sélectionner **Only Production Deployments** (donc Preview = accès libre).

🔹 OU si tu veux garder une protection : générer un **Automation Bypass Secret** (section « Protection Bypass for Automation »), le stocker dans GitHub repo secret `VERCEL_AUTOMATION_BYPASS_SECRET`, et l'E2E le consommera automatiquement.

💾 **Save**.

✅ **Vérif** : `curl -I https://politicoresto-staging.vercel.app/` doit renvoyer `200` (pas `401`).

---

## 2. 🔐 Supabase — Staging (`nvwpvckjsvicsyzpzjfi`)

🎯 **Où** : https://supabase.com/dashboard/project/nvwpvckjsvicsyzpzjfi/auth/url-configuration

📋 **Action** :

🔹 **Site URL** → `https://politicoresto-staging.vercel.app`

🔹 **Redirect URLs** → ajouter ces deux lignes :
- `https://politicoresto-staging.vercel.app/**`
- `http://localhost:3000/**`

💾 **Save**.

---

## 3. 🔐 Supabase — Production (`gzdpisxkavpyfmhsktcg`)

🎯 **Où** : https://supabase.com/dashboard/project/gzdpisxkavpyfmhsktcg/auth/url-configuration

📋 **Action** :

🔹 **Site URL** → `https://politicoresto.vercel.app`

🔹 **Redirect URLs** :
- `https://politicoresto.vercel.app/**`
- `http://localhost:3000/**`

💾 **Save**.

---

## 4. 🔑 Google Cloud Console — OAuth 2.0 Client

🎯 **Où** : https://console.cloud.google.com/apis/credentials → ton projet PoliticoResto → OAuth 2.0 Client ID (celui utilisé par Supabase).

📋 **Action** :

🔹 **Authorized JavaScript origins** — ajouter ces 3 URLs si absentes :
- `https://politicoresto-staging.vercel.app`
- `https://politicoresto.vercel.app`
- `http://localhost:3000`

🔹 **Authorized redirect URIs** — ces 2 URLs sont celles **de Supabase**, elles ne changent jamais :
- `https://nvwpvckjsvicsyzpzjfi.supabase.co/auth/v1/callback` *(staging)*
- `https://gzdpisxkavpyfmhsktcg.supabase.co/auth/v1/callback` *(prod)*

💾 **Save**. Propagation Google : 2-5 min.

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

## 6. ✅ E2E automatisé

Déjà configuré côté repo :
- `tests/e2e/auth-staging.spec.ts` teste `signInWithPassword` contre staging, vérifie que le cookie persiste sur `/me`.
- User de test : `e2e-test@politicoresto.local` / *(password dans secrets GitHub)*.
- Secrets repo déjà set : `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`, `E2E_SUPABASE_PUBLISHABLE_KEY`.
- Le job `E2E auth (staging)` du workflow [deploy-preview.yml](../.github/workflows/deploy-preview.yml) tourne après chaque deploy.

**Si Vercel protection reste active** : le job utilise `VERCEL_AUTOMATION_BYPASS_SECRET` si tu l'as set, sinon il skippe avec un notice clair.

---

## 7. 🆘 Debug : si le login Google échoue quand même

1. Vérifier que `curl -I https://politicoresto-staging.vercel.app/` retourne `200` (protection Vercel off).
2. Vérifier dans Supabase Dashboard → Authentication → URL Configuration que **Site URL** et **Redirect URLs** pointent bien sur `politicoresto-staging.vercel.app`.
3. Vercel logs sur la dernière preview (MCP `get_runtime_logs` ou dashboard) :
   - `[auth/callback] exchangeCodeForSession failed` → problème côté Supabase (redirect URL mismatch, provider désactivé, etc.).
   - `[proxy] cookie mutations` avec `names: []` → le cookie n'arrive pas du tout côté browser.
4. Console browser après clic sur Google :
   - `[oauth/google] signInWithOAuth failed` avec `status=400` + `name=AuthApiError` → redirect URL pas whitelistée côté Supabase.
   - `status=503` → provider Google indisponible côté Supabase.

Les logs sont exhaustifs depuis la PR #25. Plus jamais de silence.
