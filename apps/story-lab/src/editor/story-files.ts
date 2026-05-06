import type { ContentPack } from '@tss/schema'
import type { StoryFile } from './types'

type FileSource = {
  file: string
  label: string
  count: number
  value: unknown
}

function serialize(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function fileStatus(count: number): StoryFile['status'] {
  return count > 0 ? 'accepted' : 'draft'
}

export function buildStoryFiles(pack: ContentPack): StoryFile[] {
  const sources: FileSource[] = [
    { file: 'content-pack.json', label: '完整内容包', count: 1, value: pack },
    {
      file: 'story.json',
      label: '故事基础',
      count: 1,
      value: {
        packId: pack.packId,
        version: pack.version,
        schemaVersion: pack.schemaVersion,
      },
    },
    { file: 'world.json', label: '世界参数', count: 1, value: pack.world },
    { file: 'variables.json', label: '世界变量', count: pack.variables.length, value: pack.variables },
    { file: 'maps.json', label: '地图地块', count: pack.maps.reduce((total, map) => total + map.tiles.length, 0), value: pack.maps },
    { file: 'locations.json', label: '地点', count: pack.locations.length, value: pack.locations },
    { file: 'buildings.json', label: '建筑', count: pack.buildings.length, value: pack.buildings },
    { file: 'factions.json', label: '势力', count: pack.factions.length, value: pack.factions },
    { file: 'identities.json', label: '玩家身份', count: pack.identities.length, value: pack.identities },
    {
      file: 'npcs/index.json',
      label: 'NPC 索引',
      count: pack.npcs.length,
      value: pack.npcs.map((npc) => ({
        id: npc.id,
        name: npc.name,
        tier: npc.tier,
        faction: npc.faction,
        location: npc.location,
      })),
    },
    { file: 'npcs/details.json', label: 'NPC 详情', count: pack.npcs.length, value: pack.npcs },
    { file: 'relationships.json', label: '关系网络', count: pack.relationships.length, value: pack.relationships },
    { file: 'interactions.json', label: '交互', count: pack.interactions.length, value: pack.interactions },
    { file: 'quests.json', label: '任务', count: pack.quests.length, value: pack.quests },
    { file: 'rewards.json', label: '奖励', count: pack.rewards.length, value: pack.rewards },
    { file: 'events.json', label: '事件', count: pack.events.length, value: pack.events },
    { file: 'conversations.json', label: '会话', count: pack.conversations.length, value: pack.conversations },
    { file: 'items.json', label: '物品', count: pack.items.length, value: pack.items },
    { file: 'endings.json', label: '结局', count: pack.endings.length, value: pack.endings },
    { file: 'runtime.json', label: '运行时规则', count: pack.runtime.dailyDriftRules.length, value: pack.runtime },
  ]

  return sources.map((source) => ({
    id: source.file,
    file: source.file,
    label: source.label,
    status: fileStatus(source.count),
    count: source.count,
    content: serialize(source.value),
  }))
}
