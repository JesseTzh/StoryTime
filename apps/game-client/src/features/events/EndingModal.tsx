import { Button, Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

export function EndingModal() {
  const result = useGameStore((state) => state.runtime?.endingResult)
  const resetGame = useGameStore((state) => state.resetGame)
  if (!result) return null
  return (
    <Dialog open>
      <DialogContent className="border-amber-300/30" data-test-id="ending-dialog" overlayTestId="ending-dialog-overlay">
        <DialogHeader data-test-id="ending-dialog-header">
          <DialogTitle className="text-2xl" data-test-id="ending-dialog-title">结局：{result.ending.name}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4" data-test-id="ending-dialog-body">
          <p className="text-sm leading-7 text-stone-200" data-test-id="ending-summary">{result.ending.summary}</p>
          <div data-test-id="ending-causal-chain">
            <h3 className="mb-2 text-sm text-amber-100" data-test-id="ending-causal-chain-title">因果链</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-stone-300" data-test-id="ending-causal-chain-list">
              {(result.causalChain.length ? result.causalChain : ['你的选择共同塑造了这个结果。']).map((item) => <li key={item} data-test-id={`ending-causal-chain-item-${item}`}>{item}</li>)}
            </ol>
          </div>
          <Button data-test-id="ending-reset-button" onClick={resetGame}>重新开始</Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
