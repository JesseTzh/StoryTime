import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ContentPack, Conversation, NPC, RelationshipState } from '@tss/schema'
import { parse as parseYaml } from 'yaml'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
export const repoRoot = resolve(scriptsDir, '..')
export const defaultContentRoot = resolve(repoRoot, 'content')
export const defaultContentPackDir = resolve(defaultContentRoot, 'packs')

type WorldSource = Pick<ContentPack, 'packId' | 'version' | 'schemaVersion'> & ContentPack['world']

type NpcIndexEntry = {
  id: string
  name: string
  path: string
  files: string[]
}

type NpcRelationshipSource = {
  player: RelationshipState
  npcRelationships: NPC['relationships']
}

type NpcAttributesSource = Pick<NPC, 'personality' | 'state' | 'goals' | 'secrets'>
type NpcBackgroundSource = NonNullable<NPC['background']> & { role?: string; designNote?: string }
type NpcScheduleSource = Array<Omit<NPC['schedule'][number], 'id' | 'locationId'> & { id?: string; location?: string; locationId?: string }>
type NpcBehaviorSource = { behaviorRules: NPC['behaviorRules']; schedule?: NpcScheduleSource }

const requiredNpcFiles = ['identity.yaml', 'background.yaml', 'attributes.yaml', 'relationships.yaml', 'behavior.yaml', 'conversations.yaml']

export async function loadContentPackFromSource(contentDir?: string): Promise<ContentPack> {
  const resolvedContentDir = contentDir ?? await discoverDefaultContentSourceDir()
  const worldSource = await loadObject<WorldSource>(resolvedContentDir, 'world.yaml')
  const [
    variables,
    maps,
    locations,
    buildings,
    factions,
    identities,
    interactions,
    quests,
    rewards,
    events,
    items,
    endings,
    runtime,
    npcContent,
  ] = await Promise.all([
    loadArray<ContentPack['variables'][number]>(resolvedContentDir, 'variables.yaml'),
    loadArray<ContentPack['maps'][number]>(resolvedContentDir, 'maps.yaml'),
    loadArray<ContentPack['locations'][number]>(resolvedContentDir, 'locations.yaml'),
    loadArray<ContentPack['buildings'][number]>(resolvedContentDir, 'buildings.yaml'),
    loadArray<ContentPack['factions'][number]>(resolvedContentDir, 'factions.yaml'),
    loadArray<ContentPack['identities'][number]>(resolvedContentDir, 'identities.yaml'),
    loadArray<ContentPack['interactions'][number]>(resolvedContentDir, 'interactions.yaml'),
    loadArray<ContentPack['quests'][number]>(resolvedContentDir, 'quests.yaml'),
    loadArray<ContentPack['rewards'][number]>(resolvedContentDir, 'rewards.yaml'),
    loadArray<ContentPack['events'][number]>(resolvedContentDir, 'events.yaml'),
    loadArray<ContentPack['items'][number]>(resolvedContentDir, 'items.yaml'),
    loadArray<ContentPack['endings'][number]>(resolvedContentDir, 'endings.yaml'),
    loadObject<ContentPack['runtime']>(resolvedContentDir, 'runtime.yaml'),
    loadNpcContent(resolvedContentDir),
  ])

  const { packId, version, schemaVersion, ...world } = worldSource
  return {
    packId,
    version,
    schemaVersion,
    world,
    variables,
    maps,
    locations,
    buildings,
    factions,
    identities,
    npcs: npcContent.npcs,
    relationships: npcContent.relationships,
    interactions,
    quests,
    rewards,
    events,
    conversations: npcContent.conversations,
    items,
    endings,
    runtime,
  }
}

export async function writeContentPackArtifacts(
  input: ContentPack | ContentPack[],
  options: { contentPackDir?: string } = {},
) {
  const packs = Array.isArray(input) ? input : [input]
  if (packs.length === 0) {
    throw new Error('至少需要一个内容包才能生成打包产物')
  }

  const contentPackDir = options.contentPackDir ?? defaultContentPackDir
  const staticManifestPath = resolve(contentPackDir, 'manifest.json')

  await mkdir(contentPackDir, { recursive: true })
  const defaultPackId = await resolveDefaultPackId(packs, staticManifestPath)

  const staticContentPackJsonPaths: string[] = []
  for (const pack of packs) {
    const staticContentPackJsonPath = resolve(contentPackDir, `${pack.packId}.json`)
    await writeFile(staticContentPackJsonPath, `${JSON.stringify(pack, null, 2)}\n`)
    staticContentPackJsonPaths.push(staticContentPackJsonPath)
  }
  await writeFile(staticManifestPath, `${JSON.stringify({
    defaultPackId,
    packs: packs.map((pack) => ({
        packId: pack.packId,
        version: pack.version,
        name: pack.world.name,
        summary: pack.world.summary,
        href: `/content-packs/${pack.packId}.json`,
      })),
  }, null, 2)}\n`)

  return { staticContentPackJsonPaths, staticManifestPath }
}

async function resolveDefaultPackId(packs: ContentPack[], staticManifestPath: string): Promise<string> {
  const packIds = new Set(packs.map((pack) => pack.packId))
  if (existsSync(staticManifestPath)) {
    try {
      const existingManifest = JSON.parse(await readFile(staticManifestPath, 'utf8')) as { defaultPackId?: unknown }
      if (typeof existingManifest.defaultPackId === 'string' && packIds.has(existingManifest.defaultPackId)) {
        return existingManifest.defaultPackId
      }
    } catch {
      // Fall back to the first generated pack when the existing manifest is unreadable.
    }
  }
  return packs[0].packId
}

export async function discoverContentSourceDirs(contentRoot = defaultContentRoot): Promise<string[]> {
  const entries = await readdir(contentRoot, { withFileTypes: true })
  const sourceDirs: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'packs') continue
    const dir = resolve(contentRoot, entry.name)
    if (await hasFile(resolve(dir, 'world.yaml'))) {
      sourceDirs.push(dir)
    }
  }
  return sourceDirs.sort((a, b) => a.localeCompare(b))
}

async function discoverDefaultContentSourceDir(): Promise<string> {
  const contentDirs = await discoverContentSourceDirs()
  const contentDir = contentDirs[0]
  if (!contentDir) {
    throw new Error(`${defaultContentRoot} 下没有找到包含 world.yaml 的内容包源目录`)
  }
  return contentDir
}

async function hasFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function loadNpcContent(contentDir: string): Promise<Pick<ContentPack, 'npcs' | 'relationships' | 'conversations'>> {
  const index = await loadArray<NpcIndexEntry>(contentDir, 'npcs/index.yaml')
  const npcs: NPC[] = []
  const relationships: RelationshipState[] = []
  const conversations: Conversation[] = []

  for (const entry of index) {
    assertNpcEntry(entry)
    const npcDir = resolve(contentDir, entry.path)
    assertNpcFiles(entry, npcDir)

    const [identity, backgroundSource, attributes, relationshipSource, behaviorSource, npcConversations] = await Promise.all([
      loadObject<Omit<NPC, 'personality' | 'state' | 'goals' | 'secrets' | 'relationships' | 'schedule' | 'behaviorRules' | 'background'>>(npcDir, 'identity.yaml'),
      loadObject<NpcBackgroundSource>(npcDir, 'background.yaml'),
      loadObject<NpcAttributesSource>(npcDir, 'attributes.yaml'),
      loadObject<NpcRelationshipSource>(npcDir, 'relationships.yaml'),
      loadObject<NpcBehaviorSource>(npcDir, 'behavior.yaml'),
      loadArray<Conversation>(npcDir, 'conversations.yaml'),
    ])
    if (!Array.isArray(behaviorSource.behaviorRules)) {
      throw new Error(`${entry.id} 的 behavior.yaml 必须包含 behaviorRules 数组`)
    }
    const schedule = normalizeNpcSchedule(entry.id, behaviorSource.schedule ?? [])

    npcs.push({
      ...identity,
      portrait: buildNpcPortraitPath(contentDir, entry.path, identity.name),
      personality: attributes.personality,
      state: attributes.state,
      goals: attributes.goals,
      secrets: attributes.secrets,
      relationships: relationshipSource.npcRelationships,
      schedule,
      behaviorRules: behaviorSource.behaviorRules,
      background: {
        publicStory: backgroundSource.publicStory,
        privateStory: backgroundSource.privateStory,
        hiddenStory: backgroundSource.hiddenStory,
      },
      designNote: backgroundSource.designNote,
    })
    relationships.push(relationshipSource.player)
    conversations.push(...npcConversations)
  }

  return { npcs, relationships, conversations }
}

function buildNpcPortraitPath(contentDir: string, npcRelativePath: string, npcName: string): string | undefined {
  const portraitFileName = `${npcName}.webp`
  if (!existsSync(resolve(contentDir, npcRelativePath, portraitFileName))) return undefined
  return `/${posix.join(encodeURIComponent(basename(contentDir)), ...npcRelativePath.split('/').map(encodeURIComponent), encodeURIComponent(portraitFileName))}`
}

function normalizeNpcSchedule(npcId: string, schedule: NpcScheduleSource): NPC['schedule'] {
  if (!Array.isArray(schedule)) {
    throw new Error(`${npcId} 的 behavior.yaml 中 schedule 必须是数组`)
  }
  return schedule.map((entry, index) => {
    const locationId = entry.locationId ?? entry.location
    if (!entry.segment || !locationId || !entry.activity) {
      throw new Error(`${npcId} 的 schedule[${index}] 必须包含 segment、location/locationId、activity`)
    }
    const { location: _location, ...rest } = entry
    return {
      ...rest,
      id: entry.id ?? `${npcId}_schedule_${entry.segment}_${index + 1}`,
      locationId,
    }
  })
}

async function loadArray<T>(baseDir: string, relativePath: string): Promise<T[]> {
  const value = await loadSourceFile(resolve(baseDir, relativePath))
  if (!Array.isArray(value)) {
    throw new Error(`${relative(baseDir, resolve(baseDir, relativePath))} 必须是数组`)
  }
  return value as T[]
}

async function loadObject<T>(baseDir: string, relativePath: string): Promise<T> {
  const value = await loadSourceFile(resolve(baseDir, relativePath))
  if (!isRecord(value)) {
    throw new Error(`${relative(baseDir, resolve(baseDir, relativePath))} 必须是对象`)
  }
  return value as T
}

async function loadSourceFile(filePath: string): Promise<unknown> {
  const raw = await readFile(filePath, 'utf8')
  const yaml = raw.replace(/^\uFEFF/, '').trim()

  if (!yaml) {
    throw new Error(`${relative(repoRoot, filePath)} 为空`)
  }

  try {
    return parseYaml(yaml)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${relative(repoRoot, filePath)} 不是合法的 YAML：${detail}`)
  }
}

function assertNpcEntry(entry: NpcIndexEntry) {
  if (!entry.id || !entry.name || !entry.path) {
    throw new Error('npcs/index.yaml 中每个 NPC 必须包含 id、name、path')
  }
}

function assertNpcFiles(entry: NpcIndexEntry, npcDir: string) {
  for (const file of requiredNpcFiles) {
    if (!entry.files.includes(file)) {
      throw new Error(`${entry.id} 在 npcs/index.yaml 中缺少 ${file}`)
    }
    if (!existsSync(resolve(npcDir, file))) {
      throw new Error(`${entry.id} 缺少 ${relative(repoRoot, resolve(npcDir, file))}`)
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
