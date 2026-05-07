import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { readCssWithImports } from './css-test-utils'

const storyLabSourceRoot = 'apps/story-lab/src'
const concreteStoryPatterns = ['青岚镇', 'qinglan_town', 'qinglan-town']

function source(path: string) {
  return readFileSync(join(storyLabSourceRoot, path), 'utf8')
}

test('story lab source does not hardcode concrete story content', () => {
  const files = [
    'App.tsx',
    'components/common.tsx',
    'components/ui.tsx',
    'editor/template-catalog.ts',
    'pages/editor-pages.tsx',
  ]

  for (const file of files) {
    const content = source(file)
    for (const pattern of concreteStoryPatterns) {
      expect(content, `${file} must not hardcode concrete story content: ${pattern}`).not.toContain(pattern)
    }
  }
})

test('story lab templates and NPC views use conversations instead of legacy dialogues', () => {
  const templateCatalog = source('editor/template-catalog.ts')
  const npcStudio = source('pages/editor/npc-studio-page.tsx')
  const storyFiles = source('editor/story-files.ts')

  expect(templateCatalog).toContain('conversations[]')
  expect(templateCatalog).not.toContain('DIALOGUE_TYPES')
  expect(npcStudio).toContain('ConversationList')
  expect(npcStudio).not.toContain('DialogueList')
  expect(storyFiles).toContain('conversations.json')
  expect(storyFiles).not.toContain('dialogues.json')
})

test('story lab conversation branch list is grouped by NPC before titles', () => {
  const page = source('pages/editor/conversation-branch-page.tsx')

  expect(page).toContain('conversation-branch-npc-group-')
  expect(page).toContain('conversation-branch-npc-title-')
  expect(page).toContain('conversation-branch-select-')
  expect(page).not.toContain('conversation-branch-meta-')
  expect(page).not.toContain('节点 ·')
  expect(page).not.toContain('回复</small>')
})

test('story lab uses interaction and quest terminology instead of legacy action branches', () => {
  const readSourceFiles = (dir: string): string[] => readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (entry === 'story-projects.ts') return []
    if (stat.isDirectory()) return readSourceFiles(path)
    return /\.[tj]sx?$/.test(entry) ? [path] : []
  })
  const combined = readSourceFiles(storyLabSourceRoot).map((file) => readFileSync(file, 'utf8')).join('\n')

  expect(combined).not.toContain('events[].playerOptions')
  expect(combined).not.toMatch(/(^|[^a-z])actions\[\]/)
  expect(combined).not.toContain('玩家选项')
  expect(combined).toContain('interactions[]')
  expect(combined).toContain('quests[]')
  expect(combined).toContain('rewards[]')
})

test('story lab map implementation does not depend on Pixi', () => {
  const packageJson = readFileSync('apps/story-lab/package.json', 'utf8')
  expect(packageJson).not.toContain('"pixi.js"')

  const mapSourceRoot = join(storyLabSourceRoot, 'features/map')
  const mapSourceFiles = readdirSync(mapSourceRoot).filter((file) => /\.[tj]sx?$/.test(file))

  for (const file of mapSourceFiles) {
    expect(
      readFileSync(join(mapSourceRoot, file), 'utf8'),
      `${file} must not import or reference Pixi`,
    ).not.toMatch(/\bpixi(?:\.js)?\b/i)
  }
})

test('story lab SVG map stretches sprites to the calibrated tile boxes', () => {
  const content = source('features/map/StoryMapSvg.tsx')

  expect(content).not.toContain('xMidYMid meet')
  expect(content.match(/preserveAspectRatio="none"/g)?.length).toBeGreaterThanOrEqual(2)
})

test('story lab SVG map clips tile highlights with terrain alpha masks', () => {
  const content = source('features/map/StoryMapSvg.tsx')

  expect(content).toContain('maskUnits="userSpaceOnUse"')
  expect(content).toContain("style={{ maskType: 'alpha' }}")
  expect(content).toContain('mask={`url(#${layout.terrainMaskId})`}')
  expect(content).toContain('data-test-id={layout.terrainMaskTestId}')
  expect(content).not.toMatch(/data-test-id=\{layout\.overlayTestId\}[\s\S]{0,240}points=\{terrainDiamondPoints\(\)\}/)
})

test('story lab SVG map derives edge highlights from terrain alpha', () => {
  const content = source('features/map/StoryMapSvg.tsx')

  expect(content).toContain('data-test-id={layout.terrainEdgeFilterTestId}')
  expect(content).toContain('data-test-id={layout.terrainEdgeDilateTestId}')
  expect(content).toContain('data-test-id={layout.terrainEdgeBandTestId}')
  expect(content).toContain('data-test-id={layout.terrainEdgeGlowTestId}')
  expect(content).toContain('in="SourceAlpha"')
  expect(content).toContain('operator="dilate"')
  expect(content).toContain('operator="out"')
  expect(content).toContain('data-test-id={layout.overlayEdgeTestId}')
  expect(content).toContain('data-test-id={layout.overlayFillMaskGroupTestId}')
  expect(content).toContain('filter={`url(#${layout.terrainEdgeFilterId})`}')
})

test('story lab map uses a fullscreen stage with an internal sliding detail drawer', () => {
  const mapComponent = source('features/map/StoryMapSvg.tsx')
  const pageSource = source('pages/editor/map-page.tsx')
  const styles = readCssWithImports('apps/story-lab/src/styles.css')

  expect(mapComponent).toContain('tileId?: string')
  expect(mapComponent).toContain('tileId: getPointerTileId(event.target)')
  expect(mapComponent).toContain('const activationTileId = resolveTileActivationFromPointer(dragRef.current)')
  expect(mapComponent).toContain('if (activationTileId) onTileActivate(activationTileId)')
  expect(mapComponent).toContain('data-map-tile-id={tile.id}')
  expect(mapComponent).toContain('onTileActivate(tileId)')
  expect(mapComponent).not.toContain('activateTileFromPointer(tile.id)')
  expect(mapComponent).toContain('{detailDrawer}')
  expect(mapComponent).not.toContain('map-toolbar')
  expect(mapComponent).not.toContain('map-stage-footer')
  expect(mapComponent).not.toContain('map-stage-move-button')

  expect(pageSource).toContain('setMapDetailOpen(true)')
  expect(pageSource).toContain("className={mapDetailOpen ? 'map-detail-drawer is-open' : 'map-detail-drawer'}")
  expect(pageSource).toContain('testId="map-header"')
  expect(pageSource).toContain('title="地图与地点"')
  expect(pageSource).not.toContain('map-grid-card')
  expect(pageSource).not.toContain('map-detail-move-button')
  expect(pageSource).not.toContain('map-player-panel')
  expect(pageSource).not.toContain('map-description-stack')
  expect(pageSource).not.toContain('map-description-${segment}')

  expect(styles).toContain('.lab-main[data-test-id="story-lab-main-map"]')
  expect(styles).toMatch(/\.lab-main\[data-test-id="story-lab-main-map"\]\s*{[^}]*display:\s*flex/s)
  expect(styles).toMatch(/\.lab-main\[data-test-id="story-lab-main-map"\]\s*\.page-header\s*{[^}]*flex:\s*0 0 auto/s)
  expect(styles).toMatch(/\.lab-main\[data-test-id="story-lab-main-map"\]\s*\.map-layout\s*{[^}]*flex:\s*1 1 auto/s)
  expect(styles).toMatch(/\.map-detail-drawer\s*{[^}]*transform:\s*translateX\(calc\(100% \+ 24px\)\)/s)
  expect(styles).toMatch(/\.map-detail-drawer\s*{[^}]*transition:/s)
  expect(styles).toMatch(/\.map-detail-drawer\.is-open\s*{[^}]*transform:\s*translateX\(0\)/s)
  expect(styles).not.toContain('.map-player-panel')
})

test('story lab map shows a stage loading overlay until map assets settle', () => {
  const mapComponent = source('features/map/StoryMapSvg.tsx')
  const styles = readCssWithImports('apps/story-lab/src/styles.css')

  expect(mapComponent).toContain('const [isLoadingAssets, setIsLoadingAssets] = useState(true)')
  expect(mapComponent).toContain('new Image()')
  expect(mapComponent).toContain('image.onload = settleAsset')
  expect(mapComponent).toContain('image.onerror = settleAsset')
  expect(mapComponent).toContain('data-test-id="map-loading-overlay"')
  expect(mapComponent).toContain('data-test-id="map-loading-spinner"')
  expect(mapComponent).toContain('data-test-id="map-loading-text"')

  expect(styles).toContain('.map-loading-overlay')
  expect(styles).toMatch(/\.map-loading-overlay\s*{[^}]*position:\s*absolute/s)
  expect(styles).toMatch(/\.map-loading-overlay\s*{[^}]*z-index:\s*4/s)
  expect(styles).toContain('@keyframes map-loading-spin')
})
