import { Button, Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

export function OriginIntroDialog() {
  const runtime = useGameStore((state) => state.runtime)
  const identity = useGameStore((state) => state.contentPack.identities.find((item) => item.id === state.runtime?.player.identity))
  const dismissOriginIntro = useGameStore((state) => state.dismissOriginIntro)

  if (!runtime || !identity?.intro || runtime.worldState.facts.origin_intro_seen === true) return null

  return (
    <Dialog open>
      <DialogContent className="max-w-3xl" data-test-id="origin-intro-dialog" overlayTestId="origin-intro-dialog-overlay">
        <DialogHeader data-test-id="origin-intro-dialog-header">
          <DialogTitle data-test-id="origin-intro-dialog-title">{identity.intro.title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5" data-test-id="origin-intro-dialog-body">
          <section className="space-y-2" data-test-id="origin-intro-story-section">
            <p className="text-sm leading-7 text-stone-200" data-test-id="origin-intro-story-text">{identity.intro.story}</p>
          </section>
          <section className="space-y-2" data-test-id="origin-intro-origin-section">
            <p className="text-sm leading-7 text-stone-200" data-test-id="origin-intro-origin-text">{identity.intro.origin}</p>
          </section>
          <section className="space-y-2" data-test-id="origin-intro-motivation-section">
            <p className="text-sm leading-7 text-stone-200" data-test-id="origin-intro-motivation-text">{identity.intro.motivation}</p>
          </section>
          <div className="flex justify-end" data-test-id="origin-intro-dialog-actions">
            <Button data-test-id="origin-intro-dialog-close" onClick={dismissOriginIntro}>进入故事</Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
