import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const sourceRoot = 'apps/game-client/src'

function sourceFiles(dir = sourceRoot): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(tsx?|css)$/.test(entry) ? [path] : []
  })
}

function readSource(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('game-client source constraints', () => {
  it('does not hardcode concrete story content in source files', () => {
    const offenders = sourceFiles()
      .map((path) => ({ path, source: readSource(path) }))
      .filter(({ source }) => /青岚|qinglan|Qinglan/.test(source))
      .map(({ path }) => path)

    expect(offenders).toEqual([])
  })

  it('uses shared map assets instead of app-local duplicate texture files', () => {
    const source = readSource('apps/game-client/src/features/map/gameMapAssets.ts')

    expect(source).toContain('../../../../shared-assets/map/')
    expect(source).not.toContain('apps/game-client/src/assets')
  })

  it('keeps the top-level game surfaces addressable by data-test-id', () => {
    const requiredSources = [
      'apps/game-client/src/App.tsx',
      'apps/game-client/src/pages/game/game-page.tsx',
      'apps/game-client/src/pages/game/identity-page.tsx',
      'apps/game-client/src/pages/game/story-pack-select-page.tsx',
      'apps/game-client/src/features/map/GameMapSvg.tsx',
    ]

    for (const path of requiredSources) {
      expect(readSource(path), path).toContain('data-test-id')
    }
  })

  it('adds data-test-id to interactive controls', () => {
    const offenders = sourceFiles()
      .filter((path) => !path.includes('/components/ui/'))
      .flatMap((path) => {
        const source = readSource(path)
        const matches = source.matchAll(/<(button|input|select|textarea)\b(?![^>]*data-test-id=)[^>]*>/g)
        return [...matches].map((match) => `${path}:${match[0]}`)
      })

    expect(offenders).toEqual([])
  })

  it('uses the dedicated conversation UI instead of NPC dialogue action aggregation', () => {
    const storeSource = readSource('apps/game-client/src/store/game-store.ts')
    const tilePanelSource = readSource('apps/game-client/src/features/map/components/TileInfoPanel.tsx')

    expect(storeSource).toContain('startConversation')
    expect(storeSource).toContain('chooseConversationReply')
    expect(storeSource).not.toContain("interaction.targetType === 'npc'")
    expect(tilePanelSource).toContain('data-test-id="tile-conversation-section"')
    expect(tilePanelSource).toContain('ConversationPanel')
  })

  it('game client no longer renders pending event choice surface', () => {
    const combined = sourceFiles().map((file) => readSource(file)).join('\n')

    expect(combined).not.toContain('EventChoicePanel')
    expect(combined).not.toContain('resolveEventOption')
    expect(combined).not.toContain('getAvailableActionsForSelectedTile')
    expect(combined).not.toContain('可执行行动')
    expect(combined).toContain('QuestPanel')
  })

  it('starts with story pack selection instead of auto-loading the default pack', () => {
    const appSource = readSource('apps/game-client/src/App.tsx')
    const mainSource = readSource('apps/game-client/src/main.tsx')
    const selectSource = readSource('apps/game-client/src/pages/game/story-pack-select-page.tsx')

    expect(mainSource).not.toContain('loadDefaultContentPack')
    expect(mainSource).not.toContain('initializeGameStore')
    expect(appSource).toContain('StoryPackSelectPage')
    expect(appSource).toContain('loadContentPackManifest')
    expect(appSource).toContain('loadContentPack')
    expect(selectSource).toContain('data-test-id="story-pack-select-page"')
    expect(selectSource).toContain('data-test-id="story-pack-select-list"')
    expect(selectSource).toContain('data-test-id={`story-pack-select-card-${pack.packId}`}')
    expect(selectSource).toContain('data-test-id={`story-pack-select-button-${pack.packId}`}')
    expect(selectSource).not.toMatch(/青岚|qinglan|Qinglan/)
  })

  it('renders content-authored origin intros without hardcoded story text', () => {
    const identitySource = readSource('apps/game-client/src/pages/game/identity-page.tsx')
    const gamePageSource = readSource('apps/game-client/src/pages/game/game-page.tsx')
    const storeSource = readSource('apps/game-client/src/store/game-store.ts')
    const dialogSource = readSource('apps/game-client/src/features/game/OriginIntroDialog.tsx')

    expect(identitySource).toContain('identity.backgroundSummary')
    expect(identitySource).not.toContain(`pack.world.${['player', 'Introduction'].join('')}`)
    expect(identitySource).not.toContain('data-test-id="identity-world-introduction"')
    expect(identitySource).toContain('data-test-id={`identity-background-summary-${identity.id}`}')
    expect(gamePageSource).toContain('OriginIntroDialog')
    expect(storeSource).toContain('dismissOriginIntro')
    expect(storeSource).toContain('origin_intro_seen')
    expect(dialogSource).toContain('identity.intro')
    expect(dialogSource).toContain('overlayTestId="origin-intro-dialog-overlay"')
    expect(dialogSource).toContain('data-test-id="origin-intro-dialog-close"')
    expect(dialogSource).not.toMatch(/青岚|qinglan|Qinglan/)
  })

  it('keeps identity selection cards focused on authored identity details', () => {
    const identitySource = readSource('apps/game-client/src/pages/game/identity-page.tsx')
    const styles = readSource('apps/game-client/src/styles/game.css')

    expect(identitySource).not.toContain('identity-attribute')
    expect(identitySource).not.toContain('identity.initialState')
    expect(identitySource).toContain('开始游戏')
    expect(identitySource).not.toContain('选择身份进入世界')
    expect(styles).toMatch(/\.identity-grid\s*{[^}]*grid-auto-rows:\s*1fr/s)
    expect(styles).toMatch(/\.identity-card-content\s*{[^}]*flex:\s*1/s)
    expect(styles).toMatch(/\.identity-card-content button\s*{[^}]*margin-top:\s*auto/s)
  })

  it('uses compact in-map game surfaces instead of standalone status cards', () => {
    const pageSource = readSource('apps/game-client/src/pages/game/game-page.tsx')
    const topStatusSource = readSource('apps/game-client/src/features/player/TopStatusBar.tsx')
    const mapSource = readSource('apps/game-client/src/features/map/GameMapSvg.tsx')
    const worldMapSource = readSource('apps/game-client/src/features/map/components/WorldMapGrid.tsx')
    const styles = readSource('apps/game-client/src/styles/map.css')

    expect(pageSource).not.toContain('WorldVariablesPanel')
    expect(pageSource).not.toContain('PlayerPanel')
    expect(pageSource).not.toContain('SavePanel')
    expect(pageSource).not.toContain('<TileInfoPanel />')
    expect(pageSource).not.toContain('game-state-column')

    expect(topStatusSource).toContain('overlayTestId="top-status-day-dialog"')
    expect(topStatusSource).toContain('data-test-id="top-status-player-vitals-popover"')
    expect(topStatusSource).not.toContain('data-test-id="top-status-player-vitals-health"')
    expect(topStatusSource).toContain('data-test-id="top-status-player-vitals-health-icon"')
    expect(topStatusSource).not.toContain('data-test-id="top-status-player-vitals-health-label"')
    expect(topStatusSource).not.toContain('data-test-id="top-status-player-vitals-stamina"')
    expect(topStatusSource).toContain('data-test-id="top-status-player-vitals-stamina-icon"')
    expect(topStatusSource).not.toContain('data-test-id="top-status-player-vitals-stamina-label"')
    expect(topStatusSource).not.toContain('data-test-id="top-status-player-vitals-money"')
    expect(topStatusSource).toContain('data-test-id="top-status-player-vitals-money-icon"')
    expect(topStatusSource).not.toContain('data-test-id="top-status-player-vitals-money-label"')
    expect(topStatusSource).not.toContain('data-test-id="top-status-nearby-section"')
    expect(topStatusSource).not.toContain('data-test-id="top-status-nearby-list"')
    expect(topStatusSource).not.toContain('className="status-chip" data-test-id="top-status-player-vital-health-chip"')
    expect(topStatusSource).not.toContain('className="status-chip" data-test-id="top-status-player-vital-stamina-chip"')
    expect(topStatusSource).not.toContain('className="status-chip" data-test-id="top-status-player-vital-money-chip"')
    expect(topStatusSource).toContain('data-test-id="top-status-system-menu"')
    expect(topStatusSource).toContain('data-test-id="top-status-system-reset"')
    expect(topStatusSource).toContain('data-test-id="top-status-system-save"')
    expect(topStatusSource).toContain('data-test-id="top-status-system-export"')
    expect(topStatusSource).toContain('data-test-id="top-status-system-import"')
    expect(topStatusSource).not.toContain('data-test-id="top-status-rest"')

    expect(mapSource).toContain('detailDrawer?: ReactNode')
    expect(mapSource).toContain('{detailDrawer}')
    expect(worldMapSource).toContain('detailDrawer={<TileInfoPanel')
    expect(worldMapSource).toContain('data-test-id="world-map-current-location"')
    expect(styles).toMatch(/\.game-map-detail-drawer\s*{[^}]*left:\s*18px/s)
    expect(styles).toMatch(/\.game-map-detail-drawer\s*{[^}]*transform:\s*translateX\(calc\(-100% - 24px\)\)/s)
    expect(styles).toMatch(/\.game-map-detail-drawer\.is-open\s*{[^}]*transform:\s*translateX\(0\)/s)
  })

  it('mounts top status overlays at the document top layer', () => {
    const topStatusSource = readSource('apps/game-client/src/features/player/TopStatusBar.tsx')
    const dialogSource = readSource('packages/ui/src/components/dialog.tsx')
    const popoverSource = readSource('packages/ui/src/components/popover.tsx')
    const styles = readSource('apps/game-client/src/styles/ui.css')

    expect(dialogSource).toContain('DialogPrimitive.Portal')
    expect(dialogSource).toContain('DialogOverlay data-test-id={overlayTestId}')
    expect(dialogSource).toContain('z-50')
    expect(popoverSource).toContain('PopoverPrimitive.Portal')

    expect(topStatusSource).toContain('PopoverContent')
    expect(topStatusSource).toContain('overlayTestId="top-status-system-dialog"')
    expect(topStatusSource).toContain('data-test-id="top-status-player-vitals-detail"')
    expect(topStatusSource).not.toContain('top-status-system:hover')

    expect(styles).not.toMatch(/\.top-status-popover-panel\s*{[^}]*position:\s*fixed/s)
    expect(styles).not.toMatch(/\.top-status-popover-panel\s*{[^}]*z-index:\s*210/s)
    expect(styles).toMatch(/\.top-status-vital-inline\s*{[^}]*display:\s*inline-flex/s)
    expect(styles).toMatch(/\.top-status-vital-inline\s*{[^}]*flex-direction:\s*row/s)
    expect(styles).toMatch(/\.top-status-vital-inline\s*{[^}]*white-space:\s*nowrap/s)
  })
})
