import type { ContentPack } from '@tss/schema'
import { afterEach, expect, test, vi } from 'vitest'
import { loadContentPack, loadContentPackManifest, type ContentPackManifest } from './content-loader'

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
  maps: [],
  locations: [],
  buildings: [],
  factions: [],
  identities: [],
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

const manifest = {
  defaultPackId: 'pack_other',
  packs: [
    {
      packId: 'pack_other',
      version: '0.1.0',
      name: 'Other World',
      summary: 'Other summary',
      href: '/content-packs/pack_other.json',
    },
    {
      packId: pack.packId,
      version: pack.version,
      name: pack.world.name,
      summary: pack.world.summary,
      href: '/content-packs/pack_fixture.json',
    },
  ],
} satisfies ContentPackManifest

afterEach(() => {
  vi.restoreAllMocks()
})

test('loads the generated content pack manifest', async () => {
  const fetchMock = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => manifest,
  } as Response))
  vi.stubGlobal('fetch', fetchMock)

  await expect(loadContentPackManifest()).resolves.toEqual(manifest)
  expect(fetchMock).toHaveBeenNthCalledWith(1, '/content-packs/manifest.json')
})

test('loads a selected content pack through its manifest entry', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => pack,
  } as Response))
  vi.stubGlobal('fetch', fetchMock)

  await expect(loadContentPack(manifest.packs[1])).resolves.toEqual(pack)
  expect(fetchMock).toHaveBeenNthCalledWith(1, '/content-packs/pack_fixture.json')
})

test('reports a useful error when manifest loading fails', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: false,
    status: 404,
    json: async () => ({}),
  } as Response)))

  await expect(loadContentPackManifest()).rejects.toThrow('Failed to load /content-packs/manifest.json: 404')
})
