import { useRef } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

export function SavePanel() {
  const pack = useGameStore((state) => state.contentPack)
  const exportSave = useGameStore((state) => state.exportSave)
  const importSave = useGameStore((state) => state.importSave)
  const saveGame = useGameStore((state) => state.saveGame)
  const fileRef = useRef<HTMLInputElement>(null)

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

  return (
    <Card data-test-id="save-panel">
      <CardHeader data-test-id="save-panel-header"><CardTitle data-test-id="save-panel-title">本地存档</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-3 gap-2" data-test-id="save-panel-content">
        <Button data-test-id="save-button" variant="outline" onClick={saveGame}>保存</Button>
        <Button data-test-id="export-save-button" variant="outline" onClick={handleExport}>导出</Button>
        <Button data-test-id="import-save-button" variant="outline" onClick={() => fileRef.current?.click()}>导入</Button>
        <input data-test-id="import-save-input" ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(event) => handleImport(event.target.files?.[0])} />
      </CardContent>
    </Card>
  )
}
