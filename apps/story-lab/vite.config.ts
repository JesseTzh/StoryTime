import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function resolvePagesBasePath() {
  const basePath = process.env.TSS_PAGES_BASE_PATH?.trim()
  if (!basePath || basePath === '/') return '/'

  const trimmedBasePath = basePath.replace(/^\/+|\/+$/g, '')
  return `/${trimmedBasePath}/`
}

export default defineConfig({
  base: resolvePagesBasePath(),
  plugins: [react()],
  publicDir: fileURLToPath(new URL('../../content', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tss/schema': fileURLToPath(new URL('../../packages/schema/src/index.ts', import.meta.url)),
      '@tss/engine': fileURLToPath(new URL('../../packages/engine/src/index.ts', import.meta.url)),
      '@tss/validator': fileURLToPath(new URL('../../packages/validator/src/index.ts', import.meta.url)),
    },
  },
})
