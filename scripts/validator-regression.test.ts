import type { ContentPack } from '@tss/schema'
import { validateContentPack } from '@tss/validator'
import { expect, test } from 'vitest'

function clonePack(pack: ContentPack): ContentPack {
  return JSON.parse(JSON.stringify(pack)) as ContentPack
}

test('validator rejects legacy actions and event player options', () => {
  const pack = makeValidationPack()
  const legacyPack = pack as unknown as { actions?: unknown[]; events: Array<{ playerOptions?: unknown[] }> }
  legacyPack.actions = [{ id: 'action_legacy' }]
  legacyPack.events[0].playerOptions = [{ id: 'option_legacy', name: 'Legacy option', effects: [] }]

  const errors = validateContentPack(pack).errors

  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'actions')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'events.playerOptions')).toBe(true)
})

test('validator rejects legacy fields when present with non-array values', () => {
  const pack = makeValidationPack()
  const legacyPack = pack as unknown as {
    actions?: unknown
    events: Array<{ playerOptions?: unknown }>
    locations: Array<{ actionIds?: unknown }>
    buildings: Array<{ actionIds?: unknown }>
  }
  legacyPack.actions = 'legacy'
  legacyPack.events[0].playerOptions = 'legacy'
  legacyPack.locations[0].actionIds = 'legacy'
  legacyPack.buildings[0].actionIds = 'legacy'

  const errors = validateContentPack(pack).errors

  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'actions')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'events.playerOptions')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'locations.actionIds')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'buildings.actionIds')).toBe(true)
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

test('validator rejects legacy location and building action ids without throwing', () => {
  const locationPack = makeValidationPack()
  const legacyLocation = locationPack.locations[0] as unknown as { actionIds?: string[]; interactionIds?: unknown }
  legacyLocation.actionIds = ['action_legacy']
  delete legacyLocation.interactionIds

  let locationErrors = [] as ReturnType<typeof validateContentPack>['errors']
  expect(() => {
    locationErrors = validateContentPack(locationPack).errors
  }).not.toThrow()
  expect(locationErrors.some((issue) => issue.type === 'schema_error' && issue.path === 'locations.actionIds')).toBe(true)

  const buildingPack = makeValidationPack()
  const legacyBuilding = buildingPack.buildings[0] as unknown as { actionIds?: string[]; interactionIds?: unknown }
  legacyBuilding.actionIds = ['action_legacy']
  delete legacyBuilding.interactionIds

  let buildingErrors = [] as ReturnType<typeof validateContentPack>['errors']
  expect(() => {
    buildingErrors = validateContentPack(buildingPack).errors
  }).not.toThrow()
  expect(buildingErrors.some((issue) => issue.type === 'schema_error' && issue.path === 'buildings.actionIds')).toBe(true)
})

test('validator requires location and building interaction id arrays without throwing', () => {
  const locationPack = makeValidationPack()
  const location = locationPack.locations[0] as unknown as { interactionIds?: unknown }
  delete location.interactionIds

  let locationErrors = [] as ReturnType<typeof validateContentPack>['errors']
  expect(() => {
    locationErrors = validateContentPack(locationPack).errors
  }).not.toThrow()
  expect(locationErrors.some((issue) => issue.type === 'schema_error' && issue.path === 'locations.interactionIds')).toBe(true)

  const buildingPack = makeValidationPack()
  const building = buildingPack.buildings[0] as unknown as { interactionIds?: unknown }
  building.interactionIds = 'bad'

  let buildingErrors = [] as ReturnType<typeof validateContentPack>['errors']
  expect(() => {
    buildingErrors = validateContentPack(buildingPack).errors
  }).not.toThrow()
  expect(buildingErrors.some((issue) => issue.type === 'schema_error' && issue.path === 'buildings.interactionIds')).toBe(true)
})

test('validator rejects malformed quest internals without throwing', () => {
  const badRewardIdsPack = makeValidationPack()
  const badRewardIdsQuest = badRewardIdsPack.quests[0] as unknown as { rewardIds?: unknown }
  badRewardIdsQuest.rewardIds = 'bad'

  let badRewardIdsErrors = [] as ReturnType<typeof validateContentPack>['errors']
  expect(() => {
    badRewardIdsErrors = validateContentPack(badRewardIdsPack).errors
  }).not.toThrow()
  expect(badRewardIdsErrors.some((issue) => issue.type === 'schema_error' && issue.path === 'rewardIds')).toBe(true)

  const missingCompletionPack = makeValidationPack()
  const missingCompletionQuest = missingCompletionPack.quests[0] as unknown as { completion?: unknown }
  delete missingCompletionQuest.completion

  let missingCompletionErrors = [] as ReturnType<typeof validateContentPack>['errors']
  expect(() => {
    missingCompletionErrors = validateContentPack(missingCompletionPack).errors
  }).not.toThrow()
  expect(missingCompletionErrors.some((issue) => issue.type === 'schema_error' && issue.path === 'completion')).toBe(true)
})

test('validator rejects malformed interaction effect arrays without throwing', () => {
  const pack = makeValidationPack()
  const interaction = pack.interactions[0] as unknown as { effects?: unknown }
  interaction.effects = {}

  let errors = [] as ReturnType<typeof validateContentPack>['errors']
  expect(() => {
    errors = validateContentPack(pack).errors
  }).not.toThrow()

  expect(errors.some((issue) => issue.type === 'schema_error' && issue.targetId === 'interaction_search_test' && issue.path === 'effects')).toBe(true)
})

test('validator handles the new schema without legacy compatibility fields', () => {
  const pack = makeValidationPack()

  let report = undefined as ReturnType<typeof validateContentPack> | undefined
  expect(() => {
    report = validateContentPack(pack)
  }).not.toThrow()

  expect(report?.summary).toMatchObject({
    locations: 1,
    buildings: 1,
    npcs: 1,
    interactions: 1,
    quests: 1,
    rewards: 1,
    events: 1,
    conversations: 1,
    endings: 1,
  })
  expect('actions' in (report?.summary ?? {})).toBe(false)
})

test('validator reports bad interaction quest and reward references', () => {
  const pack = makeValidationPack()
  pack.locations[0].interactionIds = ['missing_location_interaction']
  pack.buildings[0].interactionIds = ['missing_building_interaction']
  pack.npcs[0].interactionIds = ['missing_npc_interaction']
  pack.interactions[0].targetId = 'missing_location'
  pack.interactions.push({
    id: 'interaction_conversation_bad_ref',
    name: 'Bad Conversation Interaction',
    description: 'References a missing conversation.',
    type: 'conversation',
    targetType: 'npc',
    targetId: 'npc_test',
    conversationId: 'missing_conversation',
    effects: [{ type: 'start_quest', questId: 'missing_started_quest' }],
  })
  pack.interactions.push({
    id: 'interaction_give_bad_ref',
    name: 'Bad Give Interaction',
    description: 'References a missing item.',
    type: 'give',
    targetType: 'npc',
    targetId: 'npc_test',
    itemId: 'missing_item',
    itemCount: 1,
    acceptedEffects: [{ type: 'fail_quest', questId: 'missing_failed_quest' }],
  })
  pack.quests[0].sourceNpcId = 'missing_source_npc'
  pack.quests[0].rewardIds = ['missing_reward']
  pack.quests[0].completion = {
    type: 'environment',
    environmentType: 'search',
    targetType: 'building',
    targetId: 'missing_completion_building',
    interactionId: 'missing_completion_interaction',
  }
  pack.rewards[0].effects = [{ type: 'start_quest', questId: 'missing_reward_quest' }]

  const errors = validateContentPack(pack).errors

  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'loc_test')).toBe(true)
  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'building_test')).toBe(true)
  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'npc_test')).toBe(true)
  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'interaction_search_test')).toBe(true)
  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'interaction_conversation_bad_ref')).toBe(true)
  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'interaction_give_bad_ref')).toBe(true)
  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'quest_test')).toBe(true)
  expect(errors.some((issue) => issue.type === 'reference_error' && issue.targetId === 'reward_test')).toBe(true)
})

test('validator rejects malformed give combat and reward effects shapes', () => {
  const pack = makeValidationPack()
  const broken = pack as unknown as {
    interactions: unknown[]
    rewards: Array<{ effects?: unknown }>
  }
  broken.interactions.push(
    {
      id: 'interaction_give_missing_count',
      name: 'Give Missing Count',
      description: 'Give without count.',
      type: 'give',
      targetType: 'npc',
      targetId: 'npc_test',
      itemId: 'item_test',
      effects: [],
    },
    {
      id: 'interaction_give_bad_count',
      name: 'Give Bad Count',
      description: 'Give with invalid count.',
      type: 'give',
      targetType: 'npc',
      targetId: 'npc_test',
      itemId: 'item_test',
      itemCount: 'bad',
      effects: [],
    },
    {
      id: 'interaction_combat_missing_enemy',
      name: 'Combat Missing Enemy',
      description: 'Combat without enemy value.',
      type: 'combat',
      targetType: 'npc',
      targetId: 'npc_test',
      effects: [],
    },
    {
      id: 'interaction_combat_bad_enemy',
      name: 'Combat Bad Enemy',
      description: 'Combat with invalid enemy value.',
      type: 'combat',
      targetType: 'npc',
      targetId: 'npc_test',
      enemyCombat: 'bad',
      effects: [],
    },
  )
  delete broken.rewards[0].effects

  let errors = [] as ReturnType<typeof validateContentPack>['errors']
  expect(() => {
    errors = validateContentPack(pack).errors
  }).not.toThrow()

  expect(errors.some((issue) => issue.type === 'schema_error' && issue.targetId === 'interaction_give_missing_count' && issue.path === 'itemCount')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.targetId === 'interaction_give_bad_count' && issue.path === 'itemCount')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.targetId === 'interaction_combat_missing_enemy' && issue.path === 'enemyCombat')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.targetId === 'interaction_combat_bad_enemy' && issue.path === 'enemyCombat')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.targetId === 'reward_test' && issue.path === 'effects')).toBe(true)
})

test('validator reports invalid fact paths, duplicate ids, and runtime references', () => {
  const invalidFactPathPack = makeValidationPack()
  invalidFactPathPack.interactions[0].conditions = { fact: 'player.state.not_a_real_attribute', equals: 1 }
  expect(validateContentPack(invalidFactPathPack).errors.some((issue) => issue.type === 'fact_path_error')).toBe(true)

  const duplicateIdPack = makeValidationPack()
  duplicateIdPack.interactions.push({ ...duplicateIdPack.interactions[0] })
  expect(
    validateContentPack(duplicateIdPack).errors.some((issue) => issue.type === 'schema_error' && issue.message.includes('重复 id')),
  ).toBe(true)

  const invalidRuntimePack = makeValidationPack()
  invalidRuntimePack.runtime.dailyDriftRules.push({
    id: 'test_invalid_runtime_reference',
    name: 'Invalid runtime reference',
    effects: [{ type: 'change_variable', key: 'missing_variable', delta: 1 }],
  })
  expect(
    validateContentPack(invalidRuntimePack).errors.some(
      (issue) => issue.type === 'reference_error' && issue.targetId === 'test_invalid_runtime_reference',
    ),
  ).toBe(true)
})

test('validator reports invalid conversation graph references', () => {
  const badEntryPack = makeValidationPack()
  badEntryPack.conversations[0].entryNodeId = 'missing_node'
  expect(
    validateContentPack(badEntryPack).errors.some(
      (issue) => issue.type === 'schema_error' && issue.targetId === badEntryPack.conversations[0].id && issue.message.includes('entryNodeId'),
    ),
  ).toBe(true)

  const badReplyPack = makeValidationPack()
  badReplyPack.conversations[0].nodes[0].replies[0].nextNodeId = 'missing_reply_target'
  delete badReplyPack.conversations[0].nodes[0].replies[0].endConversation
  expect(
    validateContentPack(badReplyPack).errors.some(
      (issue) => issue.type === 'schema_error' && issue.targetId === badReplyPack.conversations[0].nodes[0].replies[0].id && issue.message.includes('nextNodeId'),
    ),
  ).toBe(true)

  const removedFieldPack = makeValidationPack()
  const removedField = ['im', 'pact'].join('')
  ;(removedFieldPack.conversations[0] as unknown as Record<string, unknown>)[removedField] = [{ type: 'custom', label: 'Legacy topic metadata' }]
  ;(removedFieldPack.conversations[0].nodes[0].replies[0] as unknown as Record<string, unknown>)[removedField] = [{ type: 'custom', label: 'Legacy reply metadata' }]
  expect(
    validateContentPack(removedFieldPack).errors.some(
      (issue) => issue.type === 'schema_error' && issue.path === removedField,
    ),
  ).toBe(true)
})

test('validator requires identity origin intro fields', () => {
  const pack = makeValidationPack()
  const identity = pack.identities[0] as Partial<ContentPack['identities'][number]>
  delete identity.backgroundSummary
  delete identity.intro?.motivation

  const errors = validateContentPack(pack).errors

  expect(
    errors.some(
      (issue) => issue.type === 'schema_error' && issue.targetId === 'identity_test' && issue.path === 'backgroundSummary',
    ),
  ).toBe(true)
  expect(
    errors.some(
      (issue) => issue.type === 'schema_error' && issue.targetId === 'identity_test' && issue.path === 'intro.motivation',
    ),
  ).toBe(true)
})

test('validator requires world background fields for editors and players', () => {
  const pack = makeValidationPack()
  const world = pack.world as Partial<ContentPack['world']>
  delete world.editorBackground
  delete world.playerIntroduction

  const errors = validateContentPack(pack).errors

  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'world.editorBackground')).toBe(true)
  expect(errors.some((issue) => issue.type === 'schema_error' && issue.path === 'world.playerIntroduction')).toBe(true)
})

function makeValidationPack(): ContentPack {
  return clonePack({
    packId: 'pack_test',
    version: '0.1.0',
    schemaVersion: '0.1.0',
    world: {
      id: 'world_test',
      name: 'Test World',
      summary: 'A test world.',
      editorBackground: 'Editor-facing world background.',
      playerIntroduction: 'Player-facing world introduction.',
      maxDays: 3,
      segments: ['morning', 'noon', 'night'],
      actionPointsPerSegment: 3,
    },
    variables: [
      { key: 'rapport', name: 'Rapport', description: 'Conversation rapport.', initialValue: 0, min: 0, max: 100 },
    ],
    maps: [
      {
        id: 'map_test',
        name: 'Test Map',
        width: 1,
        height: 1,
        tiles: [
          {
            id: 'tile_test',
            name: 'Test Tile',
            x: 0,
            y: 0,
            terrain: 'town',
            locationId: 'loc_test',
            buildingIds: ['building_test'],
            npcIds: ['npc_test'],
            eventIds: ['event_test'],
            discovered: true,
            visible: true,
            blocked: false,
            dangerLevel: 0,
          },
        ],
      },
    ],
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
    factions: [{ id: 'faction_test', name: 'Test Faction', description: 'A test faction.', stanceToPlayer: 0 }],
    identities: [
      {
        id: 'identity_test',
        name: 'Test Identity',
        backgroundSummary: 'A short playable background.',
        intro: {
          title: 'Arriving at the Test World',
          story: 'A problem is unfolding before the player arrives.',
          origin: 'The player has a reason to know the road into this place.',
          motivation: 'The player comes to resolve a personal obligation.',
        },
        initialState: {
          health: 100,
          stamina: 100,
          money: 0,
          reputation: 0,
          combat: 0,
          negotiation: 10,
          medicine: 0,
          stealth: 0,
        },
        advantages: [],
        disadvantages: [],
      },
    ],
    npcs: [
      {
        id: 'npc_test',
        name: 'Test NPC',
        age: 30,
        identity: 'Witness',
        tier: 'core',
        faction: 'faction_test',
        location: 'loc_test',
        personality: {
          kindness: 50,
          courage: 50,
          greed: 0,
          loyalty: 50,
          suspicion: 0,
          responsibility: 50,
        },
        state: { alive: true },
        goals: [],
        secrets: [],
        relationships: [],
        schedule: [],
        behaviorRules: [],
        interactionIds: [],
      },
    ],
    relationships: [
      {
        sourceId: 'player',
        targetId: 'npc_test',
        value: 0,
        trust: 10,
        fear: 0,
        gratitude: 0,
        suspicion: 0,
        tags: [],
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
    conversations: [
      {
        id: 'conversation_test',
        npcId: 'npc_test',
        title: 'Ask about the problem',
        entryNodeId: 'node_entry',
        nodes: [
          {
            id: 'node_entry',
            speaker: 'npc_test',
            text: 'The problem is still unresolved.',
            replies: [
              {
                id: 'reply_help',
                text: 'Offer help.',
                nextNodeId: 'node_after_help',
              },
            ],
          },
          {
            id: 'node_after_help',
            speaker: 'npc_test',
            text: 'That would help.',
            replies: [{ id: 'reply_end', text: 'Leave.', endConversation: true }],
          },
        ],
      },
    ],
    items: [],
    endings: [
      {
        id: 'ending_test',
        name: 'Test Ending',
        priority: 1,
        conditions: { fact: 'time.day', greater_than_or_equal: 3 },
        summary: 'A test ending.',
        causalChainRules: [{ variable: 'rapport', operator: 'greater_than_or_equal', value: 1, text: 'Rapport changed.' }],
      },
    ],
    runtime: {
      initialState: {
        playerLocationId: 'loc_test',
        selectedTileId: 'tile_test',
        facts: {},
      },
      dailyDriftRules: [],
    },
  })
}
