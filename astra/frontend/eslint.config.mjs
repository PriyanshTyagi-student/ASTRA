import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ['components/ui/sidebar.tsx'],
    rules: {
      'react-hooks/purity': 'off',
    },
  },
  {
    files: ['components/ui/use-toast.ts', 'hooks/use-toast.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]

export default eslintConfig
