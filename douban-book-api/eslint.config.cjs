module.exports = [
  {
    files: ['src/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        Buffer: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
        expect: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      indent: ['error', 2],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'quote-props': ['error', 'as-needed'],
    },
  },
];
