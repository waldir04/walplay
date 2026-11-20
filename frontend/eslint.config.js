import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const rawHexSelector = 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}){1,2}$/]'
const importMetaEnvSelector =
  "MemberExpression[object.type='MetaProperty'][object.meta.name='import'][object.property.name='meta'][property.name='env']"

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: rawHexSelector,
          message: 'Use semantic design tokens instead of raw hex colors.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/config/env.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: rawHexSelector,
          message: 'Use semantic design tokens instead of raw hex colors.',
        },
        {
          selector: importMetaEnvSelector,
          message: 'Read environment values only through src/shared/config/env.ts.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Tests assert the canonical token values from the constitution, so
      // literal hex values are required there; component code stays token-only.
      'no-restricted-syntax': [
        'error',
        {
          selector: importMetaEnvSelector,
          message: 'Read environment values only through src/shared/config/env.ts.',
        },
      ],
    },
  }
)
