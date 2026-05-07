import { EndingModal } from '@/features/events/EndingModal'
import { OriginIntroDialog } from '@/features/game/OriginIntroDialog'
import { TimeAdvancePrompt } from '@/features/game/TimeAdvancePrompt'
import { WorldMapGrid } from '@/features/map/components/WorldMapGrid'
import { TopStatusBar } from '@/features/player/TopStatusBar'
import { QuestPanel } from '@/features/quests/QuestPanel'

export function GamePage() {
  return (
    <main className="game-page" data-test-id="game-page">
      <div className="game-page-inner" data-test-id="game-page-inner">
        <TopStatusBar />
        <div className="game-layout" data-test-id="game-layout">
          <section className="game-center-column" data-test-id="game-center-column">
            <WorldMapGrid />
          </section>
          <aside className="game-right-column" data-test-id="game-right-column">
            <QuestPanel />
          </aside>
        </div>
      </div>
      <TimeAdvancePrompt />
      <OriginIntroDialog />
      <EndingModal />
    </main>
  )
}
