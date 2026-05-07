import { AlertTriangle, Play, RotateCcw } from 'lucide-react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tss/ui'

type SaveStartPageProps = {
  canResume: boolean
  error?: string
  onResume: () => void
  onNewGame: () => void
}

export function SaveStartPage({ canResume, error, onResume, onNewGame }: SaveStartPageProps) {
  return (
    <main className="story-pack-select-page" data-test-id="save-start-page">
      <div className="story-pack-select-inner" data-test-id="save-start-inner">
        <section className="story-pack-select-hero" data-test-id="save-start-hero">
          <p className="story-pack-select-kicker" data-test-id="save-start-kicker">TIME · SPACE · STORY</p>
          <h1 className="story-pack-select-title" data-test-id="save-start-title">本地存档</h1>
          <p className="story-pack-select-summary" data-test-id="save-start-summary">检测到这个故事已有本地进度，请选择本次开始方式。</p>
        </section>

        <section className="story-pack-select-list" data-test-id="save-start-actions">
          <Card className="story-pack-select-card" data-test-id="save-start-card">
            <CardHeader data-test-id="save-start-card-header">
              <CardTitle data-test-id="save-start-card-title">开始游戏</CardTitle>
              <CardDescription data-test-id="save-start-card-description">继续已有进度，或清除本地存档重新选择身份。</CardDescription>
            </CardHeader>
            <CardContent className="story-pack-select-card-content" data-test-id="save-start-card-content">
              {error && (
                <div className="story-pack-select-error" role="alert" data-test-id="save-start-error">
                  <AlertTriangle className="size-4" data-test-id="save-start-error-icon" />
                  <span data-test-id="save-start-error-message">{error}</span>
                </div>
              )}
              <Button className="w-full" data-test-id="save-start-resume" disabled={!canResume} onClick={onResume}>
                <Play className="mr-2 size-4" data-test-id="save-start-resume-icon" />
                继续存档
              </Button>
              <Button className="w-full" data-test-id="save-start-new-game" variant="outline" onClick={onNewGame}>
                <RotateCcw className="mr-2 size-4" data-test-id="save-start-new-game-icon" />
                重新开始
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
