import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ContentPackManifestEntry } from '@/store/content-loader'

type StoryPackSelectPageProps = {
  packs: ContentPackManifestEntry[]
  loadingPackId?: string
  error?: string
  onSelectPack: (pack: ContentPackManifestEntry) => void
}

export function StoryPackSelectPage({ packs, loadingPackId, error, onSelectPack }: StoryPackSelectPageProps) {
  return (
    <main className="story-pack-select-page" data-test-id="story-pack-select-page">
      <div className="story-pack-select-inner" data-test-id="story-pack-select-inner">
        <section className="story-pack-select-hero" data-test-id="story-pack-select-hero">
          <p className="story-pack-select-kicker" data-test-id="story-pack-select-kicker">TIME · SPACE · STORY</p>
          <h1 className="story-pack-select-title" data-test-id="story-pack-select-title">选择故事</h1>
          <p className="story-pack-select-summary" data-test-id="story-pack-select-summary">从已安装的故事包中选择本次游玩的世界。</p>
        </section>

        {error && (
          <div className="story-pack-select-error" role="alert" data-test-id="story-pack-select-error">
            <span data-test-id="story-pack-select-error-message">{error}</span>
          </div>
        )}

        <section className="story-pack-select-list" data-test-id="story-pack-select-list">
          {packs.map((pack) => {
            const isLoading = loadingPackId === pack.packId
            return (
              <Card key={pack.packId} className="story-pack-select-card" data-test-id={`story-pack-select-card-${pack.packId}`}>
                <CardHeader data-test-id={`story-pack-select-card-header-${pack.packId}`}>
                  <div className="story-pack-select-card-meta" data-test-id={`story-pack-select-card-meta-${pack.packId}`}>
                    <Badge data-test-id={`story-pack-select-version-${pack.packId}`}>v{pack.version}</Badge>
                  </div>
                  <CardTitle data-test-id={`story-pack-select-name-${pack.packId}`}>{pack.name}</CardTitle>
                </CardHeader>
                <CardContent className="story-pack-select-card-content" data-test-id={`story-pack-select-card-content-${pack.packId}`}>
                  <p className="story-pack-select-card-summary" data-test-id={`story-pack-select-card-summary-${pack.packId}`}>{pack.summary}</p>
                  <Button
                    className="w-full"
                    data-test-id={`story-pack-select-button-${pack.packId}`}
                    disabled={Boolean(loadingPackId)}
                    onClick={() => onSelectPack(pack)}
                  >
                    {isLoading ? '载入中' : '进入故事'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </section>
      </div>
    </main>
  )
}
