import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { readCssWithImports } from './css-test-utils'

const pageSource = readFileSync('apps/story-lab/src/pages/editor/world-page.tsx', 'utf8')
const sharedSource = readFileSync('apps/story-lab/src/pages/editor/shared.tsx', 'utf8')
const cssSource = readCssWithImports('apps/story-lab/src/styles.css')

test('world page groups world details into tabs', () => {
  expect(sharedSource).toContain("export type WorldTabId = 'basics' | 'variables' | 'affiliations' | 'runtime'")
  expect(pageSource).toContain("data-test-id=\"world-tabs-card\"")
  expect(pageSource).toContain("data-test-id={`world-tab-${tab.id}`}")
  expect(pageSource).toContain("data-test-id={`world-tab-panel-${activeWorldTab}`}")
  expect(pageSource).toContain('pack.world.editorBackground')
  expect(pageSource).toContain('data-test-id="world-basics-editor-background"')
  expect(pageSource).not.toContain(`pack.world.${['player', 'Introduction'].join('')}`)
  expect(pageSource).not.toContain('data-test-id="world-basics-player-introduction"')
  expect(pageSource).not.toContain('data-test-id="world-file-preview-section"')
})

test('world file list opens a modal preview with syntax highlighting', () => {
  expect(pageSource).toContain('openFilePreview')
  expect(pageSource).toContain('FilePreviewModal')
  expect(pageSource).toContain("data-test-id={`world-file-preview-button-${item.id}`}")
  expect(pageSource).toContain('data-test-id="world-file-preview-modal"')
  expect(pageSource).toContain('data-test-id="world-file-highlighted-content"')
  expect(pageSource).toContain('highlightJson')
})

test('world file preview button is shown on hover and focus', () => {
  expect(cssSource).toMatch(/\.file-preview-button\s*{[^}]*opacity:\s*0/s)
  expect(cssSource).toMatch(/\.file-row:hover\s+\.file-preview-button/s)
  expect(cssSource).toMatch(/\.file-row:focus-within\s+\.file-preview-button/s)
  expect(cssSource).toMatch(/\.syntax-key/s)
  expect(cssSource).toMatch(/\.preview-modal/s)
})
