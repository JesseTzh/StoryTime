import type { ConditionGroup, ContentPack, MapTile, PlayerAttributeState, TerrainType } from '@tss/schema'
import { orderStoryProjects } from './project-selection'
import type { StoryProject } from './types'

const balancedPlayerState: PlayerAttributeState = {
  health: 100,
  stamina: 80,
  money: 30,
  reputation: 10,
  combat: 35,
  negotiation: 45,
  medicine: 20,
  stealth: 25,
}

const starterCondition: ConditionGroup = { fact: 'story_started', equals: true }

function tile(
  id: string,
  name: string,
  x: number,
  y: number,
  terrain: TerrainType,
  overrides: Partial<MapTile> = {},
): MapTile {
  return {
    id,
    name,
    x,
    y,
    terrain,
    buildingIds: [],
    npcIds: [],
    eventIds: [],
    discovered: true,
    visible: true,
    blocked: false,
    dangerLevel: 5,
    ...overrides,
  }
}

const starterPack: ContentPack = {
  packId: 'starter_story_template',
  version: '0.1.0',
  schemaVersion: '1.0.0',
  world: {
    id: 'world_starter',
    name: '未命名世界',
    summary: '一个可直接复制扩展的基础故事工程，保留最小地图、角色、事件和结局结构。',
    editorBackground: '供编辑者扩展的空白世界：需要补充时代范围、地理边界、社会秩序、势力结构、民俗规则、超自然边界、叙事基调、资源限制和禁止突破的设定。模板默认只有最小地图、一个中立 NPC、基础交互、一个事件和两个结局，适合先验证行动、对话、条件、效果和结局链路，再逐步扩写正式内容。',
    maxDays: 7,
    segments: ['morning', 'noon', 'night'],
    actionPointsPerSegment: 2,
  },
  variables: [
    {
      key: 'main_conflict',
      name: '主线冲突',
      description: '衡量核心矛盾被推进或激化的程度。',
      initialValue: 20,
      min: 0,
      max: 100,
    },
    {
      key: 'public_trust',
      name: '公众信任',
      description: '影响角色协助、情报开放和结局评价。',
      initialValue: 50,
      min: 0,
      max: 100,
    },
  ],
  maps: [
    {
      id: 'map_starter',
      name: '基础地图',
      width: 3,
      height: 3,
      tiles: [
        tile('tile_start_01', '边界', 1, 1, 'road'),
        tile('tile_start_02', '入口', 2, 1, 'road', {
          locationId: 'loc_start_gate',
          eventIds: ['event_story_opening'],
        }),
        tile('tile_start_03', '空地', 3, 1, 'road'),
        tile('tile_start_04', '街区', 1, 2, 'town'),
        tile('tile_start_05', '中心地点', 2, 2, 'town', {
          locationId: 'loc_story_hub',
          buildingIds: ['building_story_archive'],
          npcIds: ['npc_story_anchor'],
          eventIds: ['event_first_choice'],
          dangerLevel: 8,
        }),
        tile('tile_start_06', '支线路口', 3, 2, 'town'),
        tile('tile_start_07', '外围', 1, 3, 'forest', { dangerLevel: 18 }),
        tile('tile_start_08', '隐藏地点', 2, 3, 'ruin', {
          locationId: 'loc_hidden_site',
          visible: false,
          discovered: false,
          dangerLevel: 35,
        }),
        tile('tile_start_09', '远端', 3, 3, 'forest', { dangerLevel: 22 }),
      ],
    },
  ],
  locations: [
    {
      id: 'loc_start_gate',
      name: '故事入口',
      type: 'entry',
      tags: ['入口', '初始'],
      state: { discovered: true, is_accessible: true },
      descriptions: {
        default: '玩家进入故事的第一个地点，用于放置开场事件和基础说明。',
        morning: '清晨的入口适合触发第一批引导事件。',
        noon: '正午的入口用于呈现公开冲突。',
        night: '夜晚的入口可以承接危险或秘密线索。',
      },
      buildingIds: [],
      interactionIds: ['interaction_gather_context'],
    },
    {
      id: 'loc_story_hub',
      name: '剧情中心',
      type: 'hub',
      tags: ['主线', '公共空间'],
      state: { discovered: true, is_accessible: true, tension: 20 },
      descriptions: {
        default: '主要角色、公开任务和第一批矛盾集中在这里。',
        morning: '人群聚集，适合收集公开信息。',
        noon: '冲突浮现，适合推进主线选择。',
        night: '信息变少，秘密行动更容易发生。',
      },
      buildingIds: ['building_story_archive'],
      interactionIds: ['interaction_review_archive'],
    },
    {
      id: 'loc_hidden_site',
      name: '隐藏地点',
      type: 'secret',
      tags: ['秘密', '后期'],
      state: { discovered: false, is_accessible: false },
      descriptions: {
        default: '通过事件或行动解锁，用于承载真相、奖励或高风险分支。',
        morning: '薄雾遮住了入口。',
        noon: '光线让旧痕迹变得清楚。',
        night: '这里适合触发危险事件。',
      },
      buildingIds: [],
      interactionIds: [],
    },
  ],
  buildings: [
    {
      id: 'building_story_archive',
      locationId: 'loc_story_hub',
      name: '资料室',
      type: 'archive',
      state: { unlocked: true, clues: 1 },
      descriptions: { default: '用于存放背景资料、线索和可复查记录。' },
      interactionIds: ['interaction_review_archive'],
    },
  ],
  factions: [
    {
      id: 'faction_neutral_public',
      name: '中立群体',
      description: '故事中的默认公共势力，可替换为城市、组织、村落或团队。',
      stanceToPlayer: 0,
    },
  ],
  identities: [
    {
      id: 'identity_observer',
      name: '观察者',
      backgroundSummary: '你以旁观者身份进入故事现场，负责把分散线索串成可行动的判断。',
      intro: {
        title: '观察者入局',
        story: '这个故事仍处在模板阶段，地点、人物和冲突都等待被替换成正式内容。',
        origin: '你是被安排进入现场的记录者，拥有基本行动能力和相对中立的视角。',
        motivation: '你来到这里，是为了验证故事结构是否能支撑探索、选择和后果。',
      },
      initialState: balancedPlayerState,
      advantages: ['更容易发现结构性线索'],
      disadvantages: ['缺少专精能力'],
    },
  ],
  npcs: [
    {
      id: 'npc_story_anchor',
      name: '核心角色',
      age: 32,
      identity: '主线联系人',
      tier: 'core',
      faction: 'faction_neutral_public',
      location: 'loc_story_hub',
      personality: {
        kindness: 55,
        courage: 50,
        greed: 20,
        loyalty: 60,
        suspicion: 35,
        responsibility: 70,
      },
      state: { available: true, trust: 20 },
      goals: ['说明基础冲突', '引导玩家做出第一个选择'],
      secrets: [{ id: 'secret_anchor_hint', content: '知道隐藏地点存在，但需要玩家先获得公众信任。' }],
      relationships: [],
      schedule: [],
      behaviorRules: [
        {
          id: 'rule_anchor_opens_hidden_site',
          name: '信任足够时开放隐藏地点',
          priority: 50,
          conditions: { fact: 'variables.public_trust', greater_than_or_equal: 65 },
          effects: [
            { type: 'change_location_state', locationId: 'loc_hidden_site', path: 'is_accessible', value: true },
            { type: 'set_tile_visible', tileId: 'tile_start_08', visible: true, discovered: true },
          ],
          designNote: '展示 NPC 行为规则如何改变地点和地块可见性。',
        },
      ],
      background: {
        publicStory: '他负责把玩家引入当前故事工程。',
        privateStory: '他知道一条可扩展的隐藏线。',
        hiddenStory: '他可以被替换成任意题材中的核心联系人。',
      },
      designNote: '模板角色，用于说明 NPC 字段和行为规则的组织方式。',
    },
  ],
  relationships: [],
  interactions: [
    {
      id: 'interaction_gather_context',
      name: '收集背景',
      description: '在入口收集故事背景，提升公众信任。',
      type: 'environment',
      environmentType: 'search',
      targetType: 'location',
      targetId: 'loc_start_gate',
      cost: { actionPoints: 1, stamina: 4 },
      effects: [{ type: 'change_variable', key: 'public_trust', delta: 5 }],
    },
    {
      id: 'interaction_review_archive',
      name: '查阅资料',
      description: '在资料室查阅线索，推进主线冲突。',
      type: 'environment',
      environmentType: 'search',
      targetType: 'building',
      targetId: 'building_story_archive',
      cost: { actionPoints: 1, stamina: 6 },
      effects: [
        { type: 'change_variable', key: 'main_conflict', delta: 10 },
        { type: 'add_fact', key: 'archive_reviewed', value: true },
      ],
    },
  ],
  quests: [],
  rewards: [],
  events: [
    {
      id: 'event_story_opening',
      name: '故事开场',
      type: 'location_event',
      locationId: 'loc_start_gate',
      participantIds: ['npc_story_anchor'],
      trigger: starterCondition,
      description: '玩家进入故事，系统建立第一批事实和变量。',
      effects: [
        { type: 'add_fact', key: 'opening_seen', value: true },
        { type: 'change_variable', key: 'public_trust', delta: 3 },
      ],
      followupEventIds: ['event_first_choice'],
    },
    {
      id: 'event_first_choice',
      name: '第一次选择',
      type: 'player_choice_event',
      locationId: 'loc_story_hub',
      participantIds: ['npc_story_anchor'],
      trigger: { fact: 'opening_seen', equals: true },
      description: '玩家需要通过可用交互或对话继续推进核心冲突。',
      effects: [],
      followupEventIds: [],
    },
  ],
  conversations: [
    {
      id: 'conversation_anchor_first',
      npcId: 'npc_story_anchor',
      title: '初次说明',
      entryNodeId: 'node_entry',
      conditions: starterCondition,
      nodes: [{ id: 'node_entry', speaker: 'npc_story_anchor', text: '这里是故事工程的入口。你可以替换我、地点和变量，开始新的剧情。', replies: [{ id: 'reply_end', text: '结束交谈', endConversation: true }] }],
    },
    {
      id: 'conversation_anchor_normal',
      npcId: 'npc_story_anchor',
      title: '模拟建议',
      entryNodeId: 'node_entry',
      conditions: starterCondition,
      nodes: [{ id: 'node_entry', speaker: 'npc_story_anchor', text: '每个选择都应该改变事实、变量或关系，否则模拟器很难看出差异。', replies: [{ id: 'reply_end', text: '结束交谈', endConversation: true }] }],
    },
  ],
  items: [
    {
      id: 'item_story_note',
      name: '故事便签',
      type: 'note',
      description: '用于示例背包物品结构。',
    },
  ],
  endings: [
    {
      id: 'ending_conflict_resolved',
      name: '冲突收束',
      priority: 80,
      conditions: { fact: 'variables.public_trust', greater_than_or_equal: 65 },
      summary: '玩家获得足够信任，故事进入稳定收束。',
      causalChainRules: [
        { variable: 'public_trust', operator: 'greater_than_or_equal', value: 65, text: '公众信任达到了可收束阈值。' },
      ],
    },
    {
      id: 'ending_open_thread',
      name: '开放结尾',
      priority: 10,
      conditions: starterCondition,
      summary: '故事保留未解冲突，等待后续内容继续扩展。',
      causalChainRules: [
        { variable: 'main_conflict', operator: 'greater_than_or_equal', value: 20, text: '主线冲突仍在推进。' },
      ],
    },
  ],
  runtime: {
    initialState: {
      playerLocationId: 'loc_start_gate',
      selectedTileId: 'tile_start_02',
      facts: { story_started: true },
    },
    dailyDriftRules: [
      {
        id: 'drift_conflict_pressure',
        name: '冲突自然发酵',
        conditions: starterCondition,
        effects: [{ type: 'change_variable', key: 'main_conflict', delta: 2 }],
      },
    ],
  },
}

const contentPackModules = import.meta.glob<ContentPack | { defaultPackId?: string; packs?: unknown[] }>('../../../../content/packs/*.json', {
  eager: true,
  import: 'default',
})

function folderNameFromPath(path: string) {
  return path.match(/content\/packs\/([^/]+)\.json$/)?.[1] ?? path
}

function isContentPack(value: unknown): value is ContentPack {
  return Boolean(value && typeof value === 'object' && 'packId' in value && 'world' in value && 'locations' in value)
}

const filesystemProjects: StoryProject[] = Object.entries(contentPackModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([path, pack]) => {
    if (!isContentPack(pack)) return []
    const folderName = folderNameFromPath(path)
    return [{
      id: folderName,
      name: pack.world.name,
      description: pack.world.summary,
      owner: `content/packs/${folderName}.json`,
      status: 'reviewing',
      updatedAt: pack.version,
      pack,
    }]
  })

const builtInProjects: StoryProject[] = [
  {
    id: 'starter',
    name: '空白剧情模板',
    description: '用于新建故事的最小可运行内容包。',
    owner: 'Story Lab',
    status: 'draft',
    updatedAt: '2026-04-29',
    pack: starterPack,
  },
]

export const storyProjects: StoryProject[] = orderStoryProjects(filesystemProjects, builtInProjects)
