import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { Lock, Route, Zap } from 'lucide-react'
import { getTileWithRuntime, relationKey } from '@tss/engine'
import type { ActionCost, Interaction } from '@tss/schema'
import { TIME_SEGMENT_LABEL } from '@tss/schema'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@tss/ui'
import { ConversationPanel } from '@/features/conversation/ConversationPanel'
import { gameMapDetailCardBackgroundAssetUrl } from '@/features/map/gameMapAssets'
import { useGameStore } from '@/store/game-store'

const interactionTypeLabel: Record<Interaction['type'], string> = {
  conversation: '对话',
  give: '给予',
  combat: '战斗',
  environment: '环境',
}

export function TileInfoPanel() {
  const pack = useGameStore((state) => state.contentPack)
  const runtime = useGameStore((state) => state.runtime)!
  const moveToSelectedLocation = useGameStore((state) => state.moveToSelectedLocation)
  const executeInteraction = useGameStore((state) => state.executeInteraction)
  const getAvailableInteractionsForSelectedTile = useGameStore((state) => state.getAvailableInteractionsForSelectedTile)
  const selectedConversationNpcId = useGameStore((state) => state.selectedConversationNpcId)
  const selectConversationNpc = useGameStore((state) => state.selectConversationNpc)
  const tile = useMemo(() => {
    if (!runtime.selectedTileId) return undefined
    const selected = pack.maps[0].tiles.find((item) => item.id === runtime.selectedTileId)
    return selected ? getTileWithRuntime(runtime, selected) : undefined
  }, [pack, runtime])

  const interactionEntries = useMemo(() => getAvailableInteractionsForSelectedTile(), [getAvailableInteractionsForSelectedTile, runtime.selectedTileId, runtime.worldState, runtime.time.actionPoints])

  if (!tile) return null
  const location = tile.locationId ? pack.locations.find((item) => item.id === tile.locationId) : undefined
  const runtimeLocation = location ? runtime.worldState.locations[location.id] : undefined
  const buildings = location ? pack.buildings.filter((item) => location.buildingIds.includes(item.id)) : []
  const npcs = location ? pack.npcs.filter((npc) => runtime.worldState.npcs[npc.id]?.locationId === location.id && runtime.worldState.npcs[npc.id]?.state.alive !== false) : []
  const description = location?.descriptions[runtime.time.segment] ?? location?.descriptions.default
  const isCurrentLocation = runtime.player.locationId === location?.id
  const selectedNpcId = selectedConversationNpcId && npcs.some((npc) => npc.id === selectedConversationNpcId) ? selectedConversationNpcId : undefined
  const canTravel = Boolean(location && runtimeLocation?.accessible && tile.visible && tile.discovered && !tile.blocked && !isCurrentLocation && runtime.time.actionPoints > 0)
  const sortedInteractions = [...interactionEntries].sort((a, b) => Number(b.available) - Number(a.available))

  return (
    <Card
      className="game-map-detail-drawer is-open"
      data-test-id="tile-info-panel"
      aria-hidden={false}
      style={{ '--game-map-detail-card-background-image': `url(${gameMapDetailCardBackgroundAssetUrl})` } as CSSProperties}
    >
      <CardHeader data-test-id="tile-info-header">
        <div className="flex items-center justify-between gap-2" data-test-id="tile-info-header-row">
          <CardTitle data-test-id="tile-info-title">{tile.discovered ? tile.name : '未知地块'}</CardTitle>
          <Badge data-test-id="tile-info-danger">危险 {tile.dangerLevel}</Badge>
        </div>
        <p className="text-xs text-stone-400" data-test-id="tile-info-meta">地形：{tile.terrain} · 时间：{TIME_SEGMENT_LABEL[runtime.time.segment]}</p>
      </CardHeader>
      <CardContent className="space-y-4 overflow-auto" data-test-id="tile-info-content">
        {!location && (
          <p className="flex min-h-40 items-center justify-center text-center text-sm text-stone-400" data-test-id="tile-info-no-location">
            这里空无一物
          </p>
        )}
        {location && (
          <>
            <p className="rounded-lg bg-white/[0.04] p-3 text-sm leading-7 text-stone-300" data-test-id="tile-info-description">{description}</p>
            <Button className="w-full" data-test-id="tile-travel-button" onClick={moveToSelectedLocation} disabled={!canTravel}>
              <Route className="mr-1 size-4" data-test-id="tile-travel-icon" />{isCurrentLocation ? '你正在此地' : '前往此地（1 行动点）'}
            </Button>
            <section data-test-id="tile-conversation-section">
              <h3 className="mb-2 text-sm text-amber-100" data-test-id="tile-conversation-title">在场 NPC</h3>
              {npcs.length === 0 ? (
                <p className="text-xs text-stone-500" data-test-id="tile-conversation-empty">此刻没有可交谈的熟人。</p>
              ) : (
                <div className="flex flex-wrap gap-2" data-test-id="tile-conversation-npc-list">
                  {npcs.map((npc) => {
                    const relationship = runtime.worldState.relationships[relationKey('player', npc.id)]
                    const activity = runtime.worldState.npcs[npc.id]?.state.currentActivity
                    return (
                      <Button
                        key={npc.id}
                        className={npc.id === selectedNpcId ? 'border-amber-300/60' : ''}
                        data-test-id={`tile-conversation-npc-${npc.id}`}
                        disabled={!isCurrentLocation}
                        size="sm"
                        variant="outline"
                        onClick={() => selectConversationNpc(npc.id)}
                      >
                        {npc.name} · 信任 {relationship?.trust ?? 0}{typeof activity === 'string' ? ` · ${activity}` : ''}
                      </Button>
                    )
                  })}
                </div>
              )}
              {!isCurrentLocation && npcs.length > 0 && <p className="mt-2 text-xs text-stone-500" data-test-id="tile-conversation-disabled-reason">需要先前往此地才可交谈。</p>}
              <div className="mt-3" data-test-id="tile-conversation-panel">
                <ConversationPanel npcId={isCurrentLocation ? selectedNpcId : undefined} />
              </div>
            </section>
            <section data-test-id="tile-building-section">
              <h3 className="mb-2 text-sm text-amber-100" data-test-id="tile-building-title">建筑</h3>
              <div className="space-y-2" data-test-id="tile-building-list">{buildings.map((building) => <div key={building.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3" data-test-id={`tile-building-row-${building.id}`}><div className="text-sm text-stone-100" data-test-id={`tile-building-name-${building.id}`}>{building.name}</div><div className="mt-1 text-xs leading-5 text-stone-400" data-test-id={`tile-building-description-${building.id}`}>{building.descriptions.default}</div></div>)}</div>
            </section>
            <section data-test-id="tile-interaction-section">
              <h3 className="mb-2 text-sm text-amber-100" data-test-id="tile-interaction-title">可用交互</h3>
              <div className="space-y-2" data-test-id="tile-interaction-list">
                {sortedInteractions.length === 0 && <p className="text-sm text-stone-500" data-test-id="tile-interaction-empty">此地暂时没有可用交互。</p>}
                {sortedInteractions.map(({ interaction, available, reasons }) => {
                  const blockedByLocation = runtime.player.locationId !== location.id
                  const unavailableText = blockedByLocation ? '需要先前往此地' : reasons.join('；')
                  return (
                    <div key={interaction.id} className="rounded-lg border border-white/10 bg-black/15 p-3" data-test-id={`tile-interaction-row-${interaction.id}`}>
                      <div className="flex items-start justify-between gap-3" data-test-id={`tile-interaction-row-body-${interaction.id}`}>
                        <div className="min-w-0" data-test-id={`tile-interaction-copy-${interaction.id}`}>
                          <div className="text-sm text-stone-100" data-test-id={`tile-interaction-name-${interaction.id}`}>{interaction.name}</div>
                          <div className="mt-1 text-xs leading-5 text-stone-400" data-test-id={`tile-interaction-description-${interaction.id}`}>{interaction.description}</div>
                          <div className="mt-2 flex flex-wrap gap-1" data-test-id={`tile-interaction-badges-${interaction.id}`}>
                            <Badge data-test-id={`tile-interaction-type-${interaction.id}`}>{interactionTypeLabel[interaction.type]}</Badge>
                            {interaction.type === 'environment' && <Badge data-test-id={`tile-interaction-environment-${interaction.id}`}>{interaction.environmentType === 'gather' ? '采集' : '搜索'}</Badge>}
                            {formatCost(interaction.cost).map((item) => <Badge key={item} className="text-stone-300" data-test-id={`tile-interaction-cost-${interaction.id}-${item}`}>{item}</Badge>)}
                          </div>
                          {!available || blockedByLocation ? <div className="mt-2 flex items-start gap-1 text-xs text-red-200" data-test-id={`tile-interaction-unavailable-${interaction.id}`}><Lock className="mt-0.5 size-3 shrink-0" data-test-id={`tile-interaction-unavailable-icon-${interaction.id}`} />{unavailableText}</div> : null}
                        </div>
                        <Button className="shrink-0" data-test-id={`tile-interaction-execute-${interaction.id}`} disabled={!available || blockedByLocation} onClick={() => executeInteraction(interaction.id)}><Zap className="mr-1 size-4" data-test-id={`tile-interaction-execute-icon-${interaction.id}`} />执行</Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function formatCost(cost?: ActionCost): string[] {
  if (!cost) return ['1 行动点']
  const parts: string[] = []
  if (cost.actionPoints) parts.push(`${cost.actionPoints} 行动点`)
  if (cost.stamina) parts.push(`${cost.stamina} 体力`)
  if (cost.money) parts.push(`${cost.money} 钱`)
  if (cost.health) parts.push(`${cost.health} 生命`)
  if (cost.itemId) parts.push(`${cost.itemId} x ${cost.itemCount ?? 1}`)
  return parts.length > 0 ? parts : ['1 行动点']
}
