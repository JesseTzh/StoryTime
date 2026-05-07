import { CheckCircle2, CircleDot, MapPin, ScrollText, XCircle } from 'lucide-react'
import type { ContentPack, GameRuntimeState, Quest, QuestCompletion, QuestRuntimeState } from '@tss/schema'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

export function QuestPanel() {
  const pack = useGameStore((state) => state.contentPack)
  const runtime = useGameStore((state) => state.runtime)!
  const focusLocation = useGameStore((state) => state.focusLocation)
  const getQuestEntries = useGameStore((state) => state.getQuestEntries)
  const entries = getQuestEntries()

  return (
    <Card className="flex h-full flex-col overflow-hidden border-white/10 bg-black/40 backdrop-blur-md" data-test-id="quest-panel">
      <CardHeader className="shrink-0 border-b border-white/10 bg-black/20 pb-4 pt-4" data-test-id="quest-panel-header">
        <CardTitle className="flex items-center gap-2 text-amber-100" data-test-id="quest-panel-title">
          <ScrollText className="size-4" data-test-id="quest-panel-title-icon" />
          任务
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 overflow-y-auto p-4" data-test-id="quest-panel-content">
        {entries.length === 0 && <p className="text-sm text-stone-500" data-test-id="quest-panel-empty">暂无任务。</p>}
        {entries.map(({ quest, state }) => {
          const source = pack.npcs.find((npc) => npc.id === quest.sourceNpcId)
          const locationId = getQuestLocationId(pack, runtime, quest)
          const location = locationId ? pack.locations.find((item) => item.id === locationId) : undefined
          return (
            <div key={quest.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3" data-test-id={`quest-row-${quest.id}`}>
              <div className="flex items-start justify-between gap-3" data-test-id={`quest-row-header-${quest.id}`}>
                <div className="min-w-0" data-test-id={`quest-row-copy-${quest.id}`}>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-100" data-test-id={`quest-row-title-${quest.id}`}>
                    <QuestStatusIcon status={state.status} questId={quest.id} />
                    <span data-test-id={`quest-row-title-text-${quest.id}`}>{quest.title}</span>
                    <QuestStatusBadge status={state.status} questId={quest.id} />
                  </div>
                  <p className="mt-1 text-xs text-stone-500" data-test-id={`quest-row-source-${quest.id}`}>来源：{source?.name ?? quest.sourceNpcId}</p>
                </div>
                {locationId && (
                  <Button className="shrink-0 text-xs" data-test-id={`quest-focus-location-${quest.id}`} size="sm" variant="outline" onClick={() => focusLocation(locationId)}>
                    <MapPin className="mr-1 size-3" data-test-id={`quest-focus-location-icon-${quest.id}`} />
                    {location?.name ?? '地点'}
                  </Button>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-300" data-test-id={`quest-row-description-${quest.id}`}>{quest.description}</p>
              <p className="mt-2 text-xs leading-5 text-stone-400" data-test-id={`quest-row-completion-${quest.id}`}>{formatCompletion(quest.completion)}</p>
              <div className="mt-2 flex flex-wrap gap-1" data-test-id={`quest-row-rewards-${quest.id}`}>
                {quest.rewardIds.map((rewardId) => {
                  const reward = pack.rewards.find((item) => item.id === rewardId)
                  return <Badge key={rewardId} className="text-stone-300" data-test-id={`quest-reward-${quest.id}-${rewardId}`}>{reward?.name ?? rewardId}</Badge>
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function QuestStatusIcon({ status, questId }: { status: QuestRuntimeState['status']; questId: string }) {
  if (status === 'completed') return <CheckCircle2 className="size-4 text-emerald-200" data-test-id={`quest-status-icon-${questId}`} />
  if (status === 'failed') return <XCircle className="size-4 text-red-200" data-test-id={`quest-status-icon-${questId}`} />
  return <CircleDot className="size-4 text-amber-100" data-test-id={`quest-status-icon-${questId}`} />
}

function QuestStatusBadge({ status, questId }: { status: QuestRuntimeState['status']; questId: string }) {
  const label = status === 'completed' ? '已完成' : status === 'failed' ? '失败' : '进行中'
  return <Badge data-test-id={`quest-status-${questId}`}>{label}</Badge>
}

function formatCompletion(completion: QuestCompletion): string {
  if (completion.type === 'conversation') return '完成方式：对话'
  if (completion.type === 'give') return `完成方式：给予 ${completion.itemId} x ${completion.itemCount}`
  if (completion.type === 'combat') return '完成方式：战斗胜利'
  return completion.environmentType === 'gather' ? '完成方式：采集' : '完成方式：搜索'
}

function getQuestLocationId(pack: ContentPack, runtime: GameRuntimeState, quest: Quest): string | undefined {
  const completion = quest.completion
  if (completion.type === 'conversation' || completion.type === 'give') return runtime?.worldState.npcs[completion.npcId]?.locationId ?? pack.npcs.find((npc) => npc.id === completion.npcId)?.location
  if (completion.targetType === 'location') return completion.targetId
  if (completion.targetType === 'building') return pack.buildings.find((building) => building.id === completion.targetId)?.locationId
  if (completion.targetType === 'npc') return runtime?.worldState.npcs[completion.targetId]?.locationId ?? pack.npcs.find((npc) => npc.id === completion.targetId)?.location
  return pack.maps.flatMap((map) => map.tiles).find((tile) => tile.id === completion.targetId)?.locationId
}
