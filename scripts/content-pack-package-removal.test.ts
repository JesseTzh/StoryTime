import { readFileSync, readdirSync, lstatSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { defaultContentRoot, discoverContentSourceDirs, loadContentPackFromSource } from './content-source'

const scanRoots = ['apps', 'content', 'docs', 'packages', 'scripts']
const rootFiles = ['package.json', 'pnpm-workspace.yaml', 'tsconfig.base.json', 'vitest.config.ts', 'README.md']
const ignoredDirs = new Set(['dist', 'node_modules'])
const ignoredFiles = new Set(['pnpm-lock.yaml'])

function repoFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (ignoredDirs.has(entry) || path === join('docs', 'superpowers')) return []
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) return []
    if (stat.isDirectory()) return repoFiles(path)
    if (ignoredFiles.has(entry)) return []
    return /\.(ts|tsx|json|yaml|md)$/.test(entry) ? [path] : []
  })
}

test('repo no longer depends on the removed content-pack workspace package', () => {
  const offenders = [
    ...rootFiles,
    ...scanRoots.flatMap((root) => repoFiles(root)),
  ]
    .filter((path) => path !== 'scripts/content-pack-package-removal.test.ts')
    .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
    .filter(({ source }) => source.includes('@tss/' + 'content-pack') || source.includes('packages/' + 'content-pack'))
    .map(({ path }) => path)

  expect(offenders).toEqual([])
})

test('generated content packs do not include legacy actions or event player options', async () => {
  const contentDirs = await discoverContentSourceDirs(defaultContentRoot)
  const packs = await Promise.all(contentDirs.map((dir) => loadContentPackFromSource(dir)))

  for (const pack of packs) {
    const raw = pack as unknown as Record<string, unknown>
    expect(raw.actions).toBeUndefined()
    expect(Array.isArray(raw.interactions)).toBe(true)
    expect(Array.isArray(raw.quests)).toBe(true)
    expect(Array.isArray(raw.rewards)).toBe(true)
    for (const event of pack.events as unknown as Array<Record<string, unknown>>) {
      expect(event.playerOptions).toBeUndefined()
    }
  }
})

test('content packs no longer include the removed split title field', async () => {
  const contentDirs = await discoverContentSourceDirs(defaultContentRoot)
  const packs = await Promise.all(contentDirs.map((dir) => loadContentPackFromSource(dir)))

  for (const pack of packs) {
    expect(pack).not.toHaveProperty('game' + 'Title')
  }
})
