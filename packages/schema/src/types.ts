export type TimeSegment = 'morning' | 'noon' | 'night'
export type TerrainType = 'town' | 'road' | 'forest' | 'river' | 'mountain' | 'ruin'
export type InteractionType = 'conversation' | 'give' | 'combat' | 'environment'
export type EnvironmentInteractionType = 'gather' | 'search'
export type InteractionTargetType = 'tile' | 'location' | 'building' | 'npc'
export type QuestStatus = 'active' | 'completed' | 'failed'
export type QuestCompletionType = InteractionType
export type EventType = 'time_event' | 'location_event' | 'npc_behavior_event' | 'world_state_event' | 'player_choice_event'
export type EffectType =
  | 'change_variable'
  | 'set_variable'
  | 'change_location_state'
  | 'change_building_state'
  | 'change_npc_state'
  | 'change_player_attribute'
  | 'change_relationship'
  | 'add_fact'
  | 'remove_fact'
  | 'trigger_event'
  | 'start_conversation'
  | 'move_npc'
  | 'move_player'
  | 'add_item'
  | 'remove_item'
  | 'open_shop'
  | 'discover_location'
  | 'set_tile_visible'
  | 'start_quest'
  | 'fail_quest'

export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue }
export type AnyRecord = Record<string, unknown>

export type WorldDefinition = {
  id: string
  name: string
  summary: string
  editorBackground: string
  maxDays: number
  segments: TimeSegment[]
  actionPointsPerSegment: number
}

export type VariableDefinition = {
  key: string
  name: string
  description: string
  initialValue: number
  min?: number
  max?: number
}

export type GameMap = {
  id: string
  name: string
  width: number
  height: number
  tiles: MapTile[]
}

export type MapTile = {
  id: string
  name: string
  x: number
  y: number
  terrain: TerrainType
  locationId?: string
  buildingIds: string[]
  npcIds: string[]
  eventIds: string[]
  discovered: boolean
  visible: boolean
  blocked: boolean
  dangerLevel: number
}

export type Location = {
  id: string
  name: string
  type: string
  tags: string[]
  state: AnyRecord
  descriptions: Record<TimeSegment | 'default', string>
  buildingIds: string[]
  interactionIds: string[]
}

export type Building = {
  id: string
  locationId: string
  name: string
  type: string
  state: AnyRecord
  descriptions: Record<string, string>
  interactionIds: string[]
}

export type Faction = {
  id: string
  name: string
  description: string
  stanceToPlayer: number
}

export type PlayerIdentity = {
  id: string
  name: string
  backgroundSummary: string
  intro: {
    title: string
    story: string
    origin: string
    motivation: string
  }
  initialState: PlayerAttributeState
  advantages: string[]
  disadvantages: string[]
}

export type PlayerAttributeState = {
  health: number
  stamina: number
  money: number
  reputation: number
  combat: number
  negotiation: number
  medicine: number
  stealth: number
}

export type Personality = {
  kindness: number
  courage: number
  greed: number
  loyalty: number
  suspicion: number
  responsibility: number
}

export type Secret = {
  id: string
  content: string
}

export type NpcRelationshipDefinition = {
  targetId: string
  value: number
  relationType: string
  reason: string
}

export type BehaviorRule = {
  id: string
  name: string
  priority: number
  conditions: ConditionGroup
  effects: Effect[]
  designNote?: string
}

export type NpcScheduleEntry = {
  id: string
  segment: TimeSegment
  locationId: string
  activity: string
  priority?: number
  dayRange?: {
    from?: number
    to?: number
  }
  conditions?: ConditionGroup
  effects?: Effect[]
  designNote?: string
}

export type NPC = {
  id: string
  name: string
  age: number
  identity: string
  tier: 'core' | 'important' | 'ordinary'
  faction: string
  location: string
  personality: Personality
  state: AnyRecord
  goals: string[]
  secrets: Secret[]
  relationships: NpcRelationshipDefinition[]
  schedule: NpcScheduleEntry[]
  behaviorRules: BehaviorRule[]
  interactionIds?: string[]
  portrait?: string
  background?: {
    publicStory: string
    privateStory: string
    hiddenStory: string
  }
  designNote?: string
}

export type ActionCost = {
  actionPoints?: number
  stamina?: number
  money?: number
  health?: number
  itemId?: string
  itemCount?: number
}

export type InteractionBase = {
  id: string
  name: string
  description: string
  type: InteractionType
  targetType: InteractionTargetType
  targetId: string
  cost?: ActionCost
  conditions?: ConditionGroup
  effects?: Effect[]
}

export type ConversationInteraction = InteractionBase & {
  type: 'conversation'
  conversationId: string
}

export type GiveInteraction = InteractionBase & {
  type: 'give'
  targetType: 'npc'
  targetId: string
  itemId: string
  itemCount: number
  acceptedEffects?: Effect[]
}

export type CombatInteraction = InteractionBase & {
  type: 'combat'
  enemyCombat: number
  victoryEffects?: Effect[]
}

export type EnvironmentInteraction = InteractionBase & {
  type: 'environment'
  environmentType: EnvironmentInteractionType
}

export type Interaction = ConversationInteraction | GiveInteraction | CombatInteraction | EnvironmentInteraction

export type QuestCompletion =
  | { type: 'conversation'; npcId: string; conversationId: string; replyId?: string }
  | { type: 'give'; npcId: string; itemId: string; itemCount: number; interactionId?: string }
  | { type: 'combat'; targetType: InteractionTargetType; targetId: string; result: 'victory'; interactionId?: string }
  | { type: 'environment'; environmentType: EnvironmentInteractionType; targetType: InteractionTargetType; targetId: string; interactionId?: string }

export type Quest = {
  id: string
  title: string
  description: string
  sourceNpcId: string
  conditions?: ConditionGroup
  completion: QuestCompletion
  rewardIds: string[]
}

export type Reward = {
  id: string
  name: string
  description: string
  effects: Effect[]
}

export type QuestRuntimeState = {
  id: string
  status: QuestStatus
  startedAt: { day: number; segment: TimeSegment }
  completedAt?: { day: number; segment: TimeSegment }
}

export type ConditionGroup = Condition | { all: Condition[] } | { any: Condition[] } | { not: Condition }
export type Condition =
  | { fact: string; equals: unknown }
  | { fact: string; not_equals: unknown }
  | { fact: string; greater_than: number }
  | { fact: string; greater_than_or_equal: number }
  | { fact: string; less_than: number }
  | { fact: string; less_than_or_equal: number }
  | { fact: string; in: unknown[] }
  | { fact: string; not_in: unknown[] }
  | { fact: string; exists: boolean }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }

export type Effect =
  | { type: 'change_variable'; key: string; delta: number }
  | { type: 'set_variable'; key: string; value: number }
  | { type: 'change_location_state'; locationId: string; path: string; value?: unknown; delta?: number }
  | { type: 'change_building_state'; buildingId: string; path: string; value?: unknown; delta?: number }
  | { type: 'change_npc_state'; npcId: string; path: string; value: unknown }
  | { type: 'change_player_attribute'; attribute: keyof PlayerAttributeState; delta: number }
  | { type: 'change_relationship'; source: string; target: string; path: keyof RelationshipState; delta: number }
  | { type: 'add_fact'; key: string; value: unknown }
  | { type: 'remove_fact'; key: string }
  | { type: 'trigger_event'; eventId: string }
  | { type: 'start_conversation'; conversationId: string }
  | { type: 'move_npc'; npcId: string; locationId: string }
  | { type: 'move_player'; locationId: string }
  | { type: 'add_item'; itemId: string; count: number }
  | { type: 'remove_item'; itemId: string; count: number }
  | { type: 'open_shop'; shopId: string }
  | { type: 'discover_location'; locationId: string }
  | { type: 'set_tile_visible'; tileId: string; visible: boolean; discovered?: boolean }
  | { type: 'start_quest'; questId: string }
  | { type: 'fail_quest'; questId: string }

export type GameEvent = {
  id: string
  name: string
  type: EventType
  locationId?: string
  participantIds: string[]
  trigger: ConditionGroup
  description: string
  effects: Effect[]
  followupEventIds: string[]
}

export type ConversationReply = {
  id: string
  text: string
  conditions?: ConditionGroup
  effects?: Effect[]
  nextNodeId?: string
  endConversation?: boolean
}

export type ConversationNode = {
  id: string
  speaker: 'player' | string
  text: string
  effects?: Effect[]
  replies: ConversationReply[]
}

export type Conversation = {
  id: string
  npcId: string
  title: string
  entryNodeId: string
  conditions?: ConditionGroup
  priority?: number
  nodes: ConversationNode[]
}

export type RelationshipState = {
  sourceId: string
  targetId: string
  value: number
  trust: number
  fear: number
  gratitude: number
  suspicion: number
  tags: string[]
}

export type ItemDefinition = {
  id: string
  name: string
  type: string
  description: string
}

export type CausalChainRule =
  | { fact: string; text: string }
  | { variable: string; operator: 'less_than' | 'less_than_or_equal' | 'greater_than' | 'greater_than_or_equal' | 'equals'; value: number; text: string }

export type Ending = {
  id: string
  name: string
  priority: number
  conditions: ConditionGroup
  summary: string
  causalChainRules: CausalChainRule[]
}

export type DailyDriftRule = {
  id: string
  name: string
  conditions?: ConditionGroup
  effects: Effect[]
}

export type RuntimeInitialStateConfig = {
  playerLocationId: string
  selectedTileId?: string
  facts: Record<string, unknown>
  tileOverrides?: Record<string, Partial<Pick<MapTile, 'visible' | 'discovered' | 'blocked' | 'dangerLevel'>>>
}

export type RuntimeConfig = {
  initialState: RuntimeInitialStateConfig
  dailyDriftRules: DailyDriftRule[]
}

export type ContentPack = {
  packId: string
  version: string
  schemaVersion: string
  world: WorldDefinition
  variables: VariableDefinition[]
  maps: GameMap[]
  locations: Location[]
  buildings: Building[]
  factions: Faction[]
  identities: PlayerIdentity[]
  npcs: NPC[]
  relationships: RelationshipState[]
  interactions: Interaction[]
  quests: Quest[]
  rewards: Reward[]
  events: GameEvent[]
  conversations: Conversation[]
  items: ItemDefinition[]
  endings: Ending[]
  runtime: RuntimeConfig
}

export type TimeState = {
  day: number
  segment: TimeSegment
  actionPoints: number
}

export type PlayerState = {
  identity: string
  locationId: string
  state: PlayerAttributeState
  inventory: Record<string, number>
}

export type LocationRuntimeState = {
  id: string
  state: AnyRecord
  discovered: boolean
  accessible: boolean
}

export type BuildingRuntimeState = {
  id: string
  state: AnyRecord
}

export type NpcRuntimeState = {
  id: string
  locationId: string
  state: AnyRecord
}

export type ActiveConversationState = {
  conversationId: string
  npcId: string
  nodeId: string
}

export type ConversationHistoryEntry = {
  conversationId: string
  npcId: string
  nodeId: string
  replyId?: string
  day: number
  segment: TimeSegment
}

export type WorldState = {
  variables: Record<string, number>
  locations: Record<string, LocationRuntimeState>
  buildings: Record<string, BuildingRuntimeState>
  npcs: Record<string, NpcRuntimeState>
  relationships: Record<string, RelationshipState>
  quests: Record<string, QuestRuntimeState>
  facts: Record<string, unknown>
  eventHistory: string[]
  activeEventIds: string[]
  activeConversation?: ActiveConversationState
  conversationHistory: ConversationHistoryEntry[]
  pendingEventIds: string[]
  tileOverrides: Record<string, Partial<Pick<MapTile, 'visible' | 'discovered' | 'blocked' | 'dangerLevel'>>>
}

export type LogType = 'player' | 'npc' | 'event' | 'system' | 'conversation' | 'ending'
export type GameLog = {
  id: string
  day: number
  segment: TimeSegment
  type: LogType
  message: string
  detail?: string
}

export type EndingResult = {
  ending: Ending
  causalChain: string[]
}

export type GameRuntimeState = {
  contentPackId: string
  contentPackVersion: string
  time: TimeState
  player: PlayerState
  worldState: WorldState
  selectedTileId?: string
  hoveredTileId?: string
  eventLogs: GameLog[]
  endingResult?: EndingResult
}

export type SaveGame = {
  saveId: string
  contentPackId: string
  contentPackVersion: string
  createdAt: string
  updatedAt: string
  state: GameRuntimeState
}

export type ValidationSeverity = 'error' | 'warning' | 'info'
export type ValidationIssue = {
  severity: ValidationSeverity
  type: string
  targetId?: string
  path?: string
  message: string
}

export type ValidationReport = {
  packId: string
  checkedAt: string
  errors: ValidationIssue[]
  gaps: ValidationIssue[]
  summary: {
    locations: number
    buildings: number
    npcs: number
    interactions: number
    quests: number
    rewards: number
    events: number
    conversations: number
    endings: number
  }
}
