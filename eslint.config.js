// eslint.config.js

import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script', // CommonJS mode
    },

    env: {
      node: true, // <-- THIS fixes require, module.exports, __dirname
      es2024: true,
    },

    plugins: {
      prettier,
    },

    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: 'req|res|next|val' }],
      'no-console': 'warn',
    },
  },
];
