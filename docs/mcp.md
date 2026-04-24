# MCP — connecter un client à politicoresto

L'app expose une route MCP (Model Context Protocol) à `/api/mcp` qui permet à
un utilisateur authentifié de piloter ses propres actions (lire, commenter,
réagir, éditer son profil) depuis un client MCP distant comme Claude Desktop
ou Claude web.

**Le modèle d'autorisation est identique à celui de la GUI** : le client MCP
passe par Supabase (OAuth 2.1 + Google SSO), reçoit un access_token, et toute
écriture est filtrée par RLS exactement comme un clic dans le navigateur. Le
code de la route n'utilise jamais `service_role`.

## Architecture

```
┌─────────────────┐  1. POST /api/mcp/mcp   ┌──────────────────┐
│  Claude Desktop │ ──────────────────────▶ │   Next.js app    │
│  (MCP client)   │ ◀── 401 + PRM pointer ─│   (this repo)    │
│                 │                         └──────────────────┘
│                 │
│                 │  2. OAuth PKCE + DCR    ┌──────────────────┐
│                 │ ──────────────────────▶ │  Supabase Auth   │
│                 │  → "Login with Google"  │  OAuth 2.1 server│
│                 │ ◀── access_token (JWT) ─│                  │
│                 │                         └──────────────────┘
│                 │
│                 │  3. POST /api/mcp/mcp   ┌──────────────────┐
│                 │  Authorization: Bearer ▶│   Next.js app    │
│                 │                         │   → getClaims    │
│                 │                         │   → user-scoped  │
│                 │                         │     client       │
│                 │                         │   → RLS applies  │
└─────────────────┘                         └──────────────────┘
```

- Resource server : `frontend/app/api/mcp/[transport]/route.ts`
- Protected Resource Metadata (RFC 9728) :
  `frontend/app/.well-known/oauth-protected-resource/route.ts`
- Authorization Server : Supabase Auth
  (`$NEXT_PUBLIC_SUPABASE_URL/auth/v1`, discovery à
  `/auth/v1/.well-known/oauth-authorization-server`)

## Tools exposés (v0.1)

| Tool | Rôle |
|---|---|
| `whoami` | Identité + profil du caller |
| `browse_topics` | Lister les topics visibles (RLS) |
| `read_topic` | Lire un topic par UUID ou slug |
| `reply_to_post` | Commenter un thread_post ou répondre à un commentaire |
| `react` | Upvote/downvote un post ou un commentaire (toggle) |
| `remove_my_reaction` | Retirer sa propre réaction (idempotent) |
| `edit_my_profile` | Mettre à jour son `app_profile` |

Aucun tool d'écriture n'accepte un paramètre `user_id` / `acting_user_id` —
l'identité est exclusivement extraite du JWT validé par `withMcpAuth`. Un
test vérifie cet invariant.

## Connecter Claude Desktop

Le fichier de config est sous :
- macOS : `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows : `%APPDATA%\Claude\claude_desktop_config.json`

Claude Desktop ne parle que stdio nativement — pour un MCP server HTTP
comme le nôtre, on utilise le bridge officiel **`mcp-remote`** (maintenu
par Anthropic) qui gère le flow OAuth côté navigateur et pont vers
l'endpoint HTTP :

```json
{
  "mcpServers": {
    "politicoresto": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://politicoresto.fr/api/mcp/mcp"
      ]
    }
  }
}
```

Pour le dev local : remplacer l'URL par `http://localhost:3000/api/mcp/mcp`.

Note : l'URL comporte **`/api/mcp/mcp`**, pas `/api/mcp`. Le premier segment
est la base path de la route Next ; le second est le transport "Streamable
HTTP" que `mcp-handler` dispatche en interne (`/sse` est l'autre option,
legacy). `mcp-remote` a besoin du path complet.

Au premier tool call, `mcp-remote` ouvre une fenêtre navigateur vers
Supabase : l'utilisateur clique "Continue with Google", autorise l'app,
la fenêtre se ferme. Le token est caché sous `~/.mcp-auth/` et rafraîchi
automatiquement.

Après toute modification du fichier de config, **quitter et relancer
Claude Desktop** (Cmd+Q puis relancer) — un simple reload ne recharge
pas les MCP servers.

## Vérifier en local

Prérequis : `supabase start` + `next dev` + `[auth.oauth_server]` activé
dans `supabase/config.toml` (déjà fait).

### Avec MCP Inspector (flow complet)

```bash
npx @modelcontextprotocol/inspector
# Dans l'UI : Transport = "Streamable HTTP", URL = http://localhost:3000/api/mcp
# Cliquer "Connect" → fenêtre OAuth Supabase → Google SSO.
```

### Avec curl (flow scriptable)

Les scripts de vérification locale sont dans les tests d'intégration
(`frontend/tests/integration/mcp.int.test.ts`). Pour les lancer :

```bash
cd frontend
npm run test:integration -- mcp
```

14 tests :
- bearer verification (3) : absence, garbage, JWT valide
- whoami, browse_topics, read_topic × 2 (slug + UUID)
- reply_to_post, react (toggle), remove_my_reaction (idempotent)
- edit_my_profile × 2 (self + non-leak cross-user)
- invariants sécurité : pas de `user_id` dans les signatures, pas de
  `service_role` dans les requêtes sortantes.

## Sécurité — ce qui est testé

| Propriété | Test |
|---|---|
| Bearer absent / garbage → pas d'accès | `bearer verification` suite |
| Identité prise uniquement du JWT | `no tool schema accepts a user_id` |
| Zéro `service_role` dans les requêtes sortantes | `no outgoing request carries the service_role key` |
| Pas d'édition du profil d'autrui | `other user editing their OWN profile does not leak` |
| Enums rejetés côté schéma | garantie par Zod → JSON Schema enum |

## Déploiement Vercel

La route tourne en Node runtime (défaut App Router). Aucune config Vercel
spécifique. Les seules variables d'env nécessaires sont celles de l'app :
`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Côté Supabase staging/prod, activer l'OAuth 2.1 server via
Dashboard → Authentication → OAuth Server (toggle "Enabled" + "Allow dynamic
client registration"). C'est l'équivalent du bloc `[auth.oauth_server]` de
`config.toml` local.
