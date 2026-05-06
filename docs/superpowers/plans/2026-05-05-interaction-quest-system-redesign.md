# Interaction Quest System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace direct executable actions and event player options with first-class interactions, quests, explicit rewards, and simplified combat.

**Architecture:** The schema becomes the contract: `ContentPack` exposes `interactions`, `quests`, and `rewards`, while `events` become world-only. Engine work is split into a quest engine, an interaction/combat engine, and small updates to conversations, effects, events, turns, and simulation. Client and Story Lab consume those new engine APIs and no longer render event choices or direct action lists.

**Tech Stack:** TypeScript, React, Zustand, Vite, Vitest, pnpm workspaces, YAML content source, local JSON content-pack build artifacts.

---

## File Structure

- Modify `packages/schema/src/types.ts`: add interaction, quest, reward, quest runtime, quest effects; remove `ActionType`, `GameAction`, and `PlayerOption`.
- Modify `packages/schema/src/constants.ts`: replace `ACTION_TYPES` with `INTERACTION_TYPES`, `ENVIRONMENT_INTERACTION_TYPES`, and quest constants; remove event player-option assumptions.
- Create `packages/engine/src/quest-engine.ts`: start, fail, complete, reward, and completion matching.
- Modify `packages/engine/src/interaction-engine.ts`: replace direct action execution with interaction availability/execution, travel helpers, and combat resolution.
- Modify `packages/engine/src/conversation-engine.ts`: process quest effects and conversation completion triggers after replies.
- Modify `packages/engine/src/effect-engine.ts`: apply `start_quest` and `fail_quest`.
- Modify `packages/engine/src/event-engine.ts`: remove active event option flow.
- Modify `packages/engine/src/initial-state.ts`: initialize `worldState.quests`.
- Modify `packages/engine/src/ending-engine.ts`: expose immediate ending evaluation for death.
- Modify `packages/engine/src/simulation-engine.ts`: expand interaction and conversation reply steps only.
- Modify `packages/engine/src/index.ts`: export `quest-engine`.
- Modify `packages/validator/src/schema-validator.ts`: validate new schema and reject legacy fields.
- Modify `packages/validator/src/reference-validator.ts`: validate interactions, quests, and rewards.
- Modify `packages/validator/src/effect-validator.ts`: validate reward effects and new effect shapes.
- Modify `packages/validator/src/fact-path-validator.ts`: validate interaction and quest conditions.
- Modify `packages/validator/src/logic-validator.ts`: update interaction, quest, and death-ending warnings/errors.
- Modify `scripts/content-source.ts`: load `interactions.yaml`, `quests.yaml`, and `rewards.yaml`.
- Modify `scripts/build-content-pack.ts`: no logic change expected after `content-source.ts`, but run through build verification.
- Rename content source files `content/*/actions.yaml` to `content/*/interactions.yaml`.
- Create content source files `content/*/quests.yaml` and `content/*/rewards.yaml`.
- Modify content source `locations.yaml`, `buildings.yaml`, NPC `identity.yaml`, and `events.yaml` files to remove `actionIds` and `playerOptions`.
- Regenerate `content/packs/manifest.json`, `content/packs/demo_crossroads.json`, and `content/packs/qinglan_town_mvp.json`.
- Modify `apps/game-client/src/store/content-index.ts`: index interactions and quest lookup data.
- Modify `apps/game-client/src/store/game-store.ts`: expose `executeInteraction`, `getInteractionEntriesForSelectedTile`, and `getQuestEntries`; remove direct action and event option commands.
- Modify `apps/game-client/src/pages/game/game-page.tsx`: replace `EventChoicePanel` with `QuestPanel`.
- Delete `apps/game-client/src/features/events/EventChoicePanel.tsx`.
- Create `apps/game-client/src/features/quests/QuestPanel.tsx`: right-side quest UI.
- Modify `apps/game-client/src/features/map/components/TileInfoPanel.tsx`: render interaction groups by NPC/building/location.
- Modify `apps/game-client/src/features/conversation/ConversationPanel.tsx`: keep conversation UI but support quest-starting/completing consequences.
- Modify `apps/game-client/src/features/player/TopStatusBar.tsx`: remove active event count chip and surface active quest count.
- Modify `apps/game-client/src/features/world/StoryGuidePanel.tsx`: derive guide items from quests, or remove old active-event dependency if unused.
- Modify Story Lab files: `apps/story-lab/src/editor/template-catalog.ts`, `apps/story-lab/src/editor/dashboard-overview.ts`, `apps/story-lab/src/pages/editor/event-graph-page.tsx`, `apps/story-lab/src/pages/editor/npc-studio-page.tsx`, and related tests.
- Modify docs: `docs/content-schema.md`, `docs/validator.md`, and generated plan/spec references only where terminology is user-facing.

## Task 1: Schema And Legacy Rejection

**Files:**
- Modify: `packages/schema/src/types.ts`
- Modify: `packages/schema/src/constants.ts`
- Modify: `packages/validator/src/schema-validator.ts`
- Test: `scripts/validator-regression.test.ts`

- [ ] **Step 1: Write failing schema/validator tests**

Add tests near the top of `scripts/validator-regression.test.ts`:

```ts
test('validator rejects legacy actions and event player options', () => {
  const pack = makeValidationPack()
  const legacyPack = pack as unknown as { actions?: unknown[]; events: Array<{ playerOptions?: unknown[] }> }
  legacyPack.actions = [{ id: 'action_legacy' }]
  legacyPack.events[0].playerOptions = [{ id: 'option_legacy', name: 'Legacy option', effects: [] }]

  const errors = validateContentPack(pack).errors

  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'actions')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'events.playerOptions')).toBe(true)
})

test('validator requires interactions quests and rewards arrays', () => {
  const pack = makeValidationPack()
  const broken = pack as unknown as { interactions?: unknown; quests?: unknown; rewards?: unknown }
  delete broken.interactions
  broken.quests = undefined
  broken.rewards = 'bad'

  const errors = validateContentPack(pack).errors

  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'interactions')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'quests')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'rewards')).toBe(true)
})
```

Update `makeValidationPack()` in the same file so the returned object has the new shape while the legacy rejection test reintroduces old fields:

```ts
locations: [
  {
    id: 'loc_test',
    name: 'Test Location',
    type: 'test',
    tags: [],
    state: { is_accessible: true },
    descriptions: {
      default: 'A test location.',
      morning: 'A test location.',
      noon: 'A test location.',
      night: 'A test location.',
    },
    buildingIds: ['building_test'],
    interactionIds: ['interaction_search_test'],
  },
],
buildings: [
  {
    id: 'building_test',
    locationId: 'loc_test',
    name: 'Test Building',
    type: 'test',
    state: {},
    descriptions: { default: 'A test building.' },
    interactionIds: [],
  },
],
interactions: [
  {
    id: 'interaction_search_test',
    name: 'Search Test Location',
    description: 'Search the test location.',
    type: 'environment',
    environmentType: 'search',
    targetType: 'location',
    targetId: 'loc_test',
    conditions: { fact: 'variables.rapport', greater_than_or_equal: 0 },
    effects: [{ type: 'change_variable', key: 'rapport', delta: 1 }],
  },
],
events: [
  {
    id: 'event_test',
    name: 'Test Event',
    type: 'location_event',
    locationId: 'loc_test',
    participantIds: ['npc_test'],
    trigger: { fact: 'variables.rapport', greater_than_or_equal: 1 },
    description: 'A test event.',
    effects: [],
    followupEventIds: [],
  },
],
quests: [
  {
    id: 'quest_test',
    title: 'Test Quest',
    description: 'Complete the test quest.',
    sourceNpcId: 'npc_test',
    completion: {
      type: 'environment',
      environmentType: 'search',
      targetType: 'location',
      targetId: 'loc_test',
      interactionId: 'interaction_search_test',
    },
    rewardIds: ['reward_test'],
  },
],
rewards: [
  {
    id: 'reward_test',
    name: 'Test Reward',
    description: 'Raises rapport.',
    effects: [{ type: 'change_variable', key: 'rapport', delta: 2 }],
  },
],
```

- [ ] **Step 2: Run the red test**

Run:

```bash
pnpm test scripts/validator-regression.test.ts
```

Expected: FAIL because the schema still expects `actions`, does not know `interactions`, `quests`, or `rewards`, and does not reject `events.playerOptions`.

- [ ] **Step 3: Update schema types**

In `packages/schema/src/types.ts`, replace the old action model with this API shape:

```ts
export type InteractionType = 'conversation' | 'give' | 'combat' | 'environment'
export type EnvironmentInteractionType = 'gather' | 'search'
export type InteractionTargetType = 'tile' | 'location' | 'building' | 'npc'
export type QuestStatus = 'active' | 'completed' | 'failed'
export type QuestCompletionType = InteractionType

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
```

Also update:

```ts
export type Location = {
  // existing fields...
  interactionIds: string[]
}

export type Building = {
  // existing fields...
  interactionIds: string[]
}

export type NPC = {
  // existing fields...
  interactionIds?: string[]
}

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

export type Effect =
  // keep existing effect variants
  | { type: 'start_quest'; questId: string }
  | { type: 'fail_quest'; questId: string }

export type WorldState = {
  // existing fields...
  quests: Record<string, QuestRuntimeState>
}

export type ContentPack = {
  // existing fields...
  interactions: Interaction[]
  quests: Quest[]
  rewards: Reward[]
  events: GameEvent[]
}
```

Remove exported `ActionType`, `GameAction`, `SuccessCheck`, and `PlayerOption`.

- [ ] **Step 4: Update schema constants**

In `packages/schema/src/constants.ts`, replace action constants with:

```ts
import type { EnvironmentInteractionType, EventType, InteractionType, QuestCompletionType, QuestStatus, TerrainType, TimeSegment } from './types'

export const INTERACTION_TYPES: InteractionType[] = ['conversation', 'give', 'combat', 'environment']
export const ENVIRONMENT_INTERACTION_TYPES: EnvironmentInteractionType[] = ['gather', 'search']
export const QUEST_COMPLETION_TYPES: QuestCompletionType[] = ['conversation', 'give', 'combat', 'environment']
export const QUEST_STATUSES: QuestStatus[] = ['active', 'completed', 'failed']
```

Keep the existing time, terrain, event, effect, and conversation impact constants, and add `'start_quest'` and `'fail_quest'` to `EFFECT_TYPES`.

- [ ] **Step 5: Update schema validator**

In `packages/validator/src/schema-validator.ts`:

```ts
import {
  CONVERSATION_IMPACT_TONES,
  CONVERSATION_IMPACT_TYPES,
  EFFECT_TYPES,
  ENVIRONMENT_INTERACTION_TYPES,
  EVENT_TYPES,
  INTERACTION_TYPES,
  QUEST_COMPLETION_TYPES,
  TERRAIN_TYPES,
  TIME_SEGMENTS,
} from '@tss/schema'
```

Use this top-level array:

```ts
const requiredArrays: Array<keyof ContentPack> = ['variables', 'maps', 'locations', 'buildings', 'factions', 'identities', 'npcs', 'relationships', 'interactions', 'quests', 'rewards', 'events', 'conversations', 'items', 'endings']
```

Add legacy rejection at the top of `validateSchema`:

```ts
const rawPack = pack as unknown as Record<string, unknown>
if (Array.isArray(rawPack.actions)) issues.push(issue('error', 'schema_error', '顶层 actions 已废弃，请使用 interactions', pack.packId, 'actions'))
for (const event of pack.events ?? []) {
  if (Array.isArray((event as unknown as Record<string, unknown>).playerOptions)) {
    issues.push(issue('error', 'schema_error', 'events.playerOptions 已废弃，请使用 interactions、conversations 或 quests', event.id, 'events.playerOptions'))
  }
}
```

Replace unique action id validation with:

```ts
validateUniqueIds('interactions', pack.interactions.map((item) => item.id), issues)
validateUniqueIds('quests', pack.quests.map((item) => item.id), issues)
validateUniqueIds('rewards', pack.rewards.map((item) => item.id), issues)
```

Add interaction and quest shape checks:

```ts
for (const interaction of pack.interactions) {
  if (!INTERACTION_TYPES.includes(interaction.type)) issues.push(issue('error', 'schema_error', `非法交互类型：${interaction.type}`, interaction.id, 'type'))
  if (!interaction.name || !interaction.targetId) issues.push(issue('error', 'schema_error', '交互缺少 name 或 targetId', interaction.id))
  if (interaction.type === 'environment' && !ENVIRONMENT_INTERACTION_TYPES.includes(interaction.environmentType)) {
    issues.push(issue('error', 'schema_error', `非法环境交互类型：${interaction.environmentType}`, interaction.id, 'environmentType'))
  }
  if (interaction.type === 'give' && interaction.itemCount <= 0) issues.push(issue('error', 'schema_error', '给予交互 itemCount 必须大于 0', interaction.id, 'itemCount'))
  if (interaction.type === 'combat' && interaction.enemyCombat < 0) issues.push(issue('error', 'schema_error', '战斗交互 enemyCombat 不能小于 0', interaction.id, 'enemyCombat'))
}

for (const quest of pack.quests) {
  if (!quest.title) issues.push(issue('error', 'schema_error', 'quest.title 必填', quest.id, 'title'))
  if (!quest.description) issues.push(issue('error', 'schema_error', 'quest.description 必填', quest.id, 'description'))
  if (!quest.sourceNpcId) issues.push(issue('error', 'schema_error', 'quest.sourceNpcId 必填', quest.id, 'sourceNpcId'))
  if (!quest.completion || !QUEST_COMPLETION_TYPES.includes(quest.completion.type)) issues.push(issue('error', 'schema_error', 'quest.completion 必须定义合法完成方式', quest.id, 'completion'))
  if (!Array.isArray(quest.rewardIds) || quest.rewardIds.length === 0) issues.push(issue('error', 'schema_error', 'quest.rewardIds 必须至少包含一个奖励', quest.id, 'rewardIds'))
}

for (const reward of pack.rewards) {
  if (!reward.name) issues.push(issue('error', 'schema_error', 'reward.name 必填', reward.id, 'name'))
  if (!reward.description) issues.push(issue('error', 'schema_error', 'reward.description 必填', reward.id, 'description'))
  if (!Array.isArray(reward.effects) || reward.effects.length === 0) issues.push(issue('error', 'schema_error', 'reward.effects 必须至少包含一个效果', reward.id, 'effects'))
}
```

Update all effect loops in this file to include `interaction.effects`, `acceptedEffects`, `victoryEffects`, and `reward.effects`, and remove event option loops.

- [ ] **Step 6: Run the green test**

Run:

```bash
pnpm test scripts/validator-regression.test.ts
```

Expected: PASS for validator regression tests.

- [ ] **Step 7: Commit schema task**

Run:

```bash
git add packages/schema/src/types.ts packages/schema/src/constants.ts packages/validator/src/schema-validator.ts scripts/validator-regression.test.ts
git commit -m "feat(schema): add interactions quests and rewards"
```

## Task 2: Quest Engine And Reward Effects

**Files:**
- Create: `packages/engine/src/quest-engine.ts`
- Create: `packages/engine/src/test-content-pack.ts`
- Modify: `packages/engine/src/effect-engine.ts`
- Modify: `packages/engine/src/initial-state.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/src/quest-engine.test.ts`

- [ ] **Step 1: Write failing quest engine tests**

Create `packages/engine/src/test-content-pack.ts` with the `makePack()` object below exported as `makeBaseInteractionPack()`. Then create `packages/engine/src/quest-engine.test.ts` and import that helper:

```ts
import type { ContentPack } from '@tss/schema'

export function makeBaseInteractionPack(): ContentPack {
  return {
    packId: 'quest_test_pack',
    version: '0.1.0',
    schemaVersion: '0.1.0',
    world: {
      id: 'world_test',
      name: 'Test World',
      summary: 'A test world.',
      editorBackground: 'Editor background.',
      playerIntroduction: 'Player introduction.',
      maxDays: 3,
      segments: ['morning', 'noon', 'night'],
      actionPointsPerSegment: 3,
    },
    variables: [{ key: 'rapport', name: 'Rapport', description: 'Trust value.', initialValue: 0, min: 0, max: 100 }],
    maps: [{
      id: 'map_test',
      name: 'Test Map',
      width: 1,
      height: 1,
      tiles: [{
        id: 'tile_test',
        name: 'Test Tile',
        x: 0,
        y: 0,
        terrain: 'town',
        locationId: 'loc_test',
        buildingIds: [],
        npcIds: ['npc_test'],
        eventIds: [],
        discovered: true,
        visible: true,
        blocked: false,
        dangerLevel: 0,
      }],
    }],
    locations: [{
      id: 'loc_test',
      name: 'Test Location',
      type: 'test',
      tags: [],
      state: { is_accessible: true },
      descriptions: { default: 'Test.', morning: 'Test.', noon: 'Test.', night: 'Test.' },
      buildingIds: [],
      interactionIds: ['interaction_search_test'],
    }],
    buildings: [],
    factions: [{ id: 'faction_test', name: 'Test Faction', description: 'Faction.', stanceToPlayer: 0 }],
    identities: [{
      id: 'identity_test',
      name: 'Test Identity',
      description: 'Identity.',
      backgroundSummary: 'A test background.',
      intro: {
        title: 'Arrival',
        story: 'Story.',
        origin: 'Origin.',
        motivation: 'Motivation.',
      },
      initialState: { health: 100, stamina: 100, money: 5, reputation: 0, combat: 20, negotiation: 10, medicine: 0, stealth: 0 },
      advantages: [],
      disadvantages: [],
    }],
    npcs: [{
      id: 'npc_test',
      name: 'Test NPC',
      age: 30,
      identity: 'Quest giver',
      tier: 'core',
      faction: 'faction_test',
      location: 'loc_test',
      personality: { kindness: 50, courage: 50, greed: 0, loyalty: 50, suspicion: 0, responsibility: 50 },
      state: { alive: true },
      goals: [],
      secrets: [],
      relationships: [],
      schedule: [],
      behaviorRules: [],
      interactionIds: [],
    }],
    relationships: [{
      sourceId: 'player',
      targetId: 'npc_test',
      value: 0,
      trust: 0,
      fear: 0,
      gratitude: 0,
      suspicion: 0,
      tags: [],
    }],
    interactions: [{
      id: 'interaction_search_test',
      name: 'Search',
      description: 'Search the location.',
      type: 'environment',
      environmentType: 'search',
      targetType: 'location',
      targetId: 'loc_test',
      effects: [{ type: 'add_fact', key: 'searched', value: true }],
    }],
    quests: [{
      id: 'quest_search_test',
      title: 'Search Test',
      description: 'Search the location.',
      sourceNpcId: 'npc_test',
      completion: {
        type: 'environment',
        environmentType: 'search',
        targetType: 'location',
        targetId: 'loc_test',
        interactionId: 'interaction_search_test',
      },
      rewardIds: ['reward_rapport'],
    }],
    rewards: [{
      id: 'reward_rapport',
      name: 'Rapport Reward',
      description: 'Raises rapport.',
      effects: [{ type: 'change_variable', key: 'rapport', delta: 5 }],
    }],
    events: [],
    conversations: [],
    items: [],
    endings: [{
      id: 'ending_test',
      name: 'Test Ending',
      priority: 1,
      conditions: { fact: 'time.day', greater_than_or_equal: 3 },
      summary: 'Done.',
      causalChainRules: [],
    }],
    runtime: { initialState: { playerLocationId: 'loc_test', selectedTileId: 'tile_test', facts: {} }, dailyDriftRules: [] },
  }
}
```

Create `packages/engine/src/quest-engine.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { createInitialRuntimeState } from './initial-state'
import { completeQuest, getQuestEntries, resolveQuestCompletions, startQuest } from './quest-engine'
import { makeBaseInteractionPack } from './test-content-pack'

describe('quest engine', () => {
  test('starts a quest and lists active entries', () => {
    const pack = makeBaseInteractionPack()
    const state = createInitialRuntimeState(pack, 'identity_test')

    const result = startQuest(pack, state, 'quest_search_test')

    expect(result.ok).toBe(true)
    expect(result.state.worldState.quests.quest_search_test.status).toBe('active')
    expect(getQuestEntries(pack, result.state)[0].quest.id).toBe('quest_search_test')
  })

  test('completes a quest once and applies reward effects once', () => {
    const pack = makeBaseInteractionPack()
    const state = startQuest(pack, createInitialRuntimeState(pack, 'identity_test'), 'quest_search_test').state

    const first = resolveQuestCompletions(pack, state, {
      type: 'environment',
      environmentType: 'search',
      targetType: 'location',
      targetId: 'loc_test',
      interactionId: 'interaction_search_test',
    })
    const second = completeQuest(pack, first.state, 'quest_search_test')

    expect(first.state.worldState.quests.quest_search_test.status).toBe('completed')
    expect(first.state.worldState.variables.rapport).toBe(5)
    expect(second.state.worldState.variables.rapport).toBe(5)
  })
})
```

- [ ] **Step 2: Run the red test**

Run:

```bash
pnpm test packages/engine/src/quest-engine.test.ts
```

Expected: FAIL because `quest-engine.ts` does not exist.

- [ ] **Step 3: Implement quest runtime initialization**

In `packages/engine/src/initial-state.ts`, add `quests: {}` inside `worldState`.

- [ ] **Step 4: Implement quest engine**

Create `packages/engine/src/quest-engine.ts` with these public exports:

```ts
import type { ContentPack, GameLog, GameRuntimeState, InteractionTargetType, Quest, QuestCompletion, QuestRuntimeState } from '@tss/schema'
import { evaluateCondition } from './condition-engine'
import { applyEffects } from './effect-engine'
import { cloneState, makeLog } from './state-utils'

export type QuestCompletionTrigger =
  | { type: 'conversation'; npcId: string; conversationId: string; replyId?: string }
  | { type: 'give'; npcId: string; itemId: string; itemCount: number; interactionId?: string }
  | { type: 'combat'; targetType: InteractionTargetType; targetId: string; result: 'victory'; interactionId?: string }
  | { type: 'environment'; environmentType: 'gather' | 'search'; targetType: InteractionTargetType; targetId: string; interactionId?: string }

export type QuestResult = { state: GameRuntimeState; logs: GameLog[]; ok: boolean; reasons: string[] }
export type QuestEntry = { quest: Quest; status: QuestRuntimeState['status']; sourceName: string; rewardNames: string[] }

export function startQuest(pack: ContentPack, state: GameRuntimeState, questId: string): QuestResult {
  const quest = pack.quests.find((item) => item.id === questId)
  if (!quest) return { state, logs: [], ok: false, reasons: ['任务不存在'] }
  const existing = state.worldState.quests[quest.id]
  if (existing?.status === 'completed') return { state, logs: [], ok: false, reasons: ['任务已完成'] }
  if (existing?.status === 'failed') return { state, logs: [], ok: false, reasons: ['任务已失败'] }
  if (!evaluateCondition(quest.conditions, state)) return { state, logs: [], ok: false, reasons: ['任务条件未满足'] }
  const next = cloneState(state)
  next.worldState.quests[quest.id] = {
    id: quest.id,
    status: 'active',
    startedAt: { day: next.time.day, segment: next.time.segment },
  }
  const logs = [makeLog(next, 'system', `任务开始：${quest.title}`, quest.description)]
  next.eventLogs = [...next.eventLogs, ...logs]
  return { state: next, logs, ok: true, reasons: [] }
}

export function failQuest(pack: ContentPack, state: GameRuntimeState, questId: string): QuestResult {
  const quest = pack.quests.find((item) => item.id === questId)
  if (!quest) return { state, logs: [], ok: false, reasons: ['任务不存在'] }
  const current = state.worldState.quests[quest.id]
  if (current?.status === 'completed') return { state, logs: [], ok: false, reasons: ['任务已完成'] }
  const next = cloneState(state)
  next.worldState.quests[quest.id] = {
    id: quest.id,
    status: 'failed',
    startedAt: current?.startedAt ?? { day: next.time.day, segment: next.time.segment },
  }
  const logs = [makeLog(next, 'system', `任务失败：${quest.title}`, quest.description)]
  next.eventLogs = [...next.eventLogs, ...logs]
  return { state: next, logs, ok: true, reasons: [] }
}

export function completeQuest(pack: ContentPack, state: GameRuntimeState, questId: string): QuestResult {
  const quest = pack.quests.find((item) => item.id === questId)
  if (!quest) return { state, logs: [], ok: false, reasons: ['任务不存在'] }
  const current = state.worldState.quests[quest.id]
  if (current?.status === 'completed') return { state, logs: [], ok: true, reasons: [] }
  if (current?.status === 'failed') return { state, logs: [], ok: false, reasons: ['任务已失败'] }
  const next = cloneState(state)
  const logs: GameLog[] = [makeLog(next, 'system', `任务完成：${quest.title}`, quest.description)]
  next.worldState.quests[quest.id] = {
    id: quest.id,
    status: 'completed',
    startedAt: current?.startedAt ?? { day: next.time.day, segment: next.time.segment },
    completedAt: { day: next.time.day, segment: next.time.segment },
  }
  for (const rewardId of quest.rewardIds) {
    const reward = pack.rewards.find((item) => item.id === rewardId)
    if (!reward) {
      logs.push(makeLog(next, 'system', `任务奖励不存在：${rewardId}`))
      continue
    }
    logs.push(makeLog(next, 'system', `获得奖励：${reward.name}`, reward.description))
    logs.push(...applyEffects(pack, next, reward.effects))
  }
  next.eventLogs = [...next.eventLogs, ...logs]
  return { state: next, logs, ok: true, reasons: [] }
}

export function resolveQuestCompletions(pack: ContentPack, state: GameRuntimeState, trigger: QuestCompletionTrigger): { state: GameRuntimeState; logs: GameLog[] } {
  let next = state
  const logs: GameLog[] = []
  for (const quest of pack.quests) {
    const runtime = next.worldState.quests[quest.id]
    if (runtime?.status !== 'active') continue
    if (!questCompletionMatches(quest.completion, trigger)) continue
    const result = completeQuest(pack, next, quest.id)
    next = result.state
    logs.push(...result.logs)
  }
  return { state: next, logs }
}

export function getQuestEntries(pack: ContentPack, state: GameRuntimeState): QuestEntry[] {
  return Object.values(state.worldState.quests)
    .map((runtime) => {
      const quest = pack.quests.find((item) => item.id === runtime.id)
      if (!quest) return undefined
      const sourceName = pack.npcs.find((npc) => npc.id === quest.sourceNpcId)?.name ?? quest.sourceNpcId
      const rewardNames = quest.rewardIds.map((id) => pack.rewards.find((reward) => reward.id === id)?.name ?? id)
      return { quest, status: runtime.status, sourceName, rewardNames }
    })
    .filter((entry): entry is QuestEntry => Boolean(entry))
    .sort((left, right) => Number(left.status === 'completed') - Number(right.status === 'completed') || left.quest.title.localeCompare(right.quest.title))
}

function questCompletionMatches(completion: QuestCompletion, trigger: QuestCompletionTrigger): boolean {
  if (completion.type !== trigger.type) return false
  if ('interactionId' in completion && completion.interactionId && 'interactionId' in trigger && completion.interactionId !== trigger.interactionId) return false
  if (completion.type === 'conversation' && trigger.type === 'conversation') {
    return completion.npcId === trigger.npcId && completion.conversationId === trigger.conversationId && (!completion.replyId || completion.replyId === trigger.replyId)
  }
  if (completion.type === 'give' && trigger.type === 'give') {
    return completion.npcId === trigger.npcId && completion.itemId === trigger.itemId && trigger.itemCount >= completion.itemCount
  }
  if (completion.type === 'combat' && trigger.type === 'combat') {
    return completion.result === trigger.result && completion.targetType === trigger.targetType && completion.targetId === trigger.targetId
  }
  if (completion.type === 'environment' && trigger.type === 'environment') {
    return completion.environmentType === trigger.environmentType && completion.targetType === trigger.targetType && completion.targetId === trigger.targetId
  }
  return false
}
```

- [ ] **Step 5: Add quest effects**

In `packages/engine/src/effect-engine.ts`, import `startQuest` and `failQuest`:

```ts
import { failQuest, startQuest } from './quest-engine'
```

Add cases:

```ts
case 'start_quest': {
  const result = startQuest(pack, state, effect.questId)
  logs.push(...result.logs)
  break
}
case 'fail_quest': {
  const result = failQuest(pack, state, effect.questId)
  logs.push(...result.logs)
  break
}
```

Because `applyEffect` mutates the passed `state`, update `startQuest` and `failQuest` to support an internal mutating helper if the initial implementation returns a cloned state but does not mutate the argument. The green condition is that effects applied from conversations and interactions can start or fail quests without losing the mutation.

- [ ] **Step 6: Export quest engine**

In `packages/engine/src/index.ts`, add:

```ts
export * from './quest-engine'
```

- [ ] **Step 7: Run the quest tests**

Run:

```bash
pnpm test packages/engine/src/quest-engine.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit quest task**

Run:

```bash
git add packages/engine/src/quest-engine.ts packages/engine/src/quest-engine.test.ts packages/engine/src/test-content-pack.ts packages/engine/src/effect-engine.ts packages/engine/src/initial-state.ts packages/engine/src/index.ts
git commit -m "feat(engine): add quest rewards runtime"
```

## Task 3: Interaction Engine And Simplified Combat

**Files:**
- Modify: `packages/engine/src/interaction-engine.ts`
- Modify: `packages/engine/src/ending-engine.ts`
- Modify: `packages/engine/src/turn-engine.ts`
- Test: `packages/engine/src/interaction-engine.test.ts`

- [ ] **Step 1: Write failing interaction and combat tests**

Create or replace `packages/engine/src/interaction-engine.test.ts` with tests that import `makeBaseInteractionPack` from `packages/engine/src/test-content-pack.ts` and add one item plus give/combat interactions:

```ts
import { describe, expect, test } from 'vitest'
import type { ContentPack } from '@tss/schema'
import { createInitialRuntimeState } from './initial-state'
import { executeInteraction, getInteractionAvailability } from './interaction-engine'
import { startQuest } from './quest-engine'
import { makeBaseInteractionPack } from './test-content-pack'

function makePack(): ContentPack {
  const pack = makeBaseInteractionPack()
  pack.items = [{ id: 'item_letter', name: 'Letter', type: 'quest', description: 'A quest item.' }]
  pack.interactions.push(
    {
      id: 'interaction_give_letter',
      name: 'Give Letter',
      description: 'Give the letter.',
      type: 'give',
      targetType: 'npc',
      targetId: 'npc_test',
      itemId: 'item_letter',
      itemCount: 1,
      acceptedEffects: [{ type: 'change_relationship', source: 'player', target: 'npc_test', path: 'trust', delta: 3 }],
    },
    {
      id: 'interaction_fight_test',
      name: 'Fight Test',
      description: 'Fight a weak enemy.',
      type: 'combat',
      targetType: 'npc',
      targetId: 'npc_test',
      enemyCombat: 10,
      victoryEffects: [{ type: 'add_fact', key: 'enemy_defeated', value: true }],
    },
  )
  pack.quests.push(
    {
      id: 'quest_give_test',
      title: 'Give Test',
      description: 'Give the letter.',
      sourceNpcId: 'npc_test',
      completion: { type: 'give', npcId: 'npc_test', itemId: 'item_letter', itemCount: 1, interactionId: 'interaction_give_letter' },
      rewardIds: ['reward_rapport'],
    },
    {
      id: 'quest_combat_test',
      title: 'Combat Test',
      description: 'Win the fight.',
      sourceNpcId: 'npc_test',
      completion: { type: 'combat', targetType: 'npc', targetId: 'npc_test', result: 'victory', interactionId: 'interaction_fight_test' },
      rewardIds: ['reward_rapport'],
    },
  )
  pack.endings.unshift({
    id: 'ending_death',
    name: 'Death',
    priority: 100,
    conditions: { fact: 'facts.player_dead', equals: true },
    summary: 'The player died.',
    causalChainRules: [{ fact: 'player_dead', text: 'The player died in combat.' }],
  })
  return pack
}

describe('interaction engine', () => {
  test('blocks unavailable give interactions when item is missing', () => {
    const pack = makePack()
    const state = createInitialRuntimeState(pack, 'identity_test')
    const interaction = pack.interactions.find((item) => item.id === 'interaction_give_letter')!

    const availability = getInteractionAvailability(pack, state, interaction)

    expect(availability.available).toBe(false)
    expect(availability.reasons.join('；')).toContain('物品不足')
  })

  test('give interaction consumes item and completes give quest', () => {
    const pack = makePack()
    const initial = createInitialRuntimeState(pack, 'identity_test')
    initial.player.inventory.item_letter = 1
    const active = startQuest(pack, initial, 'quest_give_test').state

    const result = executeInteraction(pack, active, 'interaction_give_letter')

    expect(result.ok).toBe(true)
    expect(result.state.player.inventory.item_letter).toBe(0)
    expect(result.state.worldState.quests.quest_give_test.status).toBe('completed')
    expect(result.state.worldState.variables.rapport).toBe(5)
  })

  test('combat victory damages player defeats npc and completes combat quest', () => {
    const pack = makePack()
    const active = startQuest(pack, createInitialRuntimeState(pack, 'identity_test'), 'quest_combat_test').state

    const result = executeInteraction(pack, active, 'interaction_fight_test')

    expect(result.ok).toBe(true)
    expect(result.state.player.state.health).toBeLessThan(100)
    expect(result.state.worldState.npcs.npc_test.state.alive).toBe(false)
    expect(result.state.worldState.facts.enemy_defeated).toBe(true)
    expect(result.state.worldState.quests.quest_combat_test.status).toBe('completed')
  })

  test('combat defeat kills player and evaluates death ending immediately', () => {
    const pack = makePack()
    const state = createInitialRuntimeState(pack, 'identity_test')
    state.player.state.combat = 1
    const interaction = pack.interactions.find((item) => item.id === 'interaction_fight_test')
    if (interaction?.type === 'combat') interaction.enemyCombat = 99

    const result = executeInteraction(pack, state, 'interaction_fight_test')

    expect(result.ok).toBe(true)
    expect(result.state.player.state.health).toBe(0)
    expect(result.state.worldState.facts.player_dead).toBe(true)
    expect(result.state.endingResult?.ending.id).toBe('ending_death')
  })
})
```

- [ ] **Step 2: Run the red test**

Run:

```bash
pnpm test packages/engine/src/interaction-engine.test.ts
```

Expected: FAIL because the old interaction engine expects `GameAction` and does not expose the new interaction API.

- [ ] **Step 3: Replace action APIs in interaction engine**

In `packages/engine/src/interaction-engine.ts`, keep travel helpers and replace old action exports with:

```ts
import type { ContentPack, GameLog, GameRuntimeState, Interaction } from '@tss/schema'
import { evaluateEnding } from './ending-engine'
import { evaluateCondition, explainConditionFailures } from './condition-engine'
import { applyEffects } from './effect-engine'
import { resolveQuestCompletions, type QuestCompletionTrigger } from './quest-engine'
import { cloneState, getLocationTile, makeLog } from './state-utils'

export type Availability = { available: boolean; reasons: string[] }
export type AvailabilityOptions = { ignoreLocation?: boolean }
```

Implement these functions:

```ts
export function checkInteractionCost(state: GameRuntimeState, interaction: Pick<Interaction, 'cost'>): string[] {
  const cost = interaction.cost
  if (!cost) return []
  const reasons: string[] = []
  if ((cost.actionPoints ?? 0) > state.time.actionPoints) reasons.push(`行动点不足，需要 ${cost.actionPoints}`)
  if ((cost.stamina ?? 0) > state.player.state.stamina) reasons.push(`体力不足，需要 ${cost.stamina}`)
  if ((cost.money ?? 0) > state.player.state.money) reasons.push(`金钱不足，需要 ${cost.money}`)
  if ((cost.health ?? 0) >= state.player.state.health) reasons.push('生命不足，需要保留生命')
  if (cost.itemId && (state.player.inventory[cost.itemId] ?? 0) < (cost.itemCount ?? 1)) reasons.push(`物品不足：${cost.itemId}`)
  return reasons
}

export function getInteractionTargetLocationId(pack: ContentPack, state: GameRuntimeState, interaction: Interaction): string | undefined {
  if (interaction.targetType === 'location') return interaction.targetId
  if (interaction.targetType === 'building') return pack.buildings.find((building) => building.id === interaction.targetId)?.locationId
  if (interaction.targetType === 'npc') return state.worldState.npcs[interaction.targetId]?.locationId ?? pack.npcs.find((npc) => npc.id === interaction.targetId)?.location
  if (interaction.targetType === 'tile') return pack.maps.flatMap((map) => map.tiles).find((tile) => tile.id === interaction.targetId)?.locationId
  return undefined
}

export function getInteractionAvailability(pack: ContentPack, state: GameRuntimeState, interaction: Interaction, options: AvailabilityOptions = {}): Availability {
  const reasons = [...checkInteractionCost(state, interaction)]
  if (!options.ignoreLocation) {
    const locationId = getInteractionTargetLocationId(pack, state, interaction)
    if (!locationId) reasons.push('交互目标无法定位')
    else if (locationId !== state.player.locationId) reasons.push('需要先前往目标地点')
  }
  if (interaction.targetType === 'npc' && state.worldState.npcs[interaction.targetId]?.state.alive === false) reasons.push('目标当前无法互动')
  if (interaction.type === 'give' && (state.player.inventory[interaction.itemId] ?? 0) < interaction.itemCount) reasons.push(`物品不足：${interaction.itemId}`)
  if (!evaluateCondition(interaction.conditions, state)) {
    reasons.push(...explainConditionFailures(interaction.conditions, state).map((item) => `${item.fact ?? '条件'}：需要 ${item.expected}，当前 ${String(item.actual)}`))
  }
  return { available: reasons.length === 0, reasons }
}
```

Add execution helpers:

```ts
function consumeInteractionCost(state: GameRuntimeState, interaction: Interaction): void {
  const cost = interaction.cost ?? { actionPoints: 1 }
  state.time.actionPoints = Math.max(0, state.time.actionPoints - (cost.actionPoints ?? 1))
  if (cost.stamina) state.player.state.stamina = Math.max(0, state.player.state.stamina - cost.stamina)
  if (cost.money) state.player.state.money = Math.max(0, state.player.state.money - cost.money)
  if (cost.health) state.player.state.health = Math.max(0, state.player.state.health - cost.health)
  if (cost.itemId) state.player.inventory[cost.itemId] = Math.max(0, (state.player.inventory[cost.itemId] ?? 0) - (cost.itemCount ?? 1))
}

function resolveCombat(pack: ContentPack, state: GameRuntimeState, interaction: Extract<Interaction, { type: 'combat' }>): { logs: GameLog[]; trigger?: QuestCompletionTrigger } {
  const playerCombat = state.player.state.combat
  const gap = playerCombat - interaction.enemyCombat
  if (gap < 0) {
    state.player.state.health = 0
    state.worldState.facts.player_dead = true
    const ending = evaluateEnding(pack, state)
    if (ending) state.endingResult = ending
    return { logs: [makeLog(state, 'player', `战斗失败：${interaction.name}`, interaction.description)] }
  }
  const damage = Math.max(1, Math.ceil(interaction.enemyCombat / Math.max(1, playerCombat + 10) * 12))
  state.player.state.health = Math.max(0, state.player.state.health - damage)
  const logs = [makeLog(state, 'player', `战斗胜利：${interaction.name}`, `生命 -${damage}`)]
  if (interaction.targetType === 'npc') {
    const target = state.worldState.npcs[interaction.targetId]
    if (target) target.state.alive = false
  }
  logs.push(...applyEffects(pack, state, interaction.victoryEffects ?? []))
  return { logs, trigger: { type: 'combat', targetType: interaction.targetType, targetId: interaction.targetId, result: 'victory', interactionId: interaction.id } }
}
```

Implement `executeInteraction`:

```ts
export function executeInteraction(pack: ContentPack, state: GameRuntimeState, interactionId: string): { state: GameRuntimeState; logs: GameLog[]; ok: boolean; reasons: string[] } {
  const interaction = pack.interactions.find((item) => item.id === interactionId)
  if (!interaction) return { state, logs: [], ok: false, reasons: ['交互不存在'] }
  const availability = getInteractionAvailability(pack, state, interaction)
  if (!availability.available) return { state, logs: [], ok: false, reasons: availability.reasons }

  const next = cloneState(state)
  const logs: GameLog[] = [makeLog(next, 'player', `执行交互：${interaction.name}`, interaction.description)]
  consumeInteractionCost(next, interaction)
  logs.push(...applyEffects(pack, next, interaction.effects ?? []))

  let trigger: QuestCompletionTrigger | undefined
  if (interaction.type === 'environment') {
    trigger = { type: 'environment', environmentType: interaction.environmentType, targetType: interaction.targetType, targetId: interaction.targetId, interactionId: interaction.id }
  } else if (interaction.type === 'give') {
    next.player.inventory[interaction.itemId] = Math.max(0, (next.player.inventory[interaction.itemId] ?? 0) - interaction.itemCount)
    logs.push(...applyEffects(pack, next, interaction.acceptedEffects ?? []))
    trigger = { type: 'give', npcId: interaction.targetId, itemId: interaction.itemId, itemCount: interaction.itemCount, interactionId: interaction.id }
  } else if (interaction.type === 'combat') {
    const combat = resolveCombat(pack, next, interaction)
    logs.push(...combat.logs)
    trigger = combat.trigger
  } else if (interaction.type === 'conversation') {
    logs.push(...applyEffects(pack, next, [{ type: 'start_conversation', conversationId: interaction.conversationId }]))
    trigger = { type: 'conversation', npcId: pack.conversations.find((conversation) => conversation.id === interaction.conversationId)?.npcId ?? interaction.targetId, conversationId: interaction.conversationId }
  }

  if (trigger) {
    const questResult = resolveQuestCompletions(pack, next, trigger)
    next.worldState = questResult.state.worldState
    next.player = questResult.state.player
    next.endingResult = questResult.state.endingResult
    logs.push(...questResult.logs)
  }
  next.eventLogs = [...next.eventLogs, ...logs]
  return { state: next, logs, ok: true, reasons: [] }
}
```

Retain `getTravelAvailability` and `movePlayerToLocation`, updated only for import names if needed.

- [ ] **Step 4: Run the interaction tests**

Run:

```bash
pnpm test packages/engine/src/interaction-engine.test.ts packages/engine/src/quest-engine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit interaction task**

Run:

```bash
git add packages/engine/src/interaction-engine.ts packages/engine/src/interaction-engine.test.ts packages/engine/src/ending-engine.ts packages/engine/src/turn-engine.ts
git commit -m "feat(engine): execute interactions and combat"
```

## Task 4: Conversation Quest Completion, World Events, And Simulation

**Files:**
- Modify: `packages/engine/src/conversation-engine.ts`
- Modify: `packages/engine/src/event-engine.ts`
- Modify: `packages/engine/src/simulation-engine.ts`
- Test: `scripts/conversation-engine-regression.test.ts`
- Test: `scripts/simulation-tree-regression.test.ts`
- Test: `scripts/simulation-coverage-regression.test.ts`

- [ ] **Step 1: Write failing conversation quest completion test**

In `scripts/conversation-engine-regression.test.ts`, add:

```ts
test('conversation reply can complete an active conversation quest', () => {
  const pack = makeConversationPack()
  pack.quests = [{
    id: 'quest_reply_test',
    title: 'Reply Test',
    description: 'Choose the reply.',
    sourceNpcId: 'npc_test',
    completion: { type: 'conversation', npcId: 'npc_test', conversationId: 'conversation_test', replyId: 'reply_help' },
    rewardIds: ['reward_reply_test'],
  }]
  pack.rewards = [{
    id: 'reward_reply_test',
    name: 'Reply Reward',
    description: 'Raises rapport.',
    effects: [{ type: 'change_variable', key: 'rapport', delta: 7 }],
  }]
  const startedQuest = startQuest(pack, createInitialRuntimeState(pack, 'identity_test'), 'quest_reply_test').state
  const startedConversation = startConversation(pack, startedQuest, 'conversation_test').state

  const result = chooseConversationReply(pack, startedConversation, 'reply_help')

  expect(result.ok).toBe(true)
  expect(result.state.worldState.quests.quest_reply_test.status).toBe('completed')
  expect(result.state.worldState.variables.rapport).toBe(7)
})
```

Import `startQuest` from `@tss/engine` in the same file.

- [ ] **Step 2: Run the red test**

Run:

```bash
pnpm test scripts/conversation-engine-regression.test.ts
```

Expected: FAIL because `chooseConversationReply` does not resolve quest completions.

- [ ] **Step 3: Update conversation engine**

In `packages/engine/src/conversation-engine.ts`, import:

```ts
import { resolveQuestCompletions } from './quest-engine'
```

Inside `chooseConversationReply`, after reply effects and before final `next.eventLogs`, add:

```ts
const questResult = resolveQuestCompletions(pack, next, {
  type: 'conversation',
  npcId: activeEntry.conversation.npcId,
  conversationId: activeEntry.conversation.id,
  replyId: reply.id,
})
next.worldState = questResult.state.worldState
next.player = questResult.state.player
next.endingResult = questResult.state.endingResult
logs.push(...questResult.logs)
```

- [ ] **Step 4: Remove event option state**

In `packages/engine/src/event-engine.ts`:

```ts
import type { ContentPack, GameEvent, GameLog, GameRuntimeState } from '@tss/schema'
import { evaluateCondition } from './condition-engine'
import { applyEffects } from './effect-engine'
import { cloneState, makeLog } from './state-utils'
```

Remove `getOptionAvailability` import and delete `resolveEventOption`.

In `triggerEvent`, remove the branch that pushes to `activeEventIds`. Events now only apply effects and queue follow-ups:

```ts
function triggerEvent(pack: ContentPack, state: GameRuntimeState, event: GameEvent): GameLog[] {
  if (state.worldState.eventHistory.includes(event.id)) return []
  state.worldState.eventHistory.push(event.id)
  const logs: GameLog[] = [makeLog(state, 'event', `事件触发：${event.name}`, event.description)]
  logs.push(...applyEffects(pack, state, event.effects))
  for (const followup of event.followupEventIds) {
    if (!state.worldState.eventHistory.includes(followup) && !state.worldState.pendingEventIds.includes(followup)) {
      state.worldState.pendingEventIds.push(followup)
    }
  }
  return logs
}
```

Leave `activeEventIds` in runtime only if it is still needed for save compatibility within this branch; otherwise remove it from `WorldState` in Task 1 and from initial state here.

- [ ] **Step 5: Update simulation**

In `packages/engine/src/simulation-engine.ts`:

- Replace `GameAction` import with `Interaction`.
- Replace `SimulationCoverageStepKind` with:

```ts
export type SimulationCoverageStepKind = 'conversation_start' | 'conversation_reply' | 'interaction' | 'travel' | 'advance_time'
```

- Replace `scoreAction` with `scoreInteraction` using the same text scoring against interaction id/name.
- Replace `chooseAction` with `chooseInteraction`.
- Replace `chooseTravelDestination` to inspect `pack.interactions` and `getInteractionTargetLocationId`.
- Delete `resolveActiveEvents`.
- In `simulateDays`, execute the chosen interaction with `executeInteraction`.
- In `expandSimulationCoverageState`, delete the loop over `state.worldState.activeEventIds` and event options.
- Replace the `pack.actions` loop with:

```ts
for (const interaction of pack.interactions) {
  if (!getInteractionAvailability(pack, state, interaction).available) continue
  const result = executeInteraction(pack, state, interaction.id)
  if (!result.ok) continue
  const next = compactLogs(withPostTurn(pack, result.state))
  if (hashMeaningfulState(next) === currentMeaningfulState) continue
  transitions.push({
    step: makeStep(state, 'interaction', interaction.id, interaction.name),
    state: next,
  })
}
```

- [ ] **Step 6: Run simulation and conversation tests**

Run:

```bash
pnpm test scripts/conversation-engine-regression.test.ts scripts/simulation-tree-regression.test.ts scripts/simulation-coverage-regression.test.ts
```

Expected: PASS after updating test fixture pack builders to use `interactions`, `quests`, and `rewards`.

- [ ] **Step 7: Commit conversation/event/simulation task**

Run:

```bash
git add packages/engine/src/conversation-engine.ts packages/engine/src/event-engine.ts packages/engine/src/simulation-engine.ts scripts/conversation-engine-regression.test.ts scripts/simulation-tree-regression.test.ts scripts/simulation-coverage-regression.test.ts
git commit -m "feat(engine): remove event choices from simulation"
```

## Task 5: Validator References, Effects, And Content Loading

**Files:**
- Modify: `packages/validator/src/reference-validator.ts`
- Modify: `packages/validator/src/effect-validator.ts`
- Modify: `packages/validator/src/fact-path-validator.ts`
- Modify: `packages/validator/src/logic-validator.ts`
- Modify: `packages/validator/src/validate-content-pack.ts`
- Modify: `scripts/content-source.ts`
- Test: `scripts/validator-regression.test.ts`
- Test: `apps/game-client/src/store/content-loader.test.ts`
- Test: `apps/game-client/src/store/content-index.test.ts`

- [ ] **Step 1: Write failing validator reference tests**

In `scripts/validator-regression.test.ts`, add:

```ts
test('validator reports bad interaction quest and reward references', () => {
  const pack = makeValidationPack()
  pack.interactions[0].targetId = 'missing_location'
  pack.quests[0].sourceNpcId = 'missing_npc'
  pack.quests[0].rewardIds = ['missing_reward']
  pack.rewards[0].effects = [{ type: 'add_item', itemId: 'missing_item', count: 1 }]

  const errors = validateContentPack(pack).errors

  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'interaction_search_test')).toBe(true)
  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'quest_test')).toBe(true)
  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'reward_test')).toBe(true)
})
```

- [ ] **Step 2: Run the red test**

Run:

```bash
pnpm test scripts/validator-regression.test.ts
```

Expected: FAIL because reference validators still inspect `actions` and event options.

- [ ] **Step 3: Update reference validator**

In `packages/validator/src/reference-validator.ts`:

- Make `makeSets` include `interactions`, `quests`, and `rewards`, and remove `actions`.
- Update `validateEffectReference` to validate `start_quest` and `fail_quest` against `sets.quests`.
- Replace location/building action references with interaction references.
- Validate each interaction target:

```ts
for (const interaction of pack.interactions) {
  if (interaction.targetType === 'location' && !sets.locations.has(interaction.targetId)) issues.push(issue('error', 'reference_error', `交互目标地点不存在：${interaction.targetId}`, interaction.id))
  if (interaction.targetType === 'building' && !sets.buildings.has(interaction.targetId)) issues.push(issue('error', 'reference_error', `交互目标建筑不存在：${interaction.targetId}`, interaction.id))
  if (interaction.targetType === 'npc' && !sets.npcs.has(interaction.targetId)) issues.push(issue('error', 'reference_error', `交互目标 NPC 不存在：${interaction.targetId}`, interaction.id))
  if (interaction.targetType === 'tile' && !sets.tiles.has(interaction.targetId)) issues.push(issue('error', 'reference_error', `交互目标地块不存在：${interaction.targetId}`, interaction.id))
  if (interaction.type === 'conversation' && !sets.conversations.has(interaction.conversationId)) issues.push(issue('error', 'reference_error', `交互会话不存在：${interaction.conversationId}`, interaction.id))
  if (interaction.type === 'give' && !sets.items.has(interaction.itemId)) issues.push(issue('error', 'reference_error', `给予物品不存在：${interaction.itemId}`, interaction.id))
  for (const effect of [...(interaction.effects ?? []), ...(interaction.type === 'give' ? interaction.acceptedEffects ?? [] : []), ...(interaction.type === 'combat' ? interaction.victoryEffects ?? [] : [])]) {
    issues.push(...validateEffectReference(effect, pack, interaction.id))
  }
}
```

- Validate quests and rewards:

```ts
for (const quest of pack.quests) {
  if (!sets.npcs.has(quest.sourceNpcId)) issues.push(issue('error', 'reference_error', `任务来源 NPC 不存在：${quest.sourceNpcId}`, quest.id))
  for (const rewardId of quest.rewardIds) if (!sets.rewards.has(rewardId)) issues.push(issue('error', 'reference_error', `任务奖励不存在：${rewardId}`, quest.id))
  validateQuestCompletionReference(quest.completion, quest.id)
}
for (const reward of pack.rewards) for (const effect of reward.effects) issues.push(...validateEffectReference(effect, pack, reward.id))
```

Implement `validateQuestCompletionReference` in the same file using the sets: conversation completions check NPC and conversation ids, give completions check NPC/item/interaction ids, combat completions check target and optional interaction ids, environment completions check target and optional interaction ids.

- [ ] **Step 4: Update effect and fact validators**

In `packages/validator/src/effect-validator.ts`, replace action and event option loops with interaction and reward loops. Validate `itemCount`, `enemyCombat`, and `reward.effects`.

In `packages/validator/src/fact-path-validator.ts`, validate `interaction.conditions`, `quest.conditions`, event triggers, conversation conditions, endings, NPC schedules/behavior, and runtime drift rules. Remove old action and event option loops.

- [ ] **Step 5: Update story logic validator**

In `packages/validator/src/logic-validator.ts`:

```ts
for (const location of pack.locations) {
  if (location.interactionIds.length === 0 && location.buildingIds.length === 0) issues.push(issue('warning', 'logic_warning', '地点没有任何交互内容', location.id))
}
for (const building of pack.buildings) {
  if (building.interactionIds.length === 0) issues.push(issue('warning', 'logic_warning', '建筑没有 interaction', building.id))
}
for (const event of pack.events) {
  if (event.effects.length === 0) issues.push(issue('warning', 'logic_warning', '事件没有任何状态变化', event.id))
}
for (const quest of pack.quests) {
  if (quest.rewardIds.length === 0) issues.push(issue('error', 'logic_error', '任务没有奖励', quest.id))
}
if (pack.interactions.some((interaction) => interaction.type === 'combat')) {
  const hasDeathEnding = pack.endings.some((ending) => JSON.stringify(ending.conditions).includes('player_dead'))
  if (!hasDeathEnding) issues.push(issue('error', 'logic_error', '存在战斗交互但没有 player_dead 死亡结局'))
}
```

- [ ] **Step 6: Update content source loader**

In `scripts/content-source.ts`, update imports:

```ts
import type { ContentPack, Conversation, NPC, RelationshipState } from '@tss/schema'
```

Load `interactions`, `quests`, and `rewards`:

```ts
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
```

Return:

```ts
interactions,
quests,
rewards,
events,
```

- [ ] **Step 7: Run validator and loader tests**

Run:

```bash
pnpm test scripts/validator-regression.test.ts apps/game-client/src/store/content-loader.test.ts apps/game-client/src/store/content-index.test.ts
```

Expected: PASS after updating test fixtures to the new shape.

- [ ] **Step 8: Commit validator and loader task**

Run:

```bash
git add packages/validator/src/reference-validator.ts packages/validator/src/effect-validator.ts packages/validator/src/fact-path-validator.ts packages/validator/src/logic-validator.ts packages/validator/src/validate-content-pack.ts scripts/content-source.ts scripts/validator-regression.test.ts apps/game-client/src/store/content-loader.test.ts apps/game-client/src/store/content-index.test.ts
git commit -m "feat(validator): validate interactions quests rewards"
```

## Task 6: Game Client Store And UI

**Files:**
- Modify: `apps/game-client/src/store/content-index.ts`
- Modify: `apps/game-client/src/store/game-store.ts`
- Modify: `apps/game-client/src/pages/game/game-page.tsx`
- Delete: `apps/game-client/src/features/events/EventChoicePanel.tsx`
- Create: `apps/game-client/src/features/quests/QuestPanel.tsx`
- Modify: `apps/game-client/src/features/map/components/TileInfoPanel.tsx`
- Modify: `apps/game-client/src/features/conversation/ConversationPanel.tsx`
- Modify: `apps/game-client/src/features/player/TopStatusBar.tsx`
- Modify: `apps/game-client/src/features/world/StoryGuidePanel.tsx`
- Test: `scripts/game-client-source-constraints.test.ts`
- Test: `apps/game-client/src/store/content-index.test.ts`

- [ ] **Step 1: Write failing client source constraint tests**

In `scripts/game-client-source-constraints.test.ts`, add expectations:

```ts
test('game client no longer renders pending event choice surface', () => {
  const sourceFiles = getSourceFiles('apps/game-client/src')
  const combined = sourceFiles.map((file) => readFileSync(file, 'utf8')).join('\n')

  expect(combined).not.toContain('EventChoicePanel')
  expect(combined).not.toContain('resolveEventOption')
  expect(combined).not.toContain('getAvailableActionsForSelectedTile')
  expect(combined).not.toContain('可执行行动')
  expect(combined).toContain('QuestPanel')
})
```

- [ ] **Step 2: Run the red test**

Run:

```bash
pnpm test scripts/game-client-source-constraints.test.ts
```

Expected: FAIL because the client still imports `EventChoicePanel`, action APIs, and old UI labels.

- [ ] **Step 3: Update content index**

In `apps/game-client/src/store/content-index.ts`, replace `GameAction` with `Interaction` and add maps:

```ts
import type { Building, ContentPack, Conversation, Interaction, Location, MapTile, Quest, Reward } from '@tss/schema'

export type ContentIndex = {
  tileById: Map<string, MapTile>
  tileByLocationId: Map<string, MapTile>
  locationById: Map<string, Location>
  buildingById: Map<string, Building>
  interactionById: Map<string, Interaction>
  questById: Map<string, Quest>
  rewardById: Map<string, Reward>
  conversationsByNpcId: Map<string, Conversation[]>
}
```

Return:

```ts
interactionById: new Map(pack.interactions.map((interaction) => [interaction.id, interaction])),
questById: new Map(pack.quests.map((quest) => [quest.id, quest])),
rewardById: new Map(pack.rewards.map((reward) => [reward.id, reward])),
```

- [ ] **Step 4: Update game store**

In `apps/game-client/src/store/game-store.ts`:

- Replace imports `GameAction`, `executeAction`, and `getActionAvailability` with `Interaction`, `executeInteraction`, `getInteractionAvailability`, and `getQuestEntries`.
- Remove `resolveEventOption`.
- Add methods:

```ts
executeInteraction: (interactionId: string) => void
getInteractionEntriesForSelectedTile: () => Array<{ interaction: Interaction; available: boolean; reasons: string[] }>
getQuestEntries: () => ReturnType<typeof getQuestEntriesFromEngine>
```

Use an alias for the engine function:

```ts
import { getQuestEntries as getQuestEntriesFromEngine } from '@tss/engine'
```

Implementation:

```ts
executeInteraction(interactionId) {
  const { contentPack, runtime } = get()
  if (!runtime) return
  const result = runInteraction(contentPack, runtime, interactionId)
  if (!result.ok) return set({ lastError: result.reasons.join('；') })
  const after = withPostTurn(contentPack, result.state)
  persist(after)
  set({ runtime: after, lastError: undefined })
},
getInteractionEntriesForSelectedTile() {
  const { contentPack, contentIndex, runtime } = get()
  const tile = get().getSelectedTile()
  if (!runtime || !tile?.locationId) return []
  const location = contentIndex.locationById.get(tile.locationId)
  const buildingIds = location?.buildingIds ?? []
  const buildingInteractionIds = buildingIds.flatMap((id) => contentIndex.buildingById.get(id)?.interactionIds ?? [])
  const currentNpcIds = Object.values(runtime.worldState.npcs).filter((npc) => npc.locationId === tile.locationId && npc.state.alive !== false).map((npc) => npc.id)
  const npcInteractionIds = currentNpcIds.flatMap((id) => contentPack.npcs.find((npc) => npc.id === id)?.interactionIds ?? [])
  const ids = Array.from(new Set([...(location?.interactionIds ?? []), ...buildingInteractionIds, ...npcInteractionIds]))
  return ids
    .map((id) => contentIndex.interactionById.get(id))
    .filter((interaction): interaction is Interaction => Boolean(interaction))
    .map((interaction) => ({ interaction, ...getInteractionAvailability(contentPack, runtime, interaction) }))
},
getQuestEntries() {
  const { contentPack, runtime } = get()
  return runtime ? getQuestEntriesFromEngine(contentPack, runtime) : []
},
```

- [ ] **Step 5: Create QuestPanel**

Create `apps/game-client/src/features/quests/QuestPanel.tsx`:

```tsx
import { CheckCircle2, Gift, ScrollText, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGameStore } from '@/store/game-store'

export function QuestPanel() {
  const entries = useGameStore((state) => state.getQuestEntries())
  const active = entries.filter((entry) => entry.status === 'active')
  const completed = entries.filter((entry) => entry.status === 'completed')

  return (
    <Card className="flex h-full flex-col overflow-hidden border-white/10 bg-black/40 backdrop-blur-md" data-test-id="quest-panel">
      <CardHeader className="shrink-0 border-b border-white/10 bg-black/20 pb-4 pt-4" data-test-id="quest-panel-header">
        <CardTitle className="flex items-center gap-2 text-amber-100" data-test-id="quest-panel-title">
          <ScrollText className="size-4" data-test-id="quest-panel-title-icon" />任务
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto p-4" data-test-id="quest-panel-content">
        {entries.length === 0 && <p className="text-sm text-stone-500" data-test-id="quest-panel-empty">暂无当前任务。</p>}
        {active.length > 0 && (
          <section className="space-y-2" data-test-id="quest-active-section">
            {active.map((entry) => <QuestRow key={entry.quest.id} entry={entry} />)}
          </section>
        )}
        {completed.length > 0 && (
          <section className="space-y-2" data-test-id="quest-completed-section">
            <div className="text-xs text-stone-400" data-test-id="quest-completed-title">已完成</div>
            {completed.map((entry) => <QuestRow key={entry.quest.id} entry={entry} compact />)}
          </section>
        )}
      </CardContent>
    </Card>
  )
}

function QuestRow({
  entry,
  compact = false,
}: {
  entry: ReturnType<ReturnType<typeof useGameStore.getState>['getQuestEntries']>[number]
  compact?: boolean
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-black/15 p-3" data-test-id={`quest-row-${entry.quest.id}`}>
      <div className="flex items-start justify-between gap-2" data-test-id={`quest-row-header-${entry.quest.id}`}>
        <div className="min-w-0" data-test-id={`quest-row-copy-${entry.quest.id}`}>
          <div className="font-medium text-amber-100" data-test-id={`quest-title-${entry.quest.id}`}>{entry.quest.title}</div>
          {!compact && <p className="mt-2 text-sm leading-6 text-stone-300" data-test-id={`quest-description-${entry.quest.id}`}>{entry.quest.description}</p>}
        </div>
        <Badge className={entry.status === 'completed' ? 'border-emerald-300/20 text-emerald-100' : 'text-amber-100'} data-test-id={`quest-status-${entry.quest.id}`}>
          {entry.status === 'completed' ? <CheckCircle2 className="mr-1 size-3" data-test-id={`quest-status-icon-${entry.quest.id}`} /> : null}
          {entry.status === 'completed' ? '完成' : '进行中'}
        </Badge>
      </div>
      {!compact && (
        <div className="mt-3 space-y-2 text-xs text-stone-400" data-test-id={`quest-meta-${entry.quest.id}`}>
          <div className="flex items-center gap-2" data-test-id={`quest-source-${entry.quest.id}`}><UserRound className="size-3" data-test-id={`quest-source-icon-${entry.quest.id}`} />来源：{entry.sourceName}</div>
          <div className="flex flex-wrap items-center gap-1" data-test-id={`quest-rewards-${entry.quest.id}`}>
            <Gift className="size-3" data-test-id={`quest-rewards-icon-${entry.quest.id}`} />奖励：
            {entry.rewardNames.map((name) => <Badge key={name} className="text-stone-300" data-test-id={`quest-reward-${entry.quest.id}-${name}`}>{name}</Badge>)}
          </div>
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 6: Replace right-side panel**

In `apps/game-client/src/pages/game/game-page.tsx`:

```tsx
import { QuestPanel } from '@/features/quests/QuestPanel'
```

Replace:

```tsx
<EventChoicePanel />
```

with:

```tsx
<QuestPanel />
```

Delete `apps/game-client/src/features/events/EventChoicePanel.tsx`.

- [ ] **Step 7: Update TileInfoPanel interactions**

In `apps/game-client/src/features/map/components/TileInfoPanel.tsx`:

- Replace `GameAction` with `Interaction`.
- Replace action labels with:

```ts
const interactionTypeLabel: Record<Interaction['type'], string> = {
  conversation: '对话',
  give: '给予',
  combat: '战斗',
  environment: '环境互动',
}

const environmentTypeLabel: Record<EnvironmentInteractionType, string> = {
  gather: '采集',
  search: '搜索',
}
```

- Use `getInteractionEntriesForSelectedTile` from the store.
- Rename the section title to `交互`.
- Rename `data-test-id` prefixes from `tile-action-*` to `tile-interaction-*`.
- Execute with `executeInteraction(interaction.id)`.
- For `interaction.type === 'environment'`, render an extra badge with `environmentTypeLabel[interaction.environmentType]`.
- For `interaction.type === 'combat'`, render an enemy combat badge.
- Keep the conversation topic UI in place.

- [ ] **Step 8: Update TopStatusBar and StoryGuidePanel**

In `TopStatusBar`, replace active events with active quests:

```ts
const activeQuests = Object.values(runtime.worldState.quests).filter((quest) => quest.status === 'active').length
```

Render:

```tsx
{activeQuests > 0 && <span className="status-chip is-accent" data-test-id="top-status-active-quests">任务 {activeQuests}</span>}
```

In `StoryGuidePanel`, remove `activeEventIds` usage. Build guide items from `getQuestEntries()` and show active quest titles. If no active quests, use a generic current-location item.

- [ ] **Step 9: Run client tests**

Run:

```bash
pnpm test scripts/game-client-source-constraints.test.ts apps/game-client/src/store/content-index.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit client task**

Run:

```bash
git add apps/game-client/src/store/content-index.ts apps/game-client/src/store/game-store.ts apps/game-client/src/pages/game/game-page.tsx apps/game-client/src/features/quests/QuestPanel.tsx apps/game-client/src/features/map/components/TileInfoPanel.tsx apps/game-client/src/features/conversation/ConversationPanel.tsx apps/game-client/src/features/player/TopStatusBar.tsx apps/game-client/src/features/world/StoryGuidePanel.tsx scripts/game-client-source-constraints.test.ts apps/game-client/src/store/content-index.test.ts
git add -A apps/game-client/src/features/events/EventChoicePanel.tsx
git commit -m "feat(game-client): show interactions and quests"
```

## Task 7: Story Lab And Docs

**Files:**
- Modify: `apps/story-lab/src/editor/template-catalog.ts`
- Modify: `apps/story-lab/src/editor/dashboard-overview.ts`
- Modify: `apps/story-lab/src/pages/editor/event-graph-page.tsx`
- Modify: `apps/story-lab/src/pages/editor/npc-studio-page.tsx`
- Modify: `apps/story-lab/src/pages/editor/shared.tsx`
- Modify: `docs/content-schema.md`
- Modify: `docs/validator.md`
- Test: `scripts/story-lab-source-constraints.test.ts`
- Test: `scripts/story-lab-dashboard-overview.test.ts`
- Test: `scripts/story-lab-ui-primitives.test.ts`

- [ ] **Step 1: Write failing Story Lab source constraint test**

In `scripts/story-lab-source-constraints.test.ts`, add:

```ts
test('story lab uses interaction and quest terminology instead of legacy action branches', () => {
  const sourceFiles = getSourceFiles('apps/story-lab/src')
  const combined = sourceFiles.map((file) => readFileSync(file, 'utf8')).join('\n')

  expect(combined).not.toContain('events[].playerOptions')
  expect(combined).not.toContain('actions[]')
  expect(combined).not.toContain('玩家选项')
  expect(combined).toContain('interactions[]')
  expect(combined).toContain('quests[]')
  expect(combined).toContain('rewards[]')
})
```

Use that file's existing source-file helper names if they differ.

- [ ] **Step 2: Run the red test**

Run:

```bash
pnpm test scripts/story-lab-source-constraints.test.ts
```

Expected: FAIL because Story Lab still documents actions and event player options.

- [ ] **Step 3: Update template catalog**

In `apps/story-lab/src/editor/template-catalog.ts`:

- Replace `ACTION_TYPES` import with `INTERACTION_TYPES` and `ENVIRONMENT_INTERACTION_TYPES`.
- Change location field `locations[].actionIds` to `locations[].interactionIds`.
- Change building fields to `buildings[].interactionIds`.
- Rename category "事件、行动与会话" to "事件、交互、任务与会话".
- Remove `events[].playerOptions`.
- Add fields:

```ts
{ name: 'interactions[].id', type: 'string', required: true, impact: '交互唯一标识。', example: 'interaction_search_archive' },
{ name: 'interactions[].type', type: 'InteractionType', required: true, impact: '决定玩家通过对话、给予、战斗或环境互动推进内容。', example: 'environment' },
{ name: 'interactions[].environmentType', type: 'EnvironmentInteractionType', required: false, impact: '环境互动的采集或搜索类型。', example: 'search' },
{ name: 'interactions[].targetType / targetId', type: 'InteractionTargetType / string', required: true, impact: '绑定 NPC、地点、建筑或地块。', example: 'location / loc_archive' },
{ name: 'quests[].sourceNpcId', type: 'string', required: true, impact: '任务来源 NPC。', example: 'npc_archivist' },
{ name: 'quests[].completion', type: 'QuestCompletion', required: true, impact: '结构化定义任务完成方式。', example: 'environment search loc_archive' },
{ name: 'quests[].rewardIds', type: 'string[]', required: true, impact: '绑定任务完成后发放的奖励。', example: 'reward_archive_trust' },
{ name: 'rewards[].effects', type: 'Effect[]', required: true, impact: '任务完成后由引擎发放的结构化奖励。', example: 'change_relationship' },
```

Allowed values include:

```ts
{ label: 'InteractionType', values: INTERACTION_TYPES },
{ label: 'EnvironmentInteractionType', values: ENVIRONMENT_INTERACTION_TYPES },
```

- [ ] **Step 4: Update EventGraphPage**

In `apps/story-lab/src/pages/editor/event-graph-page.tsx`:

- Remove `Play` icon import.
- Replace `Definition label="玩家选项"` with `Definition label="事件效果"` or remove the count because effects already display in the flow.
- Remove the "玩家分支" split section.
- In the raw structure block, render:

```tsx
<CodeBlock value={{ trigger: event.trigger, effects: event.effects, followupEventIds: event.followupEventIds }} compact />
```

- [ ] **Step 5: Update dashboard and NPC studio**

In `apps/story-lab/src/editor/dashboard-overview.ts`, add metrics for interactions and quests:

```ts
interactions: activePack.interactions.length,
quests: activePack.quests.length,
```

In `NpcStudioPage`, compute:

```ts
const interactions = pack.interactions.filter((interaction) => interaction.targetType === 'npc' && interaction.targetId === npc.id)
```

Show `interactions.length` in the basic tab using `Definition label="交互"` and add a compact list under the events tab or a new existing tab section without changing tab ids.

- [ ] **Step 6: Update docs**

In `docs/content-schema.md`, update the top-level structure:

```ts
type ContentPack = {
  interactions: Interaction[]
  quests: Quest[]
  rewards: Reward[]
  events: GameEvent[]
  conversations: Conversation[]
}
```

Remove `actions` and `playerOptions` references. Add short sections for:

- Interaction structure.
- Quest source/completion/reward rules.
- Event world-only behavior.
- Reward effects are authoritative.

In `docs/validator.md`, add the new validator checks from the spec and remove old action/player option checks.

- [ ] **Step 7: Run Story Lab tests**

Run:

```bash
pnpm test scripts/story-lab-source-constraints.test.ts scripts/story-lab-dashboard-overview.test.ts scripts/story-lab-ui-primitives.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Story Lab and docs task**

Run:

```bash
git add apps/story-lab/src/editor/template-catalog.ts apps/story-lab/src/editor/dashboard-overview.ts apps/story-lab/src/pages/editor/event-graph-page.tsx apps/story-lab/src/pages/editor/npc-studio-page.tsx apps/story-lab/src/pages/editor/shared.tsx docs/content-schema.md docs/validator.md scripts/story-lab-source-constraints.test.ts scripts/story-lab-dashboard-overview.test.ts scripts/story-lab-ui-primitives.test.ts
git commit -m "feat(story-lab): document interactions quests rewards"
```

## Task 8: Source Content Migration And Generated Packs

**Files:**
- Rename: `content/demo-crossroads/actions.yaml` to `content/demo-crossroads/interactions.yaml`
- Rename: `content/qinglan-town/actions.yaml` to `content/qinglan-town/interactions.yaml`
- Create: `content/demo-crossroads/quests.yaml`
- Create: `content/demo-crossroads/rewards.yaml`
- Create: `content/qinglan-town/quests.yaml`
- Create: `content/qinglan-town/rewards.yaml`
- Modify: `content/*/locations.yaml`
- Modify: `content/*/buildings.yaml`
- Modify: `content/*/events.yaml`
- Modify: `content/qinglan-town/npcs/han-jin/identity.yaml` only if a combat interaction targets that NPC directly; otherwise all migrated combat interactions remain location encounters.
- Modify: `content/*/endings.yaml`
- Modify generated: `content/packs/manifest.json`, `content/packs/demo_crossroads.json`, `content/packs/qinglan_town_mvp.json`
- Test: `scripts/content-pack-artifact.ts`
- Test: `scripts/content-pack-package-removal.test.ts`
- Test: `scripts/content-source-conversations.test.ts`

- [ ] **Step 1: Write failing generated-pack regression test**

In `scripts/content-pack-package-removal.test.ts` or the closest generated-pack test, add:

```ts
test('generated content packs do not include legacy actions or event player options', async () => {
  const contentDirs = await discoverContentSourceDirs(defaultContentRoot)
  const packs = await Promise.all(contentDirs.map((dir) => loadContentPackFromSource(dir)))

  for (const pack of packs) {
    const raw = pack as unknown as Record<string, unknown>
    expect(raw.actions).toBeUndefined()
    expect(Array.isArray(raw.interactions)).toBe(true)
    expect(Array.isArray(raw.quests)).toBe(true)
    expect(Array.isArray(raw.rewards)).toBe(true)
    for (const event of pack.events as Array<Record<string, unknown>>) {
      expect(event.playerOptions).toBeUndefined()
    }
  }
})
```

- [ ] **Step 2: Run the red content test**

Run:

```bash
pnpm test scripts/content-pack-package-removal.test.ts
```

Expected: FAIL because source content still contains `actions.yaml` and event player options.

- [ ] **Step 3: Migrate demo content**

Rename `content/demo-crossroads/actions.yaml` to `content/demo-crossroads/interactions.yaml`.

Change the single interaction to:

```yaml
- id: interaction_check_signal
  name: 校准雾灯
  description: 擦净铜镜，调整灯芯高度，让路口信号更清晰。
  type: environment
  environmentType: search
  targetType: location
  targetId: loc_crossroads
  cost:
    actionPoints: 1
    stamina: 5
  effects:
    - type: change_variable
      key: signal_clarity
      delta: 20
    - type: add_fact
      key: signal_checked
      value: true
```

Update demo location/building references from `action_check_signal` to `interaction_check_signal` under `interactionIds`.

Create `content/demo-crossroads/rewards.yaml`:

```yaml
- id: reward_signal_route_marked
  name: 路标清晰
  description: 旅人安全提升。
  effects:
    - type: change_variable
      key: traveler_safety
      delta: 15
    - type: add_fact
      key: safe_path_marked
      value: true
```

Create `content/demo-crossroads/quests.yaml`:

```yaml
- id: quest_mark_safe_path
  title: 挂出备用路签
  description: 守灯人希望你校准雾灯，让路口信号更清晰。
  sourceNpcId: npc_guide
  conditions:
    fact: facts.guide_briefed
    equals: true
  completion:
    type: environment
    environmentType: search
    targetType: location
    targetId: loc_crossroads
    interactionId: interaction_check_signal
  rewardIds:
    - reward_signal_route_marked
```

In `content/demo-crossroads/npcs/guide/conversations.yaml`, add a `start_quest` effect to the reply that records `guide_briefed`:

```yaml
- type: start_quest
  questId: quest_mark_safe_path
```

In `content/demo-crossroads/events.yaml`, remove `playerOptions` and keep only world effects:

```yaml
effects:
  - type: add_fact
    key: signal_event_seen
    value: true
```

- [ ] **Step 4: Migrate main content mechanically**

Rename `content/qinglan-town/actions.yaml` to `content/qinglan-town/interactions.yaml`.

Apply these deterministic field conversions to every former action:

- Rename ids from `action_*` to `interaction_*`.
- Replace all references in `locations.yaml` and `buildings.yaml` from `actionIds` to `interactionIds` and from `action_*` to `interaction_*`.
- If old type was `fight`, set `type: combat`, set `enemyCombat` to old `successCheck.difficulty` when present, move `successEffects` into `victoryEffects`, and remove `successCheck` and `failureEffects`.
- If old type was `investigate`, `help`, `trade`, `steal`, or `rest`, set `type: environment`.
- For old `trade` that adds an item, set `environmentType: gather`; otherwise use `environmentType: search`.
- Keep `targetType`, `targetId`, `cost`, `conditions`, and `effects`.
- Remove `successCheck`, `successEffects`, and `failureEffects` from non-combat interactions.
- If old effects include `start_conversation`, keep the effect; the interaction is still an environment entry point.

After the mechanical conversion, scan:

```bash
rg "actionIds|action_|successCheck|successEffects|failureEffects|playerOptions" content/qinglan-town content/demo-crossroads
```

Expected: no matches in source content except historical docs outside `content/`.

- [ ] **Step 5: Add main content quests and rewards**

Create `content/qinglan-town/rewards.yaml` with at least these rewards:

```yaml
- id: reward_refugee_aid
  name: 流民安置认可
  description: 镇门秩序和主角声望提升。
  effects:
    - type: change_variable
      key: town_order
      delta: 2
    - type: change_player_attribute
      attribute: reputation
      delta: 2
- id: reward_medicine_aid
  name: 药铺援手
  description: 疫病压力下降，医者更信任主角。
  effects:
    - type: change_variable
      key: plague_level
      delta: -2
    - type: change_relationship
      source: player
      target: npc_shen_qinghe
      path: trust
      delta: 3
- id: reward_bandit_victory
  name: 商路战果
  description: 黑岭盗声势下降。
  effects:
    - type: change_variable
      key: bandit_power
      delta: -4
    - type: change_player_attribute
      attribute: reputation
      delta: 3
```

Create `content/qinglan-town/quests.yaml` with at least these active quest paths:

```yaml
- id: quest_help_refugees_gate
  title: 协助安置流民
  description: 陆怀山希望镇门有人协助查验和安置流民。
  sourceNpcId: npc_lu_huaishan
  completion:
    type: environment
    environmentType: search
    targetType: location
    targetId: loc_town_gate
    interactionId: interaction_help_refugees_gate
  rewardIds:
    - reward_refugee_aid
- id: quest_treat_patients
  title: 帮药铺稳住病人
  description: 沈青禾需要有人在问诊间帮忙照看病人。
  sourceNpcId: npc_shen_qinghe
  completion:
    type: environment
    environmentType: search
    targetType: location
    targetId: loc_herb_shop
    interactionId: interaction_treat_patients
  rewardIds:
    - reward_medicine_aid
- id: quest_guard_route
  title: 压制商路盗患
  description: 巡守希望有人协助护送商路，削弱盗匪声势。
  sourceNpcId: npc_lu_huaishan
  completion:
    type: combat
    targetType: location
    targetId: loc_town_gate
    result: victory
    interactionId: interaction_guard_route
  rewardIds:
    - reward_bandit_victory
```

Add `start_quest` effects to relevant existing conversations that already introduce those goals. Use only content files, not source code.

- [ ] **Step 6: Remove main event player options**

In `content/qinglan-town/events.yaml`, remove every `playerOptions` array. For each event:

- If there was one option, append that option's effects to `event.effects`.
- If there were multiple options, append the effects from the first option in the existing array and move other option consequences only when an existing conversation reply or quest created in this task has the same target NPC and same primary fact key.
- Keep `followupEventIds`.

Then scan:

```bash
rg "playerOptions|option_" content/qinglan-town/events.yaml content/demo-crossroads/events.yaml
```

Expected: no matches.

- [ ] **Step 7: Add death ending**

In each pack's `endings.yaml`, add a high-priority death ending:

```yaml
- id: ending_player_death
  name: 身死道消
  priority: 100
  conditions:
    fact: facts.player_dead
    equals: true
  summary: 你在战斗中失败，故事在此终止。
  causalChainRules:
    - fact: player_dead
      text: 战斗失败直接导致死亡。
```

- [ ] **Step 8: Validate and build content**

Run:

```bash
pnpm validate:content
pnpm build:content-pack
```

Expected: `validate:content` exits 0 and `build:content-pack` writes both pack JSON files.

- [ ] **Step 9: Run content tests**

Run:

```bash
pnpm test scripts/content-pack-package-removal.test.ts scripts/content-source-conversations.test.ts apps/game-client/src/store/content-loader.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit content task**

Run:

```bash
git add content apps/game-client/public/content-packs apps/story-lab/public/content-packs scripts/content-pack-package-removal.test.ts scripts/content-source-conversations.test.ts apps/game-client/src/store/content-loader.test.ts
git add -A content/demo-crossroads/actions.yaml content/qinglan-town/actions.yaml
git commit -m "feat(content): migrate to interactions and quests"
```

## Task 9: Final Verification, Build, Merge, And Cleanup

**Files:**
- Modify: files reported by the verification command that introduced the failing assertion or type error.

- [ ] **Step 1: Run full verification**

Run:

```bash
pnpm validate:content
pnpm build:content-pack
pnpm test
pnpm typecheck
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 2: Check legacy references**

Run:

```bash
rg "GameAction|ActionType|PlayerOption|actionIds|actions\\.yaml|playerOptions|EventChoicePanel|resolveEventOption|getAvailableActionsForSelectedTile|可执行行动" packages apps scripts content docs --glob '!docs/superpowers/**'
```

Expected: no live-code or live-content matches. Historical references under `docs/superpowers/**` are allowed because they document the migration.

- [ ] **Step 3: Check worktree status**

Run:

```bash
git status --short
```

Expected: clean.

- [ ] **Step 4: Merge back to main**

From `/Users/jessetzh/CodeSpace/StoryTime`:

```bash
git merge feat/action-system-refactor
```

Expected: fast-forward or clean merge.

- [ ] **Step 5: Verify main after merge**

From `/Users/jessetzh/CodeSpace/StoryTime`:

```bash
pnpm validate:content
pnpm test
```

Expected: both commands exit 0.

- [ ] **Step 6: Clean feature worktree and branch**

From `/Users/jessetzh/CodeSpace/StoryTime`:

```bash
git worktree remove .worktrees/action-system-refactor
git branch -d feat/action-system-refactor
```

Expected: worktree removed and branch deleted after merge.
