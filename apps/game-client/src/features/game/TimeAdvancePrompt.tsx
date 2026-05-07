import { useEffect, useRef, useState } from 'react'
import { Clock3, Compass } from 'lucide-react'
import { nextSegment, segmentDidAdvanceDay } from '@tss/engine'
import { TIME_SEGMENT_LABEL, type TimeSegment } from '@tss/schema'
import { Button } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

const transitionDurationMs = 500

export function TimeAdvancePrompt() {
  const runtime = useGameStore((state) => state.runtime)
  const open = useGameStore((state) => state.timeAdvancePromptOpen)
  const transitionRequested = useGameStore((state) => state.timeAdvanceTransitionRequested)
  const confirmTimeAdvance = useGameStore((state) => state.confirmTimeAdvance)
  const requestTimeAdvanceTransition = useGameStore((state) => state.requestTimeAdvanceTransition)
  const clearTimeAdvanceTransitionRequest = useGameStore((state) => state.clearTimeAdvanceTransitionRequest)
  const dismissTimeAdvancePrompt = useGameStore((state) => state.dismissTimeAdvancePrompt)
  const [advancing, setAdvancing] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  useEffect(() => {
    if (!runtime || !transitionRequested || advancing) return
    startAdvanceTransition()
  }, [runtime, transitionRequested, advancing])

  if (!runtime) return null

  const targetLabel = getNextTimeLabel(runtime.time.day, runtime.time.segment)

  function startAdvanceTransition() {
    clearTimeAdvanceTransitionRequest()
    setAdvancing(true)
    timerRef.current = window.setTimeout(() => {
      confirmTimeAdvance()
      setAdvancing(false)
    }, transitionDurationMs)
  }

  function handleAdvance() {
    requestTimeAdvanceTransition()
  }

  return (
    <>
      {open && !advancing && (
        <div className="time-advance-prompt" data-test-id="time-advance-prompt" role="dialog" aria-modal="true" aria-labelledby="time-advance-prompt-title">
          <div className="time-advance-prompt-backdrop" data-test-id="time-advance-prompt-backdrop" />
          <div className="time-advance-prompt-panel" data-test-id="time-advance-prompt-panel">
            <div className="time-advance-prompt-header" data-test-id="time-advance-prompt-header">
              <Clock3 className="size-5" data-test-id="time-advance-prompt-header-icon" />
              <h2 id="time-advance-prompt-title" className="time-advance-prompt-title" data-test-id="time-advance-prompt-title">行动点不足</h2>
            </div>
            <p className="time-advance-prompt-message" data-test-id="time-advance-prompt-message">当前时段行动点已用完，是否推进时段？</p>
            <div className="time-advance-prompt-actions" data-test-id="time-advance-prompt-actions">
              <Button data-test-id="time-advance-prompt-confirm" onClick={handleAdvance}>
                <Clock3 className="mr-1 size-4" data-test-id="time-advance-prompt-confirm-icon" />
                推进到 {targetLabel}
              </Button>
              <Button data-test-id="time-advance-prompt-dismiss" variant="outline" onClick={dismissTimeAdvancePrompt}>
                <Compass className="mr-1 size-4" data-test-id="time-advance-prompt-dismiss-icon" />
                继续探索
              </Button>
            </div>
          </div>
        </div>
      )}
      {advancing && (
        <div className="time-advance-transition" data-test-id="time-advance-transition" aria-live="polite">
          <div className="time-advance-transition-pulse" data-test-id="time-advance-transition-pulse" />
          <div className="time-advance-transition-copy" data-test-id="time-advance-transition-copy">
            <Clock3 className="size-6" data-test-id="time-advance-transition-icon" />
            <span data-test-id="time-advance-transition-text">时段推进中</span>
          </div>
        </div>
      )}
    </>
  )
}

function getNextTimeLabel(day: number, segment: TimeSegment): string {
  const targetSegment = nextSegment(segment)
  const targetDay = segmentDidAdvanceDay(segment) ? day + 1 : day
  return segmentDidAdvanceDay(segment) ? `第 ${targetDay} 天 · ${TIME_SEGMENT_LABEL[targetSegment]}` : TIME_SEGMENT_LABEL[targetSegment]
}
