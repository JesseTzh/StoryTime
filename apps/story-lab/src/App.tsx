import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  GitBranch,
  LayoutDashboard,
  Map as MapIcon,
  MessageSquareText,
  Network,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { ContentPack } from '@tss/schema'
import type { SimulationCoverageResolvedOptions, SimulationCoverageRunResult, SimulationCoverageTree } from '@tss/engine'
import { createInitialRuntimeState, evaluateCondition, explainConditionFailures, getDefaultSimulationCoverageOptions } from '@tss/engine'
import { validateContentPack } from '@tss/validator'
import { StatusDot } from './components/common'
import { exportContentPack } from './editor/content-pack-io'
import { getDefaultStoryProject } from './editor/project-selection'
import { storyProjects } from './editor/story-projects'
import { buildStoryFiles } from './editor/story-files'
import type { NpcTabId, SectionId } from './editor/types'
import { buildFixPrompt, countSeverity, issueKey } from './editor/helpers'
import { isSimulationCoverageWorkerCancelled, runSimulationCoverageInWorker } from './features/simulation/runSimulationCoverageInWorker'
import {
  DashboardPage,
  ConversationBranchPage,
  EventGraphPage,
  MapPage,
  NpcStudioPage,
  SchedulePage,
  StorySimulationPage,
  StoryValidationPage,
  TemplateLibraryPage,
  WorldPage,
} from './pages/editor-pages'

const sections: Array<{ id: SectionId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: '故事概览', icon: LayoutDashboard },
  { id: 'world', label: '世界设定', icon: BookOpen },
  { id: 'templates', label: '功能模板', icon: ClipboardList },
  { id: 'map', label: '地图地点', icon: MapIcon },
  { id: 'schedule', label: '日程总览', icon: CalendarClock },
  { id: 'npc', label: 'NPC 管理', icon: UserRound },
  { id: 'conversations', label: '对话分支', icon: MessageSquareText },
  { id: 'events', label: '事件分支', icon: GitBranch },
  { id: 'simulation', label: '剧情模拟', icon: Network },
  { id: 'validation', label: '剧情校验', icon: ShieldCheck },
]

function defaultTileId(pack: ContentPack) {
  const map = pack.maps[0]
  return map?.tiles.find((tile) => tile.locationId)?.id ?? map?.tiles[0]?.id ?? ''
}

function defaultNpcId(pack: ContentPack) {
  return pack.npcs.find((npc) => npc.tier === 'core')?.id ?? pack.npcs[0]?.id ?? ''
}

function defaultEventId(pack: ContentPack) {
  return pack.events[0]?.id ?? ''
}

function defaultConversationId(pack: ContentPack) {
  return pack.conversations[0]?.id ?? ''
}

function deriveReviewState(report: ReturnType<typeof validateContentPack>) {
  const blockingErrors = [...report.errors, ...report.gaps].filter((issue) => issue.severity === 'error')
  if (blockingErrors.length > 0) return 'needs_fix'
  if (report.errors.length > 0 || report.gaps.length > 0) return 'reviewing'
  return 'accepted'
}

const defaultStoryProject = getDefaultStoryProject(storyProjects) ?? storyProjects[0]
const initialCoverageOptions = defaultStoryProject ? getDefaultSimulationCoverageOptions(defaultStoryProject.pack) : {
  identityIds: [],
  days: 1,
  maxStates: 5000,
  maxDepth: 20,
  maxSamplesPerEnding: 2,
  includeAdvanceTime: true,
}

export function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard')
  const [activeProjectId, setActiveProjectId] = useState(defaultStoryProject?.id ?? '')
  const [selectedTileId, setSelectedTileId] = useState(defaultStoryProject ? defaultTileId(defaultStoryProject.pack) : '')
  const [selectedNpcId, setSelectedNpcId] = useState(defaultStoryProject ? defaultNpcId(defaultStoryProject.pack) : '')
  const [selectedEventId, setSelectedEventId] = useState(defaultStoryProject ? defaultEventId(defaultStoryProject.pack) : '')
  const [selectedConversationId, setSelectedConversationId] = useState(defaultStoryProject ? defaultConversationId(defaultStoryProject.pack) : '')
  const [selectedFileId, setSelectedFileId] = useState('content-pack.json')
  const [activeNpcTab, setActiveNpcTab] = useState<NpcTabId>('basic')
  const [selectedIssueKey, setSelectedIssueKey] = useState('')
  const [generatedFixPrompt, setGeneratedFixPrompt] = useState('')
  const [fixPromptOpen, setFixPromptOpen] = useState(false)
  const [coverageOptions, setCoverageOptions] = useState<SimulationCoverageResolvedOptions>(initialCoverageOptions)
  const [coverageResult, setCoverageResult] = useState<(SimulationCoverageRunResult & { tree: SimulationCoverageTree }) | undefined>()
  const [coverageError, setCoverageError] = useState('')
  const [coverageRunning, setCoverageRunning] = useState(false)
  const [selectedCoverageNodeId, setSelectedCoverageNodeId] = useState('')
  const [coverageFilters, setCoverageFilters] = useState({ identityId: 'all', endingId: 'all', stepKind: 'all' })
  const coverageWorkerCancelRef = useRef<(() => void) | undefined>(undefined)

  const projectReports = useMemo(
    () => Object.fromEntries(storyProjects.map((project) => [project.id, validateContentPack(project.pack)])),
    [],
  )
  const activeProject = storyProjects.find((project) => project.id === activeProjectId) ?? defaultStoryProject
  const pack = activeProject.pack
  const defaultCoverageOptions = useMemo(() => getDefaultSimulationCoverageOptions(pack), [pack])
  const report = projectReports[activeProject.id] ?? validateContentPack(pack)
  const storyFiles = useMemo(() => buildStoryFiles(pack), [pack])
  const initialIdentityId = pack.identities[0]?.id ?? ''
  const initialState = useMemo(() => createInitialRuntimeState(pack, initialIdentityId), [pack, initialIdentityId])
  const map = pack.maps[0]
  const selectedTile = map?.tiles.find((tile) => tile.id === selectedTileId) ?? map?.tiles[0]
  const selectedLocation = selectedTile?.locationId ? pack.locations.find((location) => location.id === selectedTile.locationId) : undefined
  const selectedNpc = pack.npcs.find((npc) => npc.id === selectedNpcId) ?? pack.npcs[0]
  const selectedEvent = pack.events.find((event) => event.id === selectedEventId) ?? pack.events[0]
  const selectedConversation = pack.conversations.find((conversation) => conversation.id === selectedConversationId) ?? pack.conversations[0]
  const allIssues = useMemo(() => [...report.errors, ...report.gaps], [report])
  const selectedIssue = selectedIssueKey ? allIssues.find((issue, index) => issueKey(issue, index) === selectedIssueKey) : allIssues[0]
  const severity = countSeverity(allIssues)
  const reviewState = deriveReviewState(report)
  const selectedEventReady = selectedEvent ? evaluateCondition(selectedEvent.trigger, initialState) : false
  const selectedEventFailures = selectedEvent ? explainConditionFailures(selectedEvent.trigger, initialState) : []

  useEffect(() => {
    setSelectedTileId(defaultTileId(pack))
    setSelectedNpcId(defaultNpcId(pack))
    setSelectedEventId(defaultEventId(pack))
    setSelectedConversationId(defaultConversationId(pack))
    setSelectedFileId('content-pack.json')
    setSelectedIssueKey('')
    setGeneratedFixPrompt('')
    setFixPromptOpen(false)
    setCoverageOptions(getDefaultSimulationCoverageOptions(pack))
    setCoverageResult(undefined)
    setCoverageError('')
    setCoverageRunning(false)
    setSelectedCoverageNodeId('')
    setCoverageFilters({ identityId: 'all', endingId: 'all', stepKind: 'all' })
    coverageWorkerCancelRef.current?.()
    coverageWorkerCancelRef.current = undefined
  }, [pack])

  function downloadPack() {
    const blob = new Blob([exportContentPack(pack)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${pack.packId}-content-pack.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function copyText(value: string) {
    void navigator.clipboard.writeText(value)
  }

  function selectLocation(locationId: string) {
    const tile = map?.tiles.find((item) => item.locationId === locationId)
    if (tile) setSelectedTileId(tile.id)
    setActiveSection('map')
  }

  function generateFixPrompt() {
    const promptText = buildFixPrompt(selectedIssue ? [selectedIssue] : allIssues.slice(0, 8), pack)
    setGeneratedFixPrompt(promptText)
    setFixPromptOpen(true)
  }

  async function runCoverageTree() {
    coverageWorkerCancelRef.current?.()
    try {
      setCoverageRunning(true)
      setCoverageError('')
      const result = await runSimulationCoverageInWorker(pack, coverageOptions, (cancel) => {
        coverageWorkerCancelRef.current = cancel
      })
      setCoverageResult(result)
      setSelectedCoverageNodeId('')
    } catch (error) {
      if (isSimulationCoverageWorkerCancelled(error)) return
      setCoverageError(error instanceof Error ? error.message : String(error))
    } finally {
      setCoverageRunning(false)
      coverageWorkerCancelRef.current = undefined
    }
  }

  function resetCoverageOptions() {
    setCoverageOptions(defaultCoverageOptions)
  }

  function setCoverageNumberOption(key: 'days' | 'maxStates' | 'maxDepth' | 'maxSamplesPerEnding', value: string) {
    const parsed = Math.floor(Number(value))
    if (!Number.isFinite(parsed) || parsed <= 0) return
    setCoverageOptions((current) => ({ ...current, [key]: parsed }))
  }

  function toggleCoverageIdentity(identityId: string) {
    setCoverageOptions((current) => {
      if (current.identityIds.includes(identityId)) {
        const next = current.identityIds.filter((id) => id !== identityId)
        return next.length === 0 ? current : { ...current, identityIds: next }
      }
      return { ...current, identityIds: [...current.identityIds, identityId] }
    })
  }

  function selectAllCoverageIdentities() {
    setCoverageOptions((current) => ({ ...current, identityIds: defaultCoverageOptions.identityIds }))
  }

  return (
    <div className="app-shell" data-test-id="story-lab-shell">
      <aside className="lab-sidebar" aria-label="Story editor navigation" data-test-id="story-lab-sidebar">
        <div className="lab-brand" data-test-id="story-lab-brand">
          <div className="brand-mark" data-test-id="story-lab-brand-mark">ST</div>
          <div>
            <div className="brand-title" data-test-id="story-lab-brand-title">剧情编辑器</div>
            <div className="brand-subtitle" data-test-id="story-lab-brand-subtitle">故事内容工程平台</div>
          </div>
        </div>

        <label className="project-switcher" data-test-id="story-lab-project-switcher">
          <span>当前故事</span>
          <select data-test-id="story-lab-project-select" value={activeProjectId} onChange={(event) => setActiveProjectId(event.target.value)}>
            {storyProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <nav className="nav-list" data-test-id="story-lab-nav">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                className={activeSection === section.id ? 'nav-item is-active' : 'nav-item'}
                data-test-id={`story-lab-nav-${section.id}`}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-status" data-test-id="story-lab-sidebar-status">
          <StatusDot state={reviewState} />
          <span>{reviewState}</span>
          <small>{pack.version} / schema {pack.schemaVersion}</small>
        </div>
      </aside>

      <main className="lab-main" data-test-id={`story-lab-main-${activeSection}`}>
        {activeSection === 'dashboard' && (
          <DashboardPage
            activePack={pack}
            activeProject={activeProject}
            report={report}
            reviewState={reviewState}
            severity={severity}
            onDownload={downloadPack}
            onOpenValidation={() => setActiveSection('validation')}
            onSelectLocation={selectLocation}
          />
        )}
        {activeSection === 'world' && (
          <WorldPage
            files={storyFiles}
            pack={pack}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
          />
        )}
        {activeSection === 'templates' && <TemplateLibraryPage />}
        {activeSection === 'map' && (
          <MapPage
            map={map}
            pack={pack}
            selectedTile={selectedTile}
            selectedLocation={selectedLocation}
            onSelectTile={setSelectedTileId}
          />
        )}
        {activeSection === 'schedule' && (
          <SchedulePage
            pack={pack}
            onSelectNpc={(id) => {
              setSelectedNpcId(id)
              setActiveNpcTab('schedule')
              setActiveSection('npc')
            }}
          />
        )}
        {activeSection === 'npc' && selectedNpc && (
          <NpcStudioPage
            npc={selectedNpc}
            pack={pack}
            activeTab={activeNpcTab}
            issues={allIssues}
            onSelectNpc={setSelectedNpcId}
            onSelectTab={setActiveNpcTab}
          />
        )}
        {activeSection === 'conversations' && (
          <ConversationBranchPage
            issues={allIssues}
            pack={pack}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversationId}
          />
        )}
        {activeSection === 'events' && selectedEvent && (
          <EventGraphPage
            event={selectedEvent}
            failures={selectedEventFailures}
            initialState={initialState}
            isReady={selectedEventReady}
            pack={pack}
            onSelectEvent={setSelectedEventId}
          />
        )}
        {activeSection === 'simulation' && (
          <StorySimulationPage
            error={coverageError}
            filters={coverageFilters}
            isRunning={coverageRunning}
            options={coverageOptions}
            pack={pack}
            result={coverageResult}
            selectedNodeId={selectedCoverageNodeId}
            onFilterChange={(key, value) => setCoverageFilters((current) => ({ ...current, [key]: value }))}
            onResetOptions={resetCoverageOptions}
            onRun={runCoverageTree}
            onSelectAllIdentities={selectAllCoverageIdentities}
            onSelectNode={setSelectedCoverageNodeId}
            onSetIncludeAdvanceTime={(includeAdvanceTime) => setCoverageOptions((current) => ({ ...current, includeAdvanceTime }))}
            onSetNumberOption={setCoverageNumberOption}
            onToggleIdentity={toggleCoverageIdentity}
          />
        )}
        {activeSection === 'validation' && (
          <StoryValidationPage
            allIssues={allIssues}
            fixPromptOpen={fixPromptOpen}
            generatedFixPrompt={generatedFixPrompt}
            reportCheckedAt={report.checkedAt}
            selectedIssue={selectedIssue}
            selectedIssueKey={selectedIssueKey}
            severity={severity}
            onCopy={copyText}
            onGenerateFixPrompt={generateFixPrompt}
            onSelectIssue={setSelectedIssueKey}
            onSetFixPromptOpen={setFixPromptOpen}
          />
        )}
      </main>
    </div>
  )
}
