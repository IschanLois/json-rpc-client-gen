import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    rules: {
      'dot-notation': [ 'error', { allowKeywords: false } ],
      'prefer-const': ['error', { destructuring: 'any' }],
      'semi': ['error', 'never'],
      'prefer-arrow-callback': ['warn'],
      'no-trailing-spaces': ['error'],
      'comma-dangle': ['error', 'always-multiline'],
      'camelcase': ['error', {
        properties: 'never',
        ignoreImports: true,
        ignoreDestructuring: true,
        ignoreGlobals: true,
      }],
    },
    '@typescript-eslint/no-unsafe-function-type': 'allow',
  },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/*.js'],
  },
]
