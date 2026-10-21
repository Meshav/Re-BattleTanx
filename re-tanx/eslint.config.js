import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Limits from docs/12-code-architecture.md §12.1. Change them there first.
const sizeLimits = {
  'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
  'max-depth': ['error', 3],
  'max-params': ['error', 4],
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      ...sizeLimits,
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Named exports only (doc 12 §12.5).' },
      ],
    },
  },
  {
    // sim must run in browser, Node and Vitest alike: no renderer, no sockets, no platform APIs.
    files: ['packages/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['three', 'three/*', 'ws', 'node:*', 'fs', 'path', 'http', 'crypto'] },
      ],
    },
  },
  {
    // Test files describe scenarios; a long test is not a monolith.
    files: ['**/*.test.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    // Vite and Vitest require a default export from their config files.
    files: ['**/*.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
