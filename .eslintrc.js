const { monorepo } = require('@ulixee/repo-tools/eslint');

module.exports = monorepo(__dirname);
module.exports.overrides.push({
  files: ['**/*.ts'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    'no-console': 'off',
    'require-await': 'off',
    '@typescript-eslint/require-await': 'off',
  },
});
