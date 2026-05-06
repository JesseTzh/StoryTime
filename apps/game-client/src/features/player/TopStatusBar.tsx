import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Backpack, BatteryMedium, CalendarDays, Clock3, Coins, Download, HeartPulse, RotateCcw, Save, Settings, SlidersHorizontal, Upload, UserRound } from 'lucide-react'
import { TIME_SEGMENT_LABEL } from '@tss/schema'
import type { PlayerAttributeState } from '@tss/schema'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DialogBody, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { EventLogPanel } from '@/features/events/EventLogPanel'
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

export function TopStatusBar() {
  const [storyDialogOpen, setStoryDialogOpen] = useState(false)
  const [systemDialogOpen, setSystemDialogOpen] = useState(false)
  const [systemView, setSystemView] = useState<'actions' | 'settings'>('actions')
  const [vitalsOpen, setVitalsOpen] = useState(false)
  const [vitalsPosition, setVitalsPosition] = useState({ top: 0, left: 0 })
  const vitalsRef = useRef<HTMLDivElement>(null)
  const vitalsCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const runtime = useGameStore((state) => state.runtime)!
  const pack = useGameStore((state) => state.contentPack)
  const advanceTime = useGameStore((state) => state.advanceTime)
  const resetGame = useGameStore((state) => state.resetGame)
  const exportSave = useGameStore((state) => state.exportSave)
  const importSave = useGameStore((state) => state.importSave)
  const saveGame = useGameStore((state) => state.saveGame)
  const debugMode = useGameStore((state) => state.debugMode)
  const setDebugMode = useGameStore((state) => state.setDebugMode)
  const identity = pack.identities.find((item) => item.id === runtime.player.identity)
  const activeQuests = Object.values(runtime.worldState.quests).filter((quest) => quest.status === 'active').length
  const inventory = Object.entries(runtime.player.inventory)
    .filter(([, count]) => count > 0)
    .map(([itemId, count]) => ({ item: pack.items.find((item) => item.id === itemId), itemId, count }))
  function handleExport() {
    const raw = exportSave()
    if (!raw) return
    const blob = new Blob([raw], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${pack.packId}-save-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(file?: File) {
    if (!file) return
    importSave(await file.text())
  }

  function updateVitalsPosition() {
    const rect = vitalsRef.current?.getBoundingClientRect()
    if (!rect) return
    const panelWidth = Math.min(448, window.innerWidth - 32)
    setVitalsPosition({
      top: Math.min(rect.bottom + 8, window.innerHeight - 96),
      left: Math.max(16, Math.min(rect.left, window.innerWidth - panelWidth - 16)),
    })
  }

  function openVitalsPopover() {
    if (vitalsCloseTimerRef.current) window.clearTimeout(vitalsCloseTimerRef.current)
    updateVitalsPosition()
    setVitalsOpen(true)
  }

  function closeVitalsPopover() {
    if (vitalsCloseTimerRef.current) window.clearTimeout(vitalsCloseTimerRef.current)
    vitalsCloseTimerRef.current = setTimeout(() => setVitalsOpen(false), 80)
  }

  function closeSystemDialog() {
    setSystemDialogOpen(false)
    setSystemView('actions')
  }

  useEffect(() => {
    if (!vitalsOpen) return
    updateVitalsPosition()
    window.addEventListener('resize', updateVitalsPosition)
    window.addEventListener('scroll', updateVitalsPosition, true)
    return () => {
      window.removeEventListener('resize', updateVitalsPosition)
      window.removeEventListener('scroll', updateVitalsPosition, true)
    }
  }, [vitalsOpen])

  useEffect(() => {
    return () => {
      if (vitalsCloseTimerRef.current) window.clearTimeout(vitalsCloseTimerRef.current)
    }
  }, [])

  const vitalsDetail = (
    <div
      className="top-status-popover-panel"
      data-test-id="top-status-player-vitals-detail"
      onMouseEnter={openVitalsPopover}
      onMouseLeave={closeVitalsPopover}
      style={{ top: vitalsPosition.top, left: vitalsPosition.left }}
    >
      <div className="top-status-popover-title" data-test-id="top-status-player-vitals-title">
        <UserRound className="size-4" data-test-id="top-status-player-vitals-title-icon" />{identity?.name ?? '旅人'}
      </div>
      <div className="top-status-attribute-grid" data-test-id="top-status-attribute-grid">
        {trackedAttributes.map((attribute) => (
          <div key={attribute} className="top-status-attribute" data-test-id={`top-status-attribute-${attribute}`}>
            <span data-test-id={`top-status-attribute-label-${attribute}`}>{attributeLabels[attribute]}</span>
            <strong data-test-id={`top-status-attribute-value-${attribute}`}>{runtime.player.state[attribute]}</strong>
          </div>
        ))}
      </div>
      <section data-test-id="top-status-inventory-section">
        <div className="top-status-section-title" data-test-id="top-status-inventory-title"><Backpack className="size-4" data-test-id="top-status-inventory-icon" />物品</div>
        {inventory.length === 0 ? (
          <p className="top-status-empty" data-test-id="top-status-inventory-empty">暂未携带可用物品。</p>
        ) : (
          <div className="top-status-badge-list" data-test-id="top-status-inventory-list">
            {inventory.map(({ item, itemId, count }) => (
              <Badge key={itemId} data-test-id={`top-status-inventory-${itemId}`}>{item?.name ?? itemId} x {count}</Badge>
            ))}
          </div>
        )}
      </section>
    </div>
  )

  return (
    <Card className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-6 py-3 backdrop-blur-md" data-test-id="top-status-bar">
      <div className="top-status-left" data-test-id="top-status-left">
        <div data-test-id="top-status-summary">
          <div className="text-lg font-semibold text-amber-100" data-test-id="top-status-title">{pack.world.name}</div>
          <div className="mt-1 text-xs text-stone-400" data-test-id="top-status-identity">身份：{identity?.name}</div>
        </div>
        <div
          ref={vitalsRef}
          className="top-status-hover"
          data-test-id="top-status-player-vitals-popover"
          onMouseEnter={openVitalsPopover}
          onMouseLeave={closeVitalsPopover}
          onFocus={openVitalsPopover}
          onBlur={closeVitalsPopover}
        >
          <div className="top-status-vitals-list" data-test-id="top-status-player-vitals">
            <span className="top-status-vital-inline" data-test-id="top-status-player-vital-health-chip">
              <HeartPulse className="size-4" data-test-id="top-status-player-vitals-health-icon" />
              <strong data-test-id="top-status-player-vitals-health-value">{runtime.player.state.health}</strong>
            </span>
            <span className="top-status-vital-inline" data-test-id="top-status-player-vital-stamina-chip">
              <BatteryMedium className="size-4" data-test-id="top-status-player-vitals-stamina-icon" />
              <strong data-test-id="top-status-player-vitals-stamina-value">{runtime.player.state.stamina}</strong>
            </span>
            <span className="top-status-vital-inline" data-test-id="top-status-player-vital-money-chip">
              <Coins className="size-4" data-test-id="top-status-player-vitals-money-icon" />
              <strong data-test-id="top-status-player-vitals-money-value">{runtime.player.state.money}</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm" data-test-id="top-status-controls">
        <button className="status-chip" data-test-id="top-status-day" type="button" onClick={() => setStoryDialogOpen(true)}>
          <CalendarDays className="size-4" data-test-id="top-status-day-icon" />第 {runtime.time.day} / {pack.world.maxDays} 天
        </button>
        <span className="status-chip" data-test-id="top-status-segment"><Clock3 className="size-4" data-test-id="top-status-segment-icon" />{TIME_SEGMENT_LABEL[runtime.time.segment]}</span>
        <span className="status-chip is-accent" data-test-id="top-status-action-points">行动点 {runtime.time.actionPoints}</span>
        {activeQuests > 0 && <span className="status-chip is-accent" data-test-id="top-status-active-quests">任务 {activeQuests}</span>}
        <Button data-test-id="top-status-advance-time" variant="outline" onClick={advanceTime}><Clock3 className="mr-1 size-4" data-test-id="top-status-advance-time-icon" />结束时段</Button>
        <div className="top-status-system-trigger" data-test-id="top-status-system-menu">
          <Button data-test-id="top-status-system-button" variant="ghost" onClick={() => setSystemDialogOpen(true)}><Settings className="mr-1 size-4" data-test-id="top-status-system-icon" />系统</Button>
          <input data-test-id="top-status-system-import-input" ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(event) => handleImport(event.target.files?.[0])} />
        </div>
      </div>
      {vitalsOpen && typeof document !== 'undefined' && createPortal(vitalsDetail, document.body)}
      {storyDialogOpen && (
        <DialogOverlay data-test-id="top-status-day-dialog" onClick={() => setStoryDialogOpen(false)}>
          <DialogContent className="max-w-3xl" data-test-id="top-status-day-dialog-content" onClick={(event) => event.stopPropagation()}>
            <DialogHeader data-test-id="top-status-day-dialog-header">
              <DialogTitle data-test-id="top-status-day-dialog-title">故事纪要</DialogTitle>
            </DialogHeader>
            <DialogBody className="max-h-[72vh] overflow-hidden p-0" data-test-id="top-status-day-dialog-body">
              <EventLogPanel logs={runtime.eventLogs} className="h-[72vh] rounded-none border-0 bg-transparent" emptyText="暂无主角相关记录。" />
            </DialogBody>
          </DialogContent>
        </DialogOverlay>
      )}
      {systemDialogOpen && (
        <DialogOverlay data-test-id="top-status-system-dialog" onClick={closeSystemDialog}>
          <DialogContent className="max-w-sm" data-test-id="top-status-system-dialog-content" onClick={(event) => event.stopPropagation()}>
            <DialogHeader data-test-id="top-status-system-dialog-header">
              <DialogTitle data-test-id="top-status-system-dialog-title">{systemView === 'settings' ? '设置' : '系统'}</DialogTitle>
            </DialogHeader>
            <DialogBody className="top-status-system-actions" data-test-id="top-status-system-dialog-body">
              {systemView === 'actions' ? (
                <>
                  <Button data-test-id="top-status-system-settings" variant="ghost" onClick={() => setSystemView('settings')}><SlidersHorizontal className="mr-1 size-4" data-test-id="top-status-system-settings-icon" />设置</Button>
                  <Button data-test-id="top-status-system-reset" variant="ghost" onClick={() => { resetGame(); closeSystemDialog() }}><RotateCcw className="mr-1 size-4" data-test-id="top-status-system-reset-icon" />重开</Button>
                  <Button data-test-id="top-status-system-save" variant="ghost" onClick={() => { saveGame(); closeSystemDialog() }}><Save className="mr-1 size-4" data-test-id="top-status-system-save-icon" />存档</Button>
                  <Button data-test-id="top-status-system-export" variant="ghost" onClick={() => { handleExport(); closeSystemDialog() }}><Download className="mr-1 size-4" data-test-id="top-status-system-export-icon" />导出</Button>
                  <Button data-test-id="top-status-system-import" variant="ghost" onClick={() => { fileRef.current?.click(); closeSystemDialog() }}><Upload className="mr-1 size-4" data-test-id="top-status-system-import-icon" />导入</Button>
                </>
              ) : (
                <div className="top-status-settings-panel" data-test-id="top-status-settings-panel">
                  <Button data-test-id="top-status-settings-back" variant="ghost" onClick={() => setSystemView('actions')}><ArrowLeft className="mr-1 size-4" data-test-id="top-status-settings-back-icon" />返回</Button>
                  <label className="top-status-settings-row" data-test-id="top-status-settings-debug-mode-row">
                    <span data-test-id="top-status-settings-debug-mode-label">调试模式</span>
                    <input
                      data-test-id="top-status-settings-debug-mode-toggle"
                      type="checkbox"
                      checked={debugMode}
                      onChange={(event) => setDebugMode(event.target.checked)}
                    />
                  </label>
                </div>
              )}
            </DialogBody>
          </DialogContent>
        </DialogOverlay>
      )}
    </Card>
  )
}
