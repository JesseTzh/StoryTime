import type { ContentPack, GameRuntimeState } from '@tss/schema'
import { createInitialRuntimeState } from '@tss/engine'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { initializeGameStore, useGameStore } from './game-store'

const pack = {
  packId: 'pack_fixture',
  version: '1.0.0',
  schemaVersion: '1.0.0',
  world: {
    id: 'world_fixture',
    name: 'Fixture World',
    summary: 'Fixture summary',
    editorBackground: 'Fixture editor background',
    playerIntroduction: 'Fixture player introduction',
    maxDays: 1,
    segments: ['morning'],
    actionPointsPerSegment: 1,
  },
  variables: [],
  maps: [{
    id: 'map_fixture',
    name: 'Map',
    width: 1,
    height: 1,
    tiles: [{
      id: 'tile_fixture',
      name: 'Tile',
      x: 0,
      y: 0,
      terrain: 'town',
      locationId: 'loc_fixture',
      buildingIds: [],
      npcIds: [],
      eventIds: [],
      discovered: true,
      visible: true,
      blocked: false,
      dangerLevel: 0,
    }],
  }],
  locations: [{
    id: 'loc_fixture',
    name: 'Location',
    type: 'fixture',
    tags: [],
    state: {},
    descriptions: { default: 'Location', morning: 'Location', noon: 'Location', night: 'Location' },
    buildingIds: [],
    interactionIds: [],
  }],
  buildings: [],
  factions: [],
  identities: [{
    id: 'identity_fixture',
    name: 'Identity',
    backgroundSummary: 'Identity background',
    initialState: {
      health: 100,
      stamina: 100,
      money: 0,
      reputation: 0,
      combat: 0,
      negotiation: 0,
      medicine: 0,
      stealth: 0,
    },
    intro: {
      title: 'Intro title',
      story: 'Intro',
      origin: 'Origin',
      motivation: 'Motivation',
    },
    advantages: [],
    disadvantages: [],
  }],
  npcs: [],
  relationships: [],
  interactions: [],
  quests: [],
  rewards: [],
  events: [],
  conversations: [],
  items: [],
  endings: [],
  runtime: { initialState: { playerLocationId: 'loc_fixture', facts: {} }, dailyDriftRules: [] },
} satisfies ContentPack

function createStorage() {
  const entries = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      entries.delete(key)
    }),
    clear: vi.fn(() => entries.clear()),
    key: vi.fn((index: number) => Array.from(entries.keys())[index] ?? null),
    get length() {
      return entries.size
    },
  } satisfies Storage
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorage())
  initializeGameStore(pack)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('detects a saved game for the current content pack', () => {
  const runtime = createInitialRuntimeState(pack, 'identity_fixture')
  localStorage.setItem('time-space-story:pack_fixture:save', JSON.stringify({ savedAt: '2026-01-01T00:00:00.000Z', state: runtime }))

  expect(useGameStore.getState().hasSavedGame()).toBe(true)
})

test('does not report an incompatible saved game as resumable', () => {
  const runtime = {
    ...createInitialRuntimeState(pack, 'identity_fixture'),
    contentPackVersion: '0.9.0',
  } satisfies GameRuntimeState
  localStorage.setItem('time-space-story:pack_fixture:save', JSON.stringify({ savedAt: '2026-01-01T00:00:00.000Z', state: runtime }))

  expect(useGameStore.getState().hasSavedGame()).toBe(false)
  expect(useGameStore.getState().lastError).toBe('存档版本 0.9.0 与当前内容包版本 1.0.0 不一致')
})

test('loads saved games without applying legacy compatibility defaults', () => {
  const runtime = createInitialRuntimeState(pack, 'identity_fixture')
  const runtimeWithoutQuests = {
    ...runtime,
    worldState: omitQuests(runtime.worldState),
  } as GameRuntimeState
  localStorage.setItem('time-space-story:pack_fixture:save', JSON.stringify({ savedAt: '2026-01-01T00:00:00.000Z', state: runtimeWithoutQuests }))

  expect(useGameStore.getState().loadSavedGame()).toBe(true)

  expect(useGameStore.getState().runtime?.worldState.quests).toBeUndefined()
})

test('persists debug mode in a separate local storage setting', () => {
  useGameStore.getState().setDebugMode(true)

  expect(localStorage.setItem).toHaveBeenCalledWith('time-space-story:settings:debugMode', 'true')
  expect(useGameStore.getState().debugMode).toBe(true)

  initializeGameStore(pack)

  expect(useGameStore.getState().debugMode).toBe(true)
})

function omitQuests({ quests: _quests, ...worldState }: GameRuntimeState['worldState']) {
  return worldState
}
