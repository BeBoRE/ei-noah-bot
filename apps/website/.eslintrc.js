/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: ['custom', 'next'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
