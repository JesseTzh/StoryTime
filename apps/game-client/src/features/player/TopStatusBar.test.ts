import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const source = readFileSync(fileURLToPath(new URL('./TopStatusBar.tsx', import.meta.url)), 'utf8')

test('adds a settings view with a persisted debug mode toggle in the system dialog', () => {
  expect(source).toContain('const debugMode = useGameStore((state) => state.debugMode)')
  expect(source).toContain('const setDebugMode = useGameStore((state) => state.setDebugMode)')
  expect(source).toContain('data-test-id="top-status-system-settings"')
  expect(source).toContain('data-test-id="top-status-settings-debug-mode-toggle"')
  expect(source).toContain('checked={debugMode}')
  expect(source).toContain('onCheckedChange={setDebugMode}')
})
