import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const pageSource = readFileSync(fileURLToPath(new URL('./conversation-branch-page.tsx', import.meta.url)), 'utf8')
const editorStyles = readFileSync(fileURLToPath(new URL('../../styles/editor.css', import.meta.url)), 'utf8')

test('renders conversation branch status badges with the square badge style', () => {
  expect(pageSource).toContain('conversation-branch-status-badge')
  expect(editorStyles).toContain('.conversation-title-row .conversation-branch-status-badge')
  expect(editorStyles).toMatch(/\.conversation-title-row \.conversation-branch-status-badge\s*\{[^}]*border-radius: 8px;/)
})

test('collapses NPC conversation groups by default and toggles them from the NPC row', () => {
  expect(pageSource).toContain('useState<Set<string>>')
  expect(pageSource).toContain('defaultExpandedNpcIds')
  expect(pageSource).toContain('toggleNpcGroup')
  expect(pageSource).toContain('conversation-branch-npc-toggle-')
  expect(pageSource).toContain('conversation-branch-npc-expanded-')
  expect(pageSource).toContain('{expanded && (')
})
