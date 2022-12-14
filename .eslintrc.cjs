module.exports = {
  extends: ['@educandu/eslint-config'],
  overrides: [
    {
      files: ['**/*.js'],
      rules: {
        'no-console': ['off']
      }
    }
  ]
};
