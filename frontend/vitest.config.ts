import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.integration.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test/**',
        'src/app/main.tsx',
        'src/shared/i18n/resources/**',
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        'src/shared/config/env.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/shared/lib/languageStorage.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/app/routing/usePageModule.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/entities/catalog/model/*': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/entities/catalog/api/*': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/entities/catalog/ui/CatalogCard.tsx': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/entities/catalog/ui/PosterFallback.tsx': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/entities/catalog/model/searchQuery.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/entities/catalog/model/searchState.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/entities/catalog/api/catalogKeys.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
})
