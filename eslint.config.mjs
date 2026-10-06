import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  { ignores: ['.explore', 'node_modules', 'playwright-report', 'test-results', 'playwright/.auth', 'api-verification', 'scripts', '*.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts', 'pages/**/*.ts', 'fixtures/**/*.ts', 'utils/**/*.ts'],
  },
  {
    // Browser-side Clerk global is untyped.
    files: ['tests/setup/**/*.ts', 'fixtures/api.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // Project rules from CLAUDE.md that the recommended sets do not enforce.
    files: ['tests/**/*.ts', 'pages/**/*.ts', 'fixtures/**/*.ts', 'utils/**/*.ts'],
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      // Warn only: a few parametrised tests branch on isMobile or on an optional message.
      'playwright/no-conditional-in-test': 'warn',
      'playwright/no-networkidle': 'warn',
      'playwright/consistent-spacing-between-blocks': 'off',
      'playwright/prefer-locator': 'off',
      'playwright/expect-expect': ['warn', { assertFunctionNames: ['expect', 'expect*', 'verify*', 'assert*'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'playwright/no-force-option': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='catch'][arguments.0.body.body.length=0]",
          message: 'Do not swallow errors with an empty .catch(); assert or test.skip with a reason.',
        },
        {
          selector: "CallExpression[callee.name='setTimeout']",
          message: 'No sleeps; wait for a response, toast or element state.',
        },
      ],
    },
  },
);
