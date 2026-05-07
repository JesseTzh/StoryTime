import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

export function GameShell({ children }: { children: ReactNode }) {
  const lastError = useGameStore((state) => state.lastError)
  const clearError = useGameStore((state) => state.clearError)

  return (
    <div className="game-shell" data-test-id="game-shell">
      {children}
      {lastError && (
        <div className="game-error-banner" data-test-id="game-error-banner">
          <span data-test-id="game-error-message">{lastError}</span>
          <Button data-test-id="game-error-dismiss" variant="ghost" size="icon" onClick={clearError} aria-label="关闭错误提示">
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
