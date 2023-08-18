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
    'no-console': 'error',
  },
};
