# Auth troubleshooting — notes pour éviter les régressions

Cette session a chassé un bug SSO récurrent (6ᵉ régression : login Google → home non-loguée). Ce document capture **ce qui a été vérifié, ce qui marche, ce qui reste à creuser**, pour que la prochaine itération reparte de l'état réel et non d'une hypothèse.

## Ce qui est CORRIGÉ et vérifié

### 1. URL staging stable : `politicoresto-staging.vercel.app`

Alias Vercel créé automatiquement par [.github/workflows/deploy-preview.yml](../.github/workflows/deploy-preview.yml) après chaque deploy. Google OAuth + Supabase redirects pointent sur cette URL unique. **Ne change plus à chaque push.**

### 2. Supabase staging — URL config propre

Dashboard Auth → URL Configuration :
- Site URL = `https://politicoresto-staging.vercel.app`
- Redirect URLs = `https://politicoresto-staging.vercel.app/**` + `http://localhost:3000/**`

**Avant** : Site URL pointait sur l'ancien `-mickylbr-` + 8 URLs legacy redirect. C'était LA cause racine initiale — Supabase retombait sur Site URL legacy après callback, perdant le code OAuth en route.

### 3. 2 clients Google OAuth séparés (staging + prod)

- Staging : Client ID finissant par `...062h8`, branché sur Supabase staging.
- Prod : Client ID finissant par `...nogq`, branché sur Supabase prod.

Tous deux ont `politicoresto-staging.vercel.app` / `politicoresto.vercel.app` en JS origins et les Supabase callbacks en redirect URIs.

### 4. Code auth côté Next — pattern officiel Supabase SSR

- [app/auth/callback/route.ts](../frontend/app/auth/callback/route.ts) : `NextResponse` créé en amont, Supabase écrit les cookies via `response.cookies.set` (pas via `cookies()` de next/headers qui ne propage pas toujours sur les redirects).
- [lib/supabase/middleware.ts](../frontend/lib/supabase/middleware.ts) : appel `supabase.auth.getUser()` sur chaque navigation GET. Crucial pour le refresh du JWT via refresh_token. Skip uniquement sur Server Actions (RPC security definer fait sa propre gate).
- [app/layout.tsx](../frontend/app/layout.tsx) : `export const dynamic = "force-dynamic"` + `await cookies()` dans AppShell pour empêcher Next.js 16 de cacher une version anonyme du layout.
- [lib/supabase/auth-user.ts](../frontend/lib/supabase/auth-user.ts) : `getAuthUserId` / `getAuthUser` utilisent `auth.getUser()`. `auth.getClaims()` aurait été plus rapide (validation JWT locale via JWKS, 0 round-trip) mais nécessite que le projet Supabase soit en clés asymétriques (vérifier `/auth/v1/.well-known/jwks.json` — sur ce projet c'est bien ES256, mais `getClaims()` a un comportement inconsistant dans `@supabase/ssr` 0.10 qu'on n'a pas eu le temps de creuser).

### 5. Logs de diagnostic partout

Format `[module][op] message { ... }` :
- `[oauth/google] start | redirecting | signInWithOAuth failed` côté browser
- `[auth/callback] GET | exchanging | session exchanged OK | exchangeCodeForSession failed` côté server
- `[proxy] cookie mutations (refresh) | getUser failed | unauthenticated /me → /auth/login` côté middleware

Les objets structurés peuvent être tronqués dans le dashboard Vercel (`{ me... }`). Pour voir le détail complet : utiliser `gh run view` + grep, ou cliquer sur un log Vercel pour ouvrir le panneau détaillé.

## Ce qui n'est PAS résolu à la fin de cette session

**Symptôme actuel** : après login Google sur staging, cookies `sb-<ref>-auth-token.0/.1` présents sur le browser, le user arrive sur `/` mais la home affiche toujours le header anonyme "Se connecter / Créer un compte". Middleware `getUser()` rapporte `"Auth session missing!"`.

**Ce qui a été vérifié lors du diag** :

1. Les cookies sont bien posés par le callback (vérifié via `/api/debug/cookies` temporaire, retrait après).
2. Le cookie value commence bien par `base64-` + base64URL-encoded JSON.
3. Le JSON décodé contient `access_token`, `refresh_token`, `expires_at`, `user` — toutes les clés requises par `_isValidSession` de `@supabase/auth-js`.
4. Le JWT est signé en ES256 (asymétrique), JWKS exposée sur `/auth/v1/.well-known/jwks.json`.
5. La même erreur est reproductible **localement** (`supabase start` + `npm run dev`) en se signant via `/api/test-signin` (route temporaire, retirée). **Ça veut dire que le bug est code-side, pas config-side.**

**Pistes à creuser en priorité** à la reprise :

- Vérifier si `@supabase/ssr` 0.10.2 a un bug spécifique avec les sessions ES256 en cookie storage. GitHub issue tracker à parcourir : https://github.com/supabase/ssr/issues.
- Tester avec `@supabase/ssr` 0.10.3+ ou une version pré-2.x si dispo.
- Ajouter du logging dans le storage adapter (`cookies.js` dans @supabase/ssr) pour voir ce que `storage.getItem()` retourne réellement — peut-être un JSON qui parse mais avec des clés manquantes après round-trip cookie.
- Tester avec `@supabase/supabase-js` direct (sans @supabase/ssr) côté server pour écarter le wrapper.

**Hypothèse privilégiée** : problème d'encodage dans `stringFromBase64URL` de `@supabase/ssr` quand le JWT contient certains caractères unicode (peu probable ici, l'UUID est ascii) OU bug connu dans la version 0.10.x.

## Environnement de dev local (à utiliser en priorité avant de push)

```bash
# 1. Supabase local
supabase start    # déjà fait, déjà running

# 2. Env vars locales
cat > frontend/.env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key from `supabase status -o env`>
NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=false
EOF

# 3. User de test
psql "$LOCAL_DB_URL" -c "<INSERT auth.users ...>"

# 4. Next dev
cd frontend && npm run dev -- --hostname 127.0.0.1 --port 3001
```

Itérer sur le cookie flow en local (en 5s de `npm run dev`) au lieu de pousser 8 PR d'affilée sur staging.

## Checklist anti-régression permanente

- [ ] Site URL + Redirect URLs Supabase correspondent à `politicoresto-staging.vercel.app` (staging) et `politicoresto.vercel.app` (prod). Ne jamais pointer sur un alias `-<user>-martoai.vercel.app`.
- [ ] Alias Vercel `politicoresto-staging.vercel.app` posé par le workflow `deploy-preview.yml` (step `vercel alias set`).
- [ ] Google OAuth Clients distincts par env, chacun branché sur SON projet Supabase.
- [ ] Test E2E `auth-staging.spec.ts` qui signe via `signInWithPassword` et vérifie que le cookie persiste sur `/me`.
- [ ] Logs `[auth/callback]`, `[oauth/google]`, `[proxy]` présents et exhaustifs.

## Références

- [docs/STAGING_SETUP.md](./STAGING_SETUP.md) — procédure complète de setup.
- Supabase SSR Next.js : https://supabase.com/docs/guides/auth/server-side/nextjs
- `@supabase/ssr` 0.10.2 source : `frontend/node_modules/@supabase/ssr/dist/module/cookies.js` + `utils/chunker.js`.
