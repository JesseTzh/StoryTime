import { create } from 'zustand'
import type { ContentPack, Conversation, GameRuntimeState, Interaction, MapTile } from '@tss/schema'
import { chooseConversationReply as runConversationReply, cloneState, createInitialRuntimeState, endConversation as clearActiveConversation, executeInteraction as runInteraction, getConversationAvailability, getInteractionAvailability, getQuestEntries as getQuestEntriesFromEngine, getTileWithRuntime, hasVisitedConversation, makeLog, maybeAutoAdvanceTime, movePlayerToLocation, processEvents, startConversation as runStartConversation } from '@tss/engine'
import { buildContentIndex, type ContentIndex } from './content-index'

let saveKey: string | undefined
const debugModeStorageKey = 'time-space-story:settings:debugMode'

type GameStore = {
  contentPack: ContentPack
  contentIndex: ContentIndex
  runtime?: GameRuntimeState
  lastError?: string
  debugMode: boolean
  selectedConversationNpcId?: string
  setDebugMode: (enabled: boolean) => void
  selectIdentity: (identityId: string) => void
  resetGame: () => void
  hasSavedGame: () => boolean
  loadSavedGame: () => boolean
  saveGame: () => void
  exportSave: () => string | undefined
  importSave: (raw: string) => boolean
  selectTile: (tileId: string) => void
  hoverTile: (tileId?: string) => void
  focusLocation: (locationId: string) => void
  moveToSelectedLocation: () => void
  executeInteraction: (interactionId: string) => void
  selectConversationNpc: (npcId?: string) => void
  startConversation: (conversationId: string) => void
  chooseConversationReply: (replyId: string) => void
  endConversation: () => void
  advanceTime: () => void
  rest: () => void
  dismissOriginIntro: () => void
  clearError: () => void
  getSelectedTile: () => MapTile | undefined
  getAvailableInteractionsForSelectedTile: () => Array<{ interaction: Interaction; available: boolean; reasons: string[] }>
  getQuestEntries: () => ReturnType<typeof getQuestEntriesFromEngine>
  getConversationEntriesForNpc: (npcId: string) => Array<{ conversation: Conversation; available: boolean; reasons: string[]; visited: boolean }>
}

export function initializeGameStore(contentPack: ContentPack) {
  saveKey = `time-space-story:${contentPack.packId}:save`
  useGameStore.setState({
    contentPack,
    contentIndex: buildContentIndex(contentPack),
    runtime: undefined,
    selectedConversationNpcId: undefined,
    lastError: undefined,
    debugMode: readDebugMode(),
  })
}

function persist(state: GameRuntimeState) {
  localStorage.setItem(requireSaveKey(), JSON.stringify({ savedAt: new Date().toISOString(), state }))
}

function requireSaveKey() {
  if (!saveKey) throw new Error('Game store has not been initialized with a content pack')
  return saveKey
}

function validateSaveRuntime(contentPack: ContentPack, runtime: GameRuntimeState): string | undefined {
  if (runtime.contentPackId !== contentPack.packId) return '存档不属于当前内容包'
  if (runtime.contentPackVersion !== contentPack.version) {
    return `存档版本 ${runtime.contentPackVersion} 与当前内容包版本 ${contentPack.version} 不一致`
  }
  return undefined
}

function withPostTurn(pack: ContentPack, state: GameRuntimeState): GameRuntimeState {
  let next = processEvents(pack, state).state
  next = maybeAutoAdvanceTime(pack, next).state
  return next
}

export const useGameStore = create<GameStore>((set, get) => ({
  contentPack: undefined as unknown as ContentPack,
  contentIndex: createEmptyContentIndex(),
  debugMode: readDebugMode(),
  setDebugMode(enabled) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(debugModeStorageKey, String(enabled))
    set({ debugMode: enabled })
  },
  selectIdentity(identityId) {
    const { contentPack } = get()
    const runtime = withPostTurn(contentPack, createInitialRuntimeState(contentPack, identityId))
    persist(runtime)
    set({ runtime, lastError: undefined })
  },
  resetGame() {
    localStorage.removeItem(requireSaveKey())
    set({ runtime: undefined, selectedConversationNpcId: undefined, lastError: undefined })
  },
  hasSavedGame() {
    const { contentPack } = get()
    const raw = localStorage.getItem(requireSaveKey())
    if (!raw) return false
    try {
      const parsed = JSON.parse(raw) as { state: GameRuntimeState }
      const error = validateSaveRuntime(contentPack, parsed.state)
      if (error) {
        set({ lastError: error })
        return false
      }
      set({ lastError: undefined })
      return true
    } catch {
      set({ lastError: '存档读取失败' })
      return false
    }
  },
  loadSavedGame() {
    const { contentPack } = get()
    const raw = localStorage.getItem(requireSaveKey())
    if (!raw) return false
    try {
      const parsed = JSON.parse(raw) as { state: GameRuntimeState }
      const error = validateSaveRuntime(contentPack, parsed.state)
      if (error) {
        set({ lastError: error })
        return false
      }
      set({ runtime: parsed.state, selectedConversationNpcId: undefined, lastError: undefined })
      return true
    } catch {
      set({ lastError: '存档读取失败' })
      return false
    }
  },
  saveGame() {
    const runtime = get().runtime
    if (runtime) persist(runtime)
  },
  exportSave() {
    const runtime = get().runtime
    return runtime ? JSON.stringify(runtime, null, 2) : undefined
  },
  importSave(raw) {
    const { contentPack } = get()
    try {
      const runtime = JSON.parse(raw) as GameRuntimeState
      const error = validateSaveRuntime(contentPack, runtime)
      if (error) {
        set({ lastError: `导入失败：${error}` })
        return false
      }
      persist(runtime)
      set({ runtime, selectedConversationNpcId: undefined, lastError: undefined })
      return true
    } catch {
      set({ lastError: '导入失败：不是合法存档 JSON' })
      return false
    }
  },
  selectTile(tileId) {
    const runtime = get().runtime
    if (!runtime) return
    set({ runtime: { ...runtime, selectedTileId: tileId }, selectedConversationNpcId: undefined, lastError: undefined })
  },
  hoverTile(tileId) {
    const runtime = get().runtime
    if (!runtime) return
    set({ runtime: { ...runtime, hoveredTileId: tileId } })
  },
  focusLocation(locationId) {
    const { contentIndex, runtime } = get()
    if (!runtime) return
    const tile = contentIndex.tileByLocationId.get(locationId)
    if (!tile) return set({ lastError: '找不到该事件地点' })
    set({ runtime: { ...runtime, selectedTileId: tile.id }, selectedConversationNpcId: undefined, lastError: undefined })
  },
  moveToSelectedLocation() {
    const { contentPack, contentIndex, runtime } = get()
    if (!runtime?.selectedTileId) return
    const tile = contentIndex.tileById.get(runtime.selectedTileId)
    if (!tile?.locationId) return set({ lastError: '该地块没有可进入地点' })
    const result = movePlayerToLocation(contentPack, runtime, tile.locationId)
    if (!result.ok) return set({ lastError: result.reasons.join('；') })
    const after = withPostTurn(contentPack, result.state)
    persist(after)
    set({ runtime: after, lastError: undefined })
  },
  executeInteraction(interactionId) {
    const { contentPack, runtime } = get()
    if (!runtime) return
    const result = runInteraction(contentPack, runtime, interactionId)
    if (!result.ok) return set({ lastError: result.reasons.join('；') })
    const after = withPostTurn(contentPack, result.state)
    persist(after)
    set({ runtime: after, lastError: undefined })
  },
  selectConversationNpc(npcId) {
    set({ selectedConversationNpcId: npcId, lastError: undefined })
  },
  startConversation(conversationId) {
    const { contentPack, runtime } = get()
    if (!runtime) return
    const result = runStartConversation(contentPack, runtime, conversationId)
    if (!result.ok) return set({ lastError: result.reasons.join('；') })
    const after = withPostTurn(contentPack, result.state)
    persist(after)
    set({ runtime: after, selectedConversationNpcId: result.state.worldState.activeConversation?.npcId, lastError: undefined })
  },
  chooseConversationReply(replyId) {
    const { contentPack, runtime } = get()
    if (!runtime) return
    const result = runConversationReply(contentPack, runtime, replyId)
    if (!result.ok) return set({ lastError: result.reasons.join('；') })
    const after = withPostTurn(contentPack, result.state)
    persist(after)
    set({ runtime: after, selectedConversationNpcId: result.state.worldState.activeConversation?.npcId ?? get().selectedConversationNpcId, lastError: undefined })
  },
  endConversation() {
    const runtime = get().runtime
    if (!runtime) return
    const next = clearActiveConversation(runtime)
    persist(next)
    set({ runtime: next, lastError: undefined })
  },
  advanceTime() {
    const { contentPack, runtime } = get()
    if (!runtime) return
    const result = maybeAutoAdvanceTime(contentPack, { ...runtime, time: { ...runtime.time, actionPoints: 0 } })
    persist(result.state)
    set({ runtime: result.state, lastError: undefined })
  },
  rest() {
    const { contentPack, runtime } = get()
    if (!runtime) return
    const identity = contentPack.identities.find((item) => item.id === runtime.player.identity)
    const next = cloneState(runtime)
    const staminaCap = Math.max(identity?.initialState.stamina ?? 100, next.player.state.stamina)
    const healthCap = Math.max(identity?.initialState.health ?? 100, next.player.state.health)
    const oldStamina = next.player.state.stamina
    const oldHealth = next.player.state.health
    next.player.state.stamina = Math.min(staminaCap, next.player.state.stamina + 24)
    next.player.state.health = Math.min(healthCap, next.player.state.health + 6)
    next.time.actionPoints = 0
    next.eventLogs = [
      ...next.eventLogs,
      makeLog(next, 'player', '你找了个安全处歇息片刻。', `体力 ${oldStamina} → ${next.player.state.stamina}；生命 ${oldHealth} → ${next.player.state.health}`),
    ]
    const after = maybeAutoAdvanceTime(contentPack, next).state
    persist(after)
    set({ runtime: after, lastError: undefined })
  },
  dismissOriginIntro() {
    const runtime = get().runtime
    if (!runtime) return
    const next = cloneState(runtime)
    next.worldState.facts.origin_intro_seen = true
    persist(next)
    set({ runtime: next, lastError: undefined })
  },
  clearError() {
    set({ lastError: undefined })
  },
  getSelectedTile() {
    const { contentIndex, runtime } = get()
    if (!runtime?.selectedTileId) return undefined
    const tile = contentIndex.tileById.get(runtime.selectedTileId)
    return tile ? getTileWithRuntime(runtime, tile) : undefined
  },
  getAvailableInteractionsForSelectedTile() {
    const { contentPack, contentIndex, runtime, debugMode } = get()
    const tile = get().getSelectedTile()
    if (!runtime || !tile?.locationId) return []
    const location = contentIndex.locationById.get(tile.locationId)
    const buildingIds = location?.buildingIds ?? []
    const buildingInteractionIds = buildingIds.flatMap((id) => contentIndex.buildingById.get(id)?.interactionIds ?? [])
    const npcInteractionIds = Object.values(runtime.worldState.npcs)
      .filter((npc) => npc.locationId === tile.locationId && npc.state.alive !== false)
      .flatMap((npc) => contentPack.npcs.find((entry) => entry.id === npc.id)?.interactionIds ?? [])
    const ids = Array.from(new Set([...(location?.interactionIds ?? []), ...buildingInteractionIds, ...npcInteractionIds]))
    return ids
      .map((id) => contentIndex.interactionById.get(id))
      .filter((interaction): interaction is Interaction => Boolean(interaction))
      .map((interaction) => ({ interaction, ...getInteractionAvailability(contentPack, runtime, interaction) }))
      .filter((entry) => debugMode || entry.available)
  },
  getQuestEntries() {
    const { contentPack, runtime } = get()
    return runtime ? getQuestEntriesFromEngine(contentPack, runtime) : []
  },
  getConversationEntriesForNpc(npcId) {
    const { contentPack, contentIndex, runtime } = get()
    if (!runtime) return []
    return (contentIndex.conversationsByNpcId.get(npcId) ?? [])
      .map((conversation) => ({
        conversation,
        ...getConversationAvailability(contentPack, runtime, conversation),
        visited: hasVisitedConversation(runtime, conversation.id),
      }))
      .sort((a, b) => Number(b.available) - Number(a.available) || Number(a.visited) - Number(b.visited) || (b.conversation.priority ?? 0) - (a.conversation.priority ?? 0) || a.conversation.title.localeCompare(b.conversation.title))
  },
}))

function readDebugMode() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(debugModeStorageKey) === 'true'
}

function createEmptyContentIndex(): ContentIndex {
  return {
    tileById: new Map(),
    tileByLocationId: new Map(),
    locationById: new Map(),
    buildingById: new Map(),
    interactionById: new Map(),
    questById: new Map(),
    rewardById: new Map(),
    conversationsByNpcId: new Map(),
  }
}
