import { fileURLToPath, URL } from 'node:url'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { compile } from 'tailwindcss'

const require = createRequire(import.meta.url)
const sourceRoot = fileURLToPath(new URL('./src', import.meta.url))
const uiRoot = fileURLToPath(new URL('../../packages/ui/src', import.meta.url))

function tailwindCssPlugin(): Plugin {
  return {
    name: 'tss-tailwindcss-v4',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('/src/styles.css')) return null
      const files = [...await collectSourceFiles(sourceRoot), ...await collectSourceFiles(uiRoot)]
      for (const file of files) this.addWatchFile(file)

      const compiler = await compile(code, {
        base: sourceRoot,
        loadStylesheet: async (stylesheetId, base) => {
          const path = resolveStylesheet(stylesheetId, base)
          return {
            path,
            base: dirname(path),
            content: await readFile(path, 'utf8'),
          }
        },
      })

      return {
        code: compiler.build(await collectCandidates(files)),
        map: null,
      }
    },
  }
}

async function collectSourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(path)
    if (/\.(tsx?|jsx?|html)$/.test(entry.name)) return [path]
    return []
  }))
  return files.flat()
}

async function collectCandidates(files: string[]): Promise<string[]> {
  const candidates = new Set<string>()
  const contents = await Promise.all(files.map((file) => readFile(file, 'utf8')))
  for (const content of contents) {
    for (const match of content.match(/[\w!:[\]().,%#/-]+/g) ?? []) {
      candidates.add(match)
    }
  }
  return [...candidates]
}

function resolveStylesheet(id: string, base: string): string {
  if (id === 'tailwindcss') return require.resolve('tailwindcss/index.css')
  if (id.startsWith('tailwindcss/')) return require.resolve(id)
  return resolve(base, id)
}

function resolvePagesBasePath() {
  const basePath = process.env.TSS_PAGES_BASE_PATH?.trim()
  if (!basePath || basePath === '/') return '/'

  const trimmedBasePath = basePath.replace(/^\/+|\/+$/g, '')
  return `/${trimmedBasePath}/`
}

export default defineConfig({
  base: resolvePagesBasePath(),
  plugins: [react(), tailwindCssPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tss/schema': fileURLToPath(new URL('../../packages/schema/src/index.ts', import.meta.url)),
      '@tss/engine': fileURLToPath(new URL('../../packages/engine/src/index.ts', import.meta.url)),
      '@tss/ui': fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)),
    },
  },
})
