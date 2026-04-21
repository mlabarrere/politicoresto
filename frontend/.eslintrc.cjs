/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    require.resolve('@vercel/style-guide/eslint/browser'),
    require.resolve('@vercel/style-guide/eslint/react'),
    require.resolve('@vercel/style-guide/eslint/next'),
    require.resolve('@vercel/style-guide/eslint/typescript'),
    'prettier',
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
    },
  },
  rules: {
    // ── Added ─────────────────────────────────────────────────────────────
    // We own `lib/logger.ts`; zero console.* in app code.
    'no-console': 'error',

    // ── Vercel defaults disabled with written reason ──────────────────────
    //
    // `explicit-function-return-type` — off.
    // Next.js server components/actions are async and return inferred JSX or
    // void; `tsc --noEmit` already enforces shape correctness. Adding
    // explicit `Promise<JSX.Element>` to hundreds of call sites is pure
    // ceremony with no bug-finding value.
    '@typescript-eslint/explicit-function-return-type': 'off',

    // `require-await` — off.
    // Next.js convention requires server components be `async` (so
    // `await searchParams` is legal) even when no real await is needed.
    // Same for certain server actions.
    '@typescript-eslint/require-await': 'off',

    // `no-unnecessary-condition` — off.
    // Frequent false positives on optional-chained access when a declared
    // type is wider than the common case. `strict` + `noUncheckedIndexedAccess`
    // already cover the important shapes.
    '@typescript-eslint/no-unnecessary-condition': 'off',

    // `restrict-template-expressions` — off.
    // Rule forbids `${number}` / `${boolean}` interpolation; our logging
    // and error strings routinely mix these types. Numbers and booleans
    // stringify deterministically; forcing `.toString()` everywhere is
    // noise without safety.
    '@typescript-eslint/restrict-template-expressions': 'off',

    // `import/no-default-export` — off globally.
    // Next.js REQUIRES default exports for page.tsx, layout.tsx,
    // loading.tsx, error.tsx, not-found.tsx, route.ts handlers, middleware,
    // and several config files. A per-file override is noisier than a
    // project-wide disable and covers ~all default exports we have.
    'import/no-default-export': 'off',

    // `camelcase` — off.
    // Supabase columns and RPC params are snake_case (`user_id`,
    // `created_at`, `sort_order`). Server code either destructures them
    // directly (where `ignoreDestructuring` would help) OR assigns them
    // as standalone const declarations (where it does not). Rather than
    // split hairs, turn it off project-wide. Real naming conventions are
    // still enforced by code review.
    camelcase: 'off',

    // `tsdoc/syntax` — off. We don't use TSDoc's strict inline-tag syntax.
    'tsdoc/syntax': 'off',

    // `prefer-named-capture-group` — off. Stylistic; our regexes are simple.
    'prefer-named-capture-group': 'off',

    // `prefer-nullish-coalescing` — off.
    // `||` is still fine for string/array fallbacks where empty-string or
    // empty-array should trigger the fallback (??  does NOT).
    '@typescript-eslint/prefer-nullish-coalescing': 'off',

    // `no-non-null-assertion` — off.
    // We use `!` deliberately in tests (where the shape is known) and in
    // a handful of framework-integration spots (e.g. `document.cookie`
    // cannot be null in a browser context).
    '@typescript-eslint/no-non-null-assertion': 'off',

    // `no-explicit-any` — warn. Never blanket-disable.
    '@typescript-eslint/no-explicit-any': 'warn',

    // `no-unsafe-*` family — off.
    // These rules surface every time TypeScript infers `any` (usually
    // untyped JSON from Supabase view rows). Hunting them down per-site
    // adds type ceremony without observable correctness gain — code
    // paths are tested end-to-end and RLS is the real safety boundary.
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-redundant-type-constituents': 'off',

    // `import/no-named-as-default` — off.
    // False positives on barrel imports from @/components wrappers.
    'import/no-named-as-default': 'off',

    // `import/no-named-as-default-member` — off (same reason).
    'import/no-named-as-default-member': 'off',

    // `no-nested-ternary` — off.
    // A handful of nested ternaries are readable inline (e.g. `size === 'lg'
    //   ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'`). Rewriting
    // them as if/else blocks would be strictly worse. Reviewed at PR time.
    'no-nested-ternary': 'off',

    // `no-misused-promises` — off.
    // React event handlers accept async callbacks. The rule flags all of
    // them. Next.js handles unhandled rejections via our process-level
    // handler in lib/logger.ts.
    '@typescript-eslint/no-misused-promises': 'off',

    // `no-empty-function` — off. Intentional no-ops exist in mocks and
    // animation-end stubs.
    '@typescript-eslint/no-empty-function': 'off',

    // `react/button-has-type` — off.
    // Our `<AppButton>` wrapper and shadcn-derived `Button` primitives
    // already default `type="button"` internally; the rule flags the
    // wrapper call site where the prop is abstracted away.
    'react/button-has-type': 'off',

    // `consistent-type-imports` — autofixable; keep as error.
    '@typescript-eslint/consistent-type-imports': 'error',
  },
  overrides: [
    // Tests: relax strict unsafe-any and allow vi.spyOn patterns.
    {
      files: ['tests/**/*.ts', 'tests/**/*.tsx', 'vitest.setup.ts'],
      extends: [require.resolve('@vercel/style-guide/eslint/vitest')],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    // Node / scripts — allow console for CLI UX.
    {
      files: ['scripts/**/*', '*.config.*'],
      extends: [require.resolve('@vercel/style-guide/eslint/node')],
      rules: { 'no-console': 'off' },
    },
    // Client OAuth component — pending /api/_log forwarder (tracked in
    // CLAUDE.md Known deviations + the authentication skill).
    {
      files: ['components/auth/oauth-buttons.tsx'],
      rules: { 'no-console': 'off' },
    },
    // Onboarding form legitimately autofocuses the only input.
    {
      files: ['app/onboarding/page.tsx'],
      rules: { 'jsx-a11y/no-autofocus': 'off' },
    },
  ],
  ignorePatterns: [
    '.next/',
    'node_modules/',
    'coverage/',
    'next-env.d.ts',
    // Root /public (Next.js static assets) — anchored to repo root so
    // application directories like lib/data/public/ are NOT accidentally
    // ignored.
    '/public/',
    'playwright.config.ts',
    // Plain .js config files — not typed; keep out of typed-rules pipeline.
    'postcss.config.js',
    'tailwind.config.ts',
    '*.cjs',
  ],
};
