import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGameStore } from '@/store/game-store'

export function IdentityPage() {
  const pack = useGameStore((state) => state.contentPack)
  const selectIdentity = useGameStore((state) => state.selectIdentity)

  return (
    <main className="identity-page" data-test-id="identity-page">
      <div className="identity-page-inner" data-test-id="identity-page-inner">
        <div className="identity-hero" data-test-id="identity-hero">
          <p className="identity-kicker" data-test-id="identity-kicker">TIME · SPACE · STORY</p>
          <h1 className="identity-title" data-test-id="identity-title">{pack.world.name}</h1>
          <p className="identity-summary" data-test-id="identity-summary">{pack.world.summary}</p>
          <p className="identity-world-introduction" data-test-id="identity-world-introduction">{pack.world.playerIntroduction}</p>
        </div>
        <div className="identity-grid" data-test-id="identity-grid">
          {pack.identities.map((identity) => (
            <Card key={identity.id} className="identity-card" data-test-id={`identity-card-${identity.id}`}>
              <CardHeader data-test-id={`identity-card-header-${identity.id}`}>
                <CardTitle data-test-id={`identity-name-${identity.id}`}>{identity.name}</CardTitle>
                <p className="identity-background-summary" data-test-id={`identity-background-summary-${identity.id}`}>{identity.backgroundSummary}</p>
              </CardHeader>
              <CardContent className="identity-card-content space-y-4" data-test-id={`identity-card-content-${identity.id}`}>
                <div data-test-id={`identity-advantages-${identity.id}`}>
                  <p className="identity-list-label" data-test-id={`identity-advantages-label-${identity.id}`}>优势</p>
                  <div className="identity-badge-list" data-test-id={`identity-advantages-list-${identity.id}`}>
                    {identity.advantages.map((item) => <Badge key={item} data-test-id={`identity-advantage-${identity.id}-${item}`}>{item}</Badge>)}
                  </div>
                </div>
                <div data-test-id={`identity-disadvantages-${identity.id}`}>
                  <p className="identity-list-label is-muted" data-test-id={`identity-disadvantages-label-${identity.id}`}>劣势</p>
                  <div className="identity-badge-list" data-test-id={`identity-disadvantages-list-${identity.id}`}>
                    {identity.disadvantages.map((item) => <Badge key={item} className="text-stone-400" data-test-id={`identity-disadvantage-${identity.id}-${item}`}>{item}</Badge>)}
                  </div>
                </div>
                <Button className="w-full" data-test-id={`identity-select-${identity.id}`} onClick={() => selectIdentity(identity.id)}>
                  开始游戏
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
