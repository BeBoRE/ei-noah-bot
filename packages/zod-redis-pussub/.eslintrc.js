/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: ['custom'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@typescript-eslint/indent': 'off',
    'no-console': 'error',
  },
  ignorePatterns: ['dist', 'node_modules'],
};
