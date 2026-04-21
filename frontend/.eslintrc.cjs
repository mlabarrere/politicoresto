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
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    // Project-specific choices (justified):
    //
    // no-console — we own `lib/logger.ts`. Zero console.* in app code.
    'no-console': 'error',
    //
    // Let us write `foo ?? bar` without the "prefer-nullish-coalescing"
    // fights when Vercel's guide default is too strict for local test code.
    //
    // The rest defers to @vercel/style-guide defaults.
    //
    // Allow "any" only as a last resort — no blanket disable.
    '@typescript-eslint/no-explicit-any': 'warn',
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
      rules: {
        'no-console': 'off',
      },
    },
    // Client OAuth component — pending /api/_log forwarder (tracked in
    // CLAUDE.md Known deviations + the authentication skill).
    {
      files: ['components/auth/oauth-buttons.tsx'],
      rules: { 'no-console': 'off' },
    },
  ],
  ignorePatterns: [
    '.next/',
    'node_modules/',
    'coverage/',
    'next-env.d.ts',
    'public/',
    'playwright.config.ts',
  ],
};
