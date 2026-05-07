import { Backpack, HeartPulse, UserRound } from 'lucide-react'
import { relationKey } from '@tss/engine'
import type { PlayerAttributeState } from '@tss/schema'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

const attributeLabels: Record<keyof PlayerAttributeState, string> = {
  health: '生命',
  stamina: '体力',
  money: '钱',
  reputation: '声望',
  combat: '武力',
  negotiation: '交涉',
  medicine: '医术',
  stealth: '潜行',
}

const trackedAttributes: Array<keyof PlayerAttributeState> = ['health', 'stamina', 'money', 'reputation', 'combat', 'negotiation', 'medicine', 'stealth']

export function PlayerPanel() {
  const pack = useGameStore((state) => state.contentPack)
  const runtime = useGameStore((state) => state.runtime)!
  const identity = pack.identities.find((item) => item.id === runtime.player.identity)
  const currentLocation = pack.locations.find((item) => item.id === runtime.player.locationId)
  const inventory = Object.entries(runtime.player.inventory)
    .filter(([, count]) => count > 0)
    .map(([itemId, count]) => ({ item: pack.items.find((item) => item.id === itemId), itemId, count }))
  const nearbyNpcs = pack.npcs
    .filter((npc) => runtime.worldState.npcs[npc.id]?.locationId === runtime.player.locationId && runtime.worldState.npcs[npc.id]?.state.alive !== false)
    .slice(0, 4)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserRound className="size-4" />{identity?.name ?? '旅人'}</CardTitle>
        <p className="text-xs leading-5 text-stone-400">当前位置：{currentLocation?.name ?? runtime.player.locationId}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {trackedAttributes.map((attribute) => (
            <AttributeMeter key={attribute} attribute={attribute} value={runtime.player.state[attribute]} cap={identity?.initialState[attribute]} />
          ))}
        </div>

        <section>
          <div className="mb-2 flex items-center gap-2 text-sm text-amber-100"><Backpack className="size-4" />物品</div>
          {inventory.length === 0 ? (
            <p className="text-xs text-stone-500">暂未携带可用物品。</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inventory.map(({ item, itemId, count }) => (
                <Badge key={itemId}>{item?.name ?? itemId} x {count}</Badge>
              ))}
            </div>
          )}
        </section>

        {nearbyNpcs.length > 0 && (
          <section>
            <div className="mb-2 text-sm text-amber-100">附近关系</div>
            <div className="space-y-2">
              {nearbyNpcs.map((npc) => {
                const relationship = runtime.worldState.relationships[relationKey('player', npc.id)]
                const activity = runtime.worldState.npcs[npc.id]?.state.currentActivity
                return (
                  <div key={npc.id} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-stone-200">{npc.name}</span>
                      <span className="text-stone-500">{npc.identity}</span>
                    </div>
                    <div className="mt-1 text-stone-400">
                      信任 {relationship?.trust ?? 0} · 感激 {relationship?.gratitude ?? 0} · 疑心 {relationship?.suspicion ?? 0}
                      {typeof activity === 'string' ? ` · ${activity}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  )
}

function AttributeMeter({ attribute, value, cap }: { attribute: keyof PlayerAttributeState; value: number; cap?: number }) {
  const max = Math.max(cap ?? 100, value, attribute === 'money' ? 200 : 100)
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  const isVital = attribute === 'health' || attribute === 'stamina'
  return (
    <div className="rounded-md bg-black/20 p-2">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1 text-stone-300">{attribute === 'health' && <HeartPulse className="size-3" />}{attributeLabels[attribute]}</span>
        <span className={isVital && value < 25 ? 'text-red-200' : 'text-stone-400'}>{value}</span>
      </div>
      <div className="h-1 rounded-full bg-white/10">
        <div className={isVital && value < 25 ? 'h-full rounded-full bg-red-300/70' : 'h-full rounded-full bg-cyan-200/55'} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
