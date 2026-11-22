import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          framework: ['react', 'react-dom', 'react-router'],
          data: ['@tanstack/react-query', 'zod'],
        },
      },
      onwarn: (warning, warn) => {
        // zod ships PURE annotations that Rollup cannot interpret; they are
        // third-party comments only and do not affect the produced bundle.
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules/zod')) {
          return
        }
        warn(warning)
      },
    },
  },
})
