import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

const highlight = new Set(['plague_level', 'bandit_power', 'town_fear', 'truth_progress'])
const goodHigh = new Set(['town_order', 'guard_power', 'truth_progress', 'merchant_route_safety', 'herb_stock'])

export function WorldVariablesPanel() {
  const pack = useGameStore((state) => state.contentPack)
  const runtime = useGameStore((state) => state.runtime)!
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="size-4" />世界危机概览</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pack.variables.map((variable) => {
          const value = runtime.worldState.variables[variable.key]
          const min = variable.min ?? 0
          const max = variable.max ?? 100
          const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
          const danger = goodHigh.has(variable.key) ? value <= min + (max - min) * 0.35 : value >= min + (max - min) * 0.65
          return (
            <div key={variable.key}>
              <div className="mb-1 flex justify-between text-xs"><span className={highlight.has(variable.key) ? 'text-amber-100' : 'text-stone-300'}>{variable.name}</span><span className="text-stone-400">{value}</span></div>
              <div className="h-1.5 rounded-full bg-white/10"><div className={danger ? 'h-full rounded-full bg-red-300/65' : 'h-full rounded-full bg-amber-200/50'} style={{ width: `${percent}%` }} /></div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
