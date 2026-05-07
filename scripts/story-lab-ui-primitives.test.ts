import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

test('story lab ui primitives use shadcn-style foundations', () => {
  const uiSource = readFileSync('apps/story-lab/src/components/ui.tsx', 'utf8')
  const buttonSource = readFileSync('packages/ui/src/components/button.tsx', 'utf8')
  const badgeSource = readFileSync('packages/ui/src/components/badge.tsx', 'utf8')
  const cnSource = readFileSync('packages/ui/src/lib/utils.ts', 'utf8')

  expect(uiSource, 'story-lab should use the shared UI package').toContain('@tss/ui')
  expect(buttonSource, 'Button should support shadcn asChild through Slot').toMatch(/@radix-ui\/react-slot/)
  expect(buttonSource, 'Button variants should use cva').toMatch(/class-variance-authority/)
  expect(buttonSource, 'Button variants should be centralized').toMatch(/buttonVariants/)
  expect(badgeSource, 'Badge variants should be centralized').toMatch(/badgeVariants/)
  expect(buttonSource + badgeSource, 'UI primitives should pass through test IDs').toMatch(/\.\.\.props/)
  expect(cnSource, 'cn should merge Tailwind-style classes').toMatch(/tailwind-merge/)
  expect(cnSource, 'cn should normalize conditional class inputs').toMatch(/clsx/)
})
