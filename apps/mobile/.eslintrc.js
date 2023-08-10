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
    'react/react-in-jsx-scope': 'off',
    'global-require': 'off',
    'react/require-default-props': 'off',
  }
};
