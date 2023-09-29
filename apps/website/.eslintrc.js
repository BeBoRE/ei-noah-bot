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
    'react/jsx-props-no-spreading': 'off',
    'react/prop-types': ['error', {
      ignorePatterns: ['className']
    }]
  },
};
