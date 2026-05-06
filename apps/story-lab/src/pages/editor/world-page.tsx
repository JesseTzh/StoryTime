import { useState } from 'react'
import {
  Eye,
  FileCode2,
  ShieldCheck,
  Target,
  Users,
  X
} from 'lucide-react'
import type { ContentPack } from '@tss/schema'
import { TIME_SEGMENT_LABEL } from '@tss/schema'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui'
import {
  CodeBlock,
  Definition,
  PageHeader,
  ProgressBar
} from '../../components/common'
import {
  normalizeVariable
} from '../../editor/helpers'
import type { StoryFile } from '../../editor/types'
import {
  highlightJson,
  worldGuardrails,
  worldTabs,
  WorldTabId
} from './shared'

export function WorldPage({
  files,
  pack,
  selectedFileId,
  onSelectFile,
}: {
  files: StoryFile[]
  pack: ContentPack
  selectedFileId: string
  onSelectFile: (fileId: string) => void
}) {
  const [activeWorldTab, setActiveWorldTab] = useState<WorldTabId>('basics')
  const [previewFile, setPreviewFile] = useState<StoryFile | null>(null)

  function openFilePreview(file: StoryFile) {
    onSelectFile(file.id)
    setPreviewFile(file)
  }

  return (
    <>
      <PageHeader
        eyebrow="World Bible"
        testId="world-header"
        title="世界设定"
        description={`${pack.world.name}，${pack.world.maxDays} 天，${pack.world.segments.map((segment) => TIME_SEGMENT_LABEL[segment]).join(' / ')} 时段行动。`}
      />

      <section className="two-column" data-test-id="world-foundation-section">
        <Card data-test-id="world-tabs-card">
          <CardHeader>
            <CardTitle>世界基础</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="tab-strip" data-test-id="world-tab-list">
              {worldTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={activeWorldTab === tab.id ? 'tab-button is-active' : 'tab-button'}
                  data-test-id={`world-tab-${tab.id}`}
                  type="button"
                  aria-selected={activeWorldTab === tab.id}
                  onClick={() => setActiveWorldTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="world-tab-panel" data-test-id={`world-tab-panel-${activeWorldTab}`}>
              {activeWorldTab === 'basics' && (
                <div data-test-id="world-basics-panel">
                  <p className="lead-text" data-test-id="world-basics-summary">{pack.world.summary}</p>
                  <div className="world-background-copy" data-test-id="world-basics-editor-background">
                    <strong data-test-id="world-basics-editor-background-label">编辑者世界背景</strong>
                    <p data-test-id="world-basics-editor-background-text">{pack.world.editorBackground}</p>
                  </div>
                  <div className="world-background-copy" data-test-id="world-basics-player-introduction">
                    <strong data-test-id="world-basics-player-introduction-label">玩家开场介绍</strong>
                    <p data-test-id="world-basics-player-introduction-text">{pack.world.playerIntroduction}</p>
                  </div>
                  <div className="definition-grid" data-test-id="world-basics-definitions">
                    <Definition label="世界 ID" value={pack.world.id} testId="world-basics-world-id" />
                    <Definition label="行动点" value={`${pack.world.actionPointsPerSegment} / 时段`} testId="world-basics-action-points" />
                    <Definition label="版本" value={pack.version} testId="world-basics-version" />
                    <Definition label="Schema" value={pack.schemaVersion} testId="world-basics-schema" />
                  </div>
                  <div className="rule-list" data-test-id="world-guardrails-list">
                    {worldGuardrails.map((rule) => (
                      <div key={rule} className="rule-row" data-test-id={`world-guardrail-${rule}`}>
                        <ShieldCheck size={16} />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorldTab === 'variables' && (
                <div className="variable-list" data-test-id="world-variables-panel">
                  {pack.variables.map((variable) => (
                    <div key={variable.key} className="variable-row" data-test-id={`world-variable-${variable.key}`}>
                      <div className="variable-head" data-test-id={`world-variable-head-${variable.key}`}>
                        <strong>{variable.name}</strong>
                        <code>{variable.key}</code>
                        <span>{variable.initialValue}</span>
                      </div>
                      <ProgressBar testId={`world-variable-progress-${variable.key}`} value={normalizeVariable(variable.initialValue, variable.min, variable.max)} />
                      <small>{variable.description}</small>
                    </div>
                  ))}
                </div>
              )}

              {activeWorldTab === 'affiliations' && (
                <div data-test-id="world-affiliations-panel">
                  <div className="compact-list" data-test-id="world-factions-list">
                    {pack.factions.map((faction) => (
                      <div key={faction.id} className="compact-item" data-test-id={`world-faction-${faction.id}`}>
                        <Users size={16} />
                        <div data-test-id={`world-faction-copy-${faction.id}`}>
                          <strong>{faction.name}</strong>
                          <small>立场 {faction.stanceToPlayer} · {faction.description}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="identity-grid" data-test-id="world-identities-grid">
                    {pack.identities.map((identity) => (
                      <div key={identity.id} className="identity-tile" data-test-id={`world-identity-${identity.id}`}>
                        <Target size={16} />
                        <strong>{identity.name}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorldTab === 'runtime' && (
                <div data-test-id="world-runtime-panel">
                  <div className="definition-grid tight" data-test-id="world-runtime-definitions">
                    <Definition label="初始地点" value={pack.runtime.initialState.playerLocationId} testId="world-runtime-initial-location" />
                    <Definition label="选中地块" value={pack.runtime.initialState.selectedTileId ?? '-'} testId="world-runtime-selected-tile" />
                    <Definition label="初始事实" value={Object.keys(pack.runtime.initialState.facts).length} testId="world-runtime-initial-facts" />
                    <Definition label="每日漂移" value={pack.runtime.dailyDriftRules.length} testId="world-runtime-daily-drift" />
                  </div>
                  <CodeBlock value={pack.runtime.initialState} compact />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-test-id="world-files-card">
          <CardHeader>
            <CardTitle>内容文件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="file-list" data-test-id="world-file-list">
              {files.map((item) => (
                <div
                  key={item.file}
                  className={selectedFileId === item.id ? 'file-row is-selected' : 'file-row'}
                  data-test-id={`world-file-${item.id}`}
                >
                  <FileCode2 size={16} />
                  <div data-test-id={`world-file-copy-${item.id}`}>
                    <strong>{item.file}</strong>
                    <small>{item.label}</small>
                  </div>
                  <Badge className={item.status} data-test-id={`world-file-status-${item.id}`}>{item.status}</Badge>
                  <span className="count" data-test-id={`world-file-count-${item.id}`}>{item.count}</span>
                  <Button
                    className="file-preview-button"
                    variant="secondary"
                    data-test-id={`world-file-preview-button-${item.id}`}
                    onClick={() => openFilePreview(item)}
                  >
                    <Eye size={14} />
                    预览
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </>
  )
}

function FilePreviewModal({ file, onClose }: { file: StoryFile; onClose: () => void }) {
  return (
    <div className="modal-backdrop" data-test-id="world-file-preview-backdrop" onClick={onClose}>
      <Card className="preview-modal" data-test-id="world-file-preview-modal" onClick={(event) => event.stopPropagation()}>
        <CardHeader>
          <div data-test-id="world-file-preview-title-copy">
            <CardTitle>{file.file}</CardTitle>
            <Badge data-test-id={`world-file-preview-label-${file.id}`}>{file.label}</Badge>
          </div>
          <Button variant="ghost" data-test-id="world-file-preview-close" onClick={onClose}>
            <X size={16} />
            关闭
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="code-block highlighted" data-test-id="world-file-highlighted-content">
            {highlightJson(file.content)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
