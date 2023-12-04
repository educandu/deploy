module.exports = {
  extends: ['./.eslint-config.cjs'],
  overrides: [
    {
      files: ['**/*.js'],
      rules: {
        'no-console': ['off']
      }
    }
  ]
};
