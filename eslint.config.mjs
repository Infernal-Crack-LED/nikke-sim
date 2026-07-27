import eslint from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      curly: 'error',
      'dot-notation': 'error',
      'require-await': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.test.*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['web/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['.qwen/icon-diag/*.mjs', 'scripts/pool-browser-check.mjs'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    ignores: [
      'dist/**/*',
      'web/dist/**/*',
      'node_modules/**/*',
      '.vite/**/*',
      '**/*.tsbuildinfo',
      'scripts/blind-rebuild/code-bundle/**/*',
      '**/*.txt',
    ],
  }
);
