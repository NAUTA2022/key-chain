import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['build', '.react-router', 'node_modules', 'src', 'public', 'app/lib/api/schema.ts']),
  {
    files: ['app/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strict,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Route modules export meta/handle/loader alongside the component.
    files: ['app/**/*.{ts,tsx}'],
    ignores: ['app/routes/**', 'app/root.tsx', 'app/lib/**'],
    extends: [reactRefresh.configs.vite],
  },
  {
    files: ['*.js', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
    extends: [js.configs.recommended],
  },
  {
    files: ['*.ts'],
    languageOptions: { globals: globals.node },
    extends: [js.configs.recommended, ...tseslint.configs.strict],
  },
]);
