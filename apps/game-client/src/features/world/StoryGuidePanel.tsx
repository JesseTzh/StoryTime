import { AlertTriangle, CheckCircle2, Compass, MapPin, ScrollText } from 'lucide-react'
import type { ContentPack, GameRuntimeState, Quest, QuestRuntimeState } from '@tss/schema'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

type GuideItem = {
  id: string
  title: string
  detail: string
  locationId?: string
  tone?: 'normal' | 'urgent' | 'done'
}

export function StoryGuidePanel() {
  const pack = useGameStore((state) => state.contentPack)
  const runtime = useGameStore((state) => state.runtime)!
  const focusLocation = useGameStore((state) => state.focusLocation)
  const guideItems = buildGuideItems(pack, runtime)
  const daysLeft = Math.max(0, pack.world.maxDays - runtime.time.day + 1)

  return (
    <Card data-test-id="story-guide-panel">
      <CardHeader data-test-id="story-guide-header">
        <div className="flex items-start justify-between gap-3" data-test-id="story-guide-header-content">
          <div>
            <CardTitle className="flex items-center gap-2" data-test-id="story-guide-title"><Compass className="size-4" />当前目标</CardTitle>
            <p className="mt-1 text-xs text-stone-400" data-test-id="story-guide-summary">还剩 {daysLeft} 天 · 已记录 {runtime.worldState.eventHistory.length} 个事件</p>
          </div>
          <Badge className="border-amber-300/30 text-amber-100" data-test-id="story-guide-active-quest-count">{Object.values(runtime.worldState.quests).filter((quest) => quest.status === 'active').length} 项任务</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3" data-test-id="story-guide-content">
        <div className="space-y-2" data-test-id="story-guide-items">
          {guideItems.map((item) => {
            const location = item.locationId ? pack.locations.find((entry) => entry.id === item.locationId) : undefined
            return (
              <div key={item.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3" data-test-id={`story-guide-item-${item.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-stone-100" data-test-id={`story-guide-item-title-${item.id}`}>
                      {item.tone === 'urgent' ? <AlertTriangle className="size-4 text-red-200" /> : item.tone === 'done' ? <CheckCircle2 className="size-4 text-emerald-200" /> : <ScrollText className="size-4 text-amber-100" />}
                      <span>{item.title}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-stone-400" data-test-id={`story-guide-item-detail-${item.id}`}>{item.detail}</p>
                  </div>
                  {item.locationId && (
                    <Button data-test-id={`story-guide-location-${item.id}`} variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => focusLocation(item.locationId!)}>
                      <MapPin className="mr-1 size-3" />{location?.name ?? '地点'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function buildGuideItems(pack: ContentPack, runtime: GameRuntimeState): GuideItem[] {
  const items: GuideItem[] = []
  const questStates = Object.values(runtime.worldState.quests)
  for (const questState of questStates.filter((quest) => quest.status === 'active').slice(0, 3)) {
    const quest = pack.quests.find((item) => item.id === questState.id)
    if (!quest) continue
    items.push({
      id: `quest_${quest.id}`,
      title: quest.title,
      detail: quest.description,
      locationId: getQuestLocationId(pack, runtime, quest),
      tone: statusTone(questState),
    })
  }

  if (items.length === 0) {
    const currentLocation = pack.locations.find((location) => location.id === runtime.player.locationId)
    items.push({
      id: 'hold_course',
      title: '继续推进',
      detail: currentLocation ? `当前位于 ${currentLocation.name}，可查看地点交互或结束时段推动世界变化。` : '可查看地点交互或结束时段推动世界变化。',
      locationId: runtime.player.locationId,
      tone: 'done',
    })
  }

  return items.slice(0, 5)
}

function statusTone(questState: QuestRuntimeState): GuideItem['tone'] {
  if (questState.status === 'completed') return 'done'
  if (questState.status === 'failed') return 'urgent'
  return 'normal'
}

function getQuestLocationId(pack: ContentPack, runtime: GameRuntimeState, quest: Quest): string | undefined {
  const completion = quest.completion
  if (completion.type === 'conversation' || completion.type === 'give') {
    return runtime.worldState.npcs[completion.npcId]?.locationId ?? pack.npcs.find((npc) => npc.id === completion.npcId)?.location
  }
  if (completion.targetType === 'location') return completion.targetId
  if (completion.targetType === 'building') return pack.buildings.find((building) => building.id === completion.targetId)?.locationId
  if (completion.targetType === 'npc') return runtime.worldState.npcs[completion.targetId]?.locationId ?? pack.npcs.find((npc) => npc.id === completion.targetId)?.location
  return pack.maps.flatMap((map) => map.tiles).find((tile) => tile.id === completion.targetId)?.locationId
}
