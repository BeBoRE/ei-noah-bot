require('@rushstack/eslint-patch/modern-module-resolution');

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: ['next', 'turbo', 'eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'max-len': 'off',
  },
  env: {
    node: true,
    es2020: true,
  },
  globals: {
    NodeJS: 'readonly',
  },
  ignorePatterns: ['node_modules/', '.eslintrc.js', 'Migration*.ts', 'next.config.js', 'next-env.d.ts', '*.config.js'],
};
