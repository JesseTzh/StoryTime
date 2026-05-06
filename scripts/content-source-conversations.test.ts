import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ContentPack } from '@tss/schema'
import { discoverContentSourceDirs, loadContentPackFromSource, writeContentPackArtifacts } from './content-source'
import { expect, test } from 'vitest'

test('content source emits conversations and no legacy dialogue effects', async () => {
  const pack = await loadContentPackFromSource()
  const serialized = JSON.stringify(pack)

  expect(pack.conversations.length).toBeGreaterThan(0)
  expect('dialogues' in pack).toBe(false)
  expect(serialized).not.toContain('start_dialogue')
  expect(pack.conversations.every((conversation) => conversation.title.trim().length > 0)).toBe(true)
})

test('content artifacts include browser-loadable static JSON for multiple packs', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'content-artifacts-'))
  try {
    const packA = {
      packId: 'pack_fixture',
      version: '1.0.0',
      schemaVersion: '1.0.0',
      world: {
        id: 'world_fixture',
        name: 'Fixture World',
        summary: 'Fixture summary',
        editorBackground: 'Fixture editor background',
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
      runtime: { initialState: { facts: {} }, dailyDriftRules: [] },
    } as unknown as ContentPack
    const packB = {
      ...packA,
      packId: 'pack_second',
      version: '2.0.0',
      world: {
        ...packA.world,
        name: 'Second World',
        summary: 'Second summary',
        editorBackground: 'Second editor background',
      },
    } as unknown as ContentPack

    const result = await writeContentPackArtifacts([packA, packB], {
      contentPackDir: join(tempDir, 'content', 'packs'),
    })

    const manifest = JSON.parse(await readFile(result.staticManifestPath, 'utf8')) as { defaultPackId: string; packs: Array<{ href: string }> }
    const staticPackA = JSON.parse(await readFile(result.staticContentPackJsonPaths[0], 'utf8')) as ContentPack
    const staticPackB = JSON.parse(await readFile(result.staticContentPackJsonPaths[1], 'utf8')) as ContentPack

    expect(manifest.defaultPackId).toBe(packA.packId)
    expect(manifest.packs.map((pack) => pack.href)).toEqual([`/content-packs/${packA.packId}.json`, `/content-packs/${packB.packId}.json`])
    expect(staticPackA.packId).toBe(packA.packId)
    expect(staticPackB.packId).toBe(packB.packId)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('content artifact generation preserves an existing default pack when it is still present', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'content-artifacts-default-'))
  try {
    const packA = makeArtifactPack('pack_fixture', 'Fixture World')
    const packB = makeArtifactPack('pack_second', 'Second World')
    const contentPackDir = join(tempDir, 'content', 'packs')
    await mkdir(contentPackDir, { recursive: true })
    await writeFile(join(contentPackDir, 'manifest.json'), `${JSON.stringify({
      defaultPackId: packB.packId,
      packs: [{ packId: packB.packId, href: `/content-packs/${packB.packId}.json` }],
    })}\n`)

    const result = await writeContentPackArtifacts([packA, packB], { contentPackDir })

    const manifest = JSON.parse(await readFile(result.staticManifestPath, 'utf8')) as { defaultPackId: string }
    expect(manifest.defaultPackId).toBe(packB.packId)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('content source loads pack metadata from world yaml', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'content-source-world-'))
  const sourceDir = join(tempDir, 'source-a')
  try {
    await writeMinimalMergedWorldContentSource(sourceDir)

    const pack = await loadContentPackFromSource(sourceDir)

    expect(pack.packId).toBe('merged_metadata_story')
    expect(pack.version).toBe('0.1.0')
    expect(pack.schemaVersion).toBe('1.0.0')
    expect(pack.world).toEqual({
      id: 'world_merged',
      name: 'Merged World',
      summary: 'Metadata and world definition live in one YAML file.',
      editorBackground: 'Editor background from merged world YAML.',
      maxDays: 1,
      segments: ['morning'],
      actionPointsPerSegment: 1,
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('content source derives npc portrait from npc folder and name', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'content-source-npc-portrait-'))
  const sourceDir = join(tempDir, 'source-a')
  try {
    await writeMinimalMergedWorldContentSource(sourceDir)
    await writeFile(join(sourceDir, 'npcs', 'guide', 'Guide.webp'), '')

    const pack = await loadContentPackFromSource(sourceDir)

    expect(pack.npcs[0]?.portrait).toBe('/source-a/npcs/guide/Guide.webp')
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('content source discovery ignores generated pack artifacts', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'content-discovery-'))
  try {
    await mkdir(join(tempDir, 'source-a'), { recursive: true })
    await mkdir(join(tempDir, 'packs'), { recursive: true })
    await writeFile(join(tempDir, 'source-a', 'world.yaml'), 'packId: source_a\n')
    await writeFile(join(tempDir, 'packs', 'manifest.json'), '{"packs":[]}\n')

    await expect(discoverContentSourceDirs(tempDir)).resolves.toEqual([join(tempDir, 'source-a')])
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

async function writeMinimalMergedWorldContentSource(sourceDir: string) {
  await mkdir(join(sourceDir, 'npcs', 'guide'), { recursive: true })
  await writeFile(join(sourceDir, 'world.yaml'), `packId: merged_metadata_story
version: 0.1.0
schemaVersion: 1.0.0
id: world_merged
name: Merged World
summary: Metadata and world definition live in one YAML file.
editorBackground: Editor background from merged world YAML.
maxDays: 1
segments:
  - morning
actionPointsPerSegment: 1
`)
  await writeFile(join(sourceDir, 'variables.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'maps.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'locations.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'buildings.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'factions.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'identities.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'interactions.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'quests.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'rewards.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'events.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'items.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'endings.yaml'), `[]\n`)
  await writeFile(join(sourceDir, 'runtime.yaml'), `initialState:
  playerLocationId: loc_start
  facts: {}
dailyDriftRules: []
`)
  await writeFile(join(sourceDir, 'npcs', 'index.yaml'), `- id: npc_guide
  name: Guide
  path: npcs/guide
  files:
    - identity.yaml
    - background.yaml
    - attributes.yaml
    - relationships.yaml
    - behavior.yaml
    - conversations.yaml
`)
  await writeFile(join(sourceDir, 'npcs', 'guide', 'identity.yaml'), `id: npc_guide
name: Guide
age: 30
identity: Guide
tier: core
faction: faction_common
location: loc_start
`)
  await writeFile(join(sourceDir, 'npcs', 'guide', 'background.yaml'), `publicStory: Public.
privateStory: Private.
hiddenStory: Hidden.
`)
  await writeFile(join(sourceDir, 'npcs', 'guide', 'attributes.yaml'), `personality:
  kindness: 50
  courage: 50
  greed: 0
  loyalty: 50
  suspicion: 50
  responsibility: 50
state: {}
goals: []
secrets: []
`)
  await writeFile(join(sourceDir, 'npcs', 'guide', 'relationships.yaml'), `player:
  sourceId: player
  targetId: npc_guide
  value: 0
  trust: 0
  fear: 0
  gratitude: 0
  suspicion: 0
  tags: []
npcRelationships: []
`)
  await writeFile(join(sourceDir, 'npcs', 'guide', 'behavior.yaml'), `schedule: []
behaviorRules: []
`)
  await writeFile(join(sourceDir, 'npcs', 'guide', 'conversations.yaml'), `[]\n`)
}

function makeArtifactPack(packId: string, name: string): ContentPack {
  return {
    packId,
    version: '1.0.0',
    schemaVersion: '1.0.0',
    world: {
      id: `world_${packId}`,
      name,
      summary: `${name} summary`,
      editorBackground: `${name} editor background`,
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
    runtime: { initialState: { facts: {} }, dailyDriftRules: [] },
  } as unknown as ContentPack
}
