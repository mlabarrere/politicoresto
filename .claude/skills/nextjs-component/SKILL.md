---
name: nextjs-component
description: Author a Next.js 16 app-router component, page, layout, loading state, error boundary, Server Action, or Route Handler. Use when adding or modifying anything under `app/` or `components/`. Covers Server vs Client Component decision, file naming, colocation, required logging for server components and actions, and Vercel Style Guide notes.
---

# nextjs-component — Next.js 16 app-router conventions

This project runs Next.js **16.2.4** (pinned exact, no caret) with the
app router, React 19, and Turbopack dev. Vercel Git integration is
disabled; GitHub Actions is the only path to production.

## Server Component is the default

Start every new component as a Server Component. Only add `'use client'`
when you genuinely need:

- React state or effects (`useState`, `useEffect`, `useRef`).
- Browser-only APIs (`window`, `document`, `localStorage`).
- Event handlers that fire in the browser (`onClick`, `onChange`).
- Context providers (Supabase browser client, theming toggles).

If in doubt: start server, add `'use client'` when the type error
actually forces it. Server Components stream faster and ship zero JS.

## File naming and colocation

- **Kebab-case filenames**: `post-card.tsx`, `auth-required-sheet.tsx`.
- **PascalCase exported components**: `export function PostCard()`.
- **Default exports** for Next.js convention files only
  (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`,
  `route.ts`, `default.tsx`, `global-error.tsx`, `template.tsx`).
- **Named exports** for everything else (components under
  `components/`, utilities under `lib/`, etc.). The ESLint config
  disables `import/no-default-export` globally BECAUSE Next convention
  files need it — but in code you control, prefer named exports.
- **Colocate** `loading.tsx` and `error.tsx` with the `page.tsx` they
  protect. A public route at `app/(public)/post/[slug]/` already has
  both.

## Server Component with data fetch

Pattern (matches `app/page.tsx`):

```ts
import { createLogger, logError } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getHomeScreenData } from '@/lib/data/public/home';

const log = createLogger('home');

export default async function HomePage() {
  const start = performance.now();
  const supabase = await createServerSupabaseClient();
  const currentUserId = await getAuthUserId(supabase);

  try {
    const { data } = await getHomeScreenData(currentUserId);
    log.info(
      {
        event: 'home.rendered',
        feed_count: data.feed.length,
        subjects_count: data.subjects.length,
        authenticated: Boolean(currentUserId),
        duration_ms: Math.round(performance.now() - start),
      },
      'home data fetched',
    );
    return <HomePageShell items={data.feed} subjects={data.subjects} />;
  } catch (err) {
    logError(log, err, { event: 'home.error', message: 'home data fetch failed' });
    throw err; // let error.tsx catch it
  }
}
```

**Required:** entry + exit log with `duration_ms` on every Server
Component that fetches data. Use `createLogger('<route>')` at module
top.

## Server Action

Pattern (matches `lib/actions/account.ts`):

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createLogger, logError } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const log = createLogger('account');

export async function myAction(formData: FormData) {
  log.info({ event: 'action.start' }, 'action requested');
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    log.error({ event: 'action.unauthenticated' }, 'no authenticated user');
    throw new Error('Authentication required');
  }

  const { error } = await supabase.from('...').update({ ... }).eq('user_id', userId);
  if (error) {
    logError(log, error, { event: 'action.update_failed', user_id: userId });
    throw new Error('Enregistrement impossible pour le moment.');
  }

  log.info({ event: 'action.success', user_id: userId }, 'action succeeded');
  revalidatePath('/me');
  redirect('/me');
}
```

## Route Handler

Pattern (matches `app/api/account/username-availability/route.ts`):

```ts
import { NextResponse } from 'next/server';
import { createLogger, logError, withRequest } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const baseLog = createLogger('api.<area>');

export async function GET(request: Request) {
  const log = withRequest(baseLog, request);
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { data, error } = await supabase.from('...').select('...');
  if (error) {
    logError(log, error, { event: 'query.failed', user_id: userId });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

Use `withRequest(baseLog, request)` for every route handler — it binds
method, path, user_agent, and the `x-request-id` header if the proxy
middleware set one.

## Middleware — DO NOT WRITE NEW ONE

This project's middleware (`proxy.ts` at repo root — Next.js 16
renamed it from `middleware.ts`) does ONE thing:
- Refresh auth session via `updateSession` in `lib/supabase/middleware.ts`.
- Gate `/me` behind auth for GET requests.

If you think you need to add middleware logic, stop. Discuss first.
Middleware is the wrong place for almost everything (routing lives in
route segments, authorization lives in the route or RLS).

## Server Actions vs Route Handlers — when to use which

| Use Server Action when... | Use Route Handler when... |
|---|---|
| The UI form submits directly to this action | You need a callable URL (e.g. webhooks, fetch from external, non-Next clients) |
| The action is consumed only from within this Next.js app | You need to return non-HTML content (JSON feeds, files, PDFs) |
| You want `revalidatePath` / `revalidateTag` semantics | The caller isn't a Next.js form |
| You want to `redirect()` as the response | You need custom HTTP status or headers not available in actions |

## Next.js 16 conventions in this project

- Middleware file is **`proxy.ts`** (renamed in Next 16); export is
  `proxy()`. Not `middleware.ts`.
- `next` pinned to exact `16.2.4` in `package.json` (no caret).
- `searchParams` and `params` are **Promises** in page props:
  ```ts
  export default async function Page({
    searchParams,
  }: {
    searchParams: Promise<{ next?: string }>;
  }) {
    const { next } = await searchParams;
  }
  ```
- `cookies()` from `next/headers` is async in server components.
- `typedRoutes: true` is enabled in `next.config.ts` — use `UrlObject`
  form when href has dynamic parts:
  ```ts
  <Link href={{ pathname: '/auth/login', query: { next } }}>…</Link>
  ```

## Vercel Style Guide notes

- `@vercel/style-guide` is installed; `.eslintrc.cjs` extends it.
- Most of its rules run on auto-fix via `npm run lint -- --fix`.
- A handful of rules are off project-wide (documented in
  `.eslintrc.cjs` with justifications): `explicit-function-return-type`,
  `require-await`, `restrict-template-expressions`, `no-unsafe-*`,
  `prefer-nullish-coalescing`, `no-non-null-assertion`, `camelcase`,
  `import/no-default-export`, `no-nested-ternary`, `button-has-type`.
- `no-console: error` project-wide. App code uses the Pino logger
  (`lib/logger.ts`). Client boundaries that can't reach the logger
  use `eslint-disable-next-line no-console -- <reason>` with a reason.

## See also

- `reference/vercel-style-notes.md` — project-specific notes on the
  style guide and deviations.
- `.claude/skills/logging` — the Pino logger and event taxonomy.
- `.claude/skills/authentication` — the four Supabase client factories.
- Next.js App Router docs: https://nextjs.org/docs/app
