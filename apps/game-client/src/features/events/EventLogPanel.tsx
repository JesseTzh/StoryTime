import { History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@tss/ui'
import { cn } from '@/lib/cn'
import { useGameStore } from '@/store/game-store'
import { TIME_SEGMENT_LABEL } from '@tss/schema'
import type { GameLog } from '@tss/schema'
import { getPlayerRelatedLogs } from './eventLogFilters'

const emptyLogs: GameLog[] = []

type EventLogPanelProps = {
  logs?: GameLog[]
  className?: string
  emptyText?: string
}

export function EventLogPanel({ logs: providedLogs, className, emptyText = '暂无记录。' }: EventLogPanelProps = {}) {
  const storeLogs = useGameStore((state) => state.runtime?.eventLogs) ?? emptyLogs
  const logs = getPlayerRelatedLogs(providedLogs ?? storeLogs)
  return (
    <Card className={cn('flex h-full flex-col overflow-hidden border-white/10 bg-black/40 backdrop-blur-md', className)} data-test-id="event-log-panel">
      <CardHeader className="shrink-0 border-b border-white/10 bg-black/20 pb-4 pt-4" data-test-id="event-log-header">
        <CardTitle className="flex items-center gap-2 text-amber-100" data-test-id="event-log-title"><History className="size-4" data-test-id="event-log-title-icon" />故事纪要</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 overflow-y-auto p-4" data-test-id="event-log-content">
        {logs.length === 0 && <p className="text-sm text-stone-500" data-test-id="event-log-empty">{emptyText}</p>}
        {[...logs].slice(-80).reverse().map((log) => (
          <div key={log.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm" data-test-id={`event-log-item-${log.id}`}>
            <div className="mb-1 text-[11px] text-stone-500" data-test-id={`event-log-meta-${log.id}`}>第 {log.day} 天 · {TIME_SEGMENT_LABEL[log.segment]} · {log.type}</div>
            <div className="text-stone-200" data-test-id={`event-log-message-${log.id}`}>{log.message}</div>
            {log.detail && <div className="mt-1 text-xs leading-5 text-stone-500" data-test-id={`event-log-detail-${log.id}`}>{log.detail}</div>}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
