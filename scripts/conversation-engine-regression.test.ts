import type { ContentPack } from '@tss/schema'
import {
  chooseConversationReply,
  createInitialRuntimeState,
  getAvailableConversationsForNpc,
  hasChosenConversationReply,
  hasVisitedConversation,
  hasVisitedConversationNode,
  startConversation,
  startQuest,
} from '@tss/engine'
import { expect, test } from 'vitest'

test('starts a conversation, records node history, and chooses a reply', () => {
  const pack = makeConversationPack()
  const initial = createInitialRuntimeState(pack, 'identity_test')
  const available = getAvailableConversationsForNpc(pack, initial, 'npc_test')

  expect(available.map((entry) => entry.conversation.id)).toEqual(['conversation_test'])

  const started = startConversation(pack, initial, 'conversation_test')
  expect(started.ok).toBe(true)
  expect(started.state.worldState.activeConversation).toEqual({
    conversationId: 'conversation_test',
    npcId: 'npc_test',
    nodeId: 'node_entry',
  })
  expect(hasVisitedConversation(started.state, 'conversation_test')).toBe(true)
  expect(hasVisitedConversationNode(started.state, 'conversation_test', 'node_entry')).toBe(true)

  const replied = chooseConversationReply(pack, started.state, 'reply_help')
  expect(replied.ok).toBe(true)
  expect(replied.state.worldState.activeConversation?.nodeId).toBe('node_after_help')
  expect(hasChosenConversationReply(replied.state, 'conversation_test', 'reply_help')).toBe(true)
  expect(replied.state.worldState.relationships['player:npc_test'].trust).toBe(12)
})

test('handles legacy runtime states without conversation history', () => {
  const pack = makeConversationPack()
  const legacyState = createInitialRuntimeState(pack, 'identity_test')
  delete (legacyState.worldState as Partial<typeof legacyState.worldState>).conversationHistory

  expect(hasVisitedConversation(legacyState, 'conversation_test')).toBe(false)

  const started = startConversation(pack, legacyState, 'conversation_test')
  expect(started.ok).toBe(true)
  expect(started.state.worldState.conversationHistory).toHaveLength(1)
  expect(hasVisitedConversation(started.state, 'conversation_test')).toBe(true)
})

test('conversation reply can complete an active conversation quest', () => {
  const pack = makeConversationPack()
  pack.quests = [
    {
      id: 'quest_reply_test',
      title: 'Reply Test',
      description: 'Choose the reply.',
      sourceNpcId: 'npc_test',
      completion: { type: 'conversation', npcId: 'npc_test', conversationId: 'conversation_test', replyId: 'reply_help' },
      rewardIds: ['reward_reply_test'],
    },
  ]
  pack.rewards = [
    {
      id: 'reward_reply_test',
      name: 'Reply Reward',
      description: 'Raises rapport.',
      effects: [{ type: 'change_variable', key: 'rapport', delta: 7 }],
    },
  ]
  const startedQuest = startQuest(pack, createInitialRuntimeState(pack, 'identity_test'), 'quest_reply_test').state
  const startedConversation = startConversation(pack, startedQuest, 'conversation_test').state

  const result = chooseConversationReply(pack, startedConversation, 'reply_help')

  expect(result.ok).toBe(true)
  expect(result.state.worldState.quests.quest_reply_test?.status).toBe('completed')
  expect(result.state.worldState.variables.rapport).toBe(7)
})

function makeConversationPack(): ContentPack {
  return {
    packId: 'pack_test',
    version: '0.1.0',
    schemaVersion: '0.1.0',
    world: {
      id: 'world_test',
      name: 'Test World',
      summary: 'A test world.',
      editorBackground: 'Editor-facing world background.',
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
            buildingIds: [],
            npcIds: ['npc_test'],
            eventIds: [],
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
        buildingIds: [],
        interactionIds: [],
      },
    ],
    buildings: [],
    factions: [{ id: 'faction_test', name: 'Test Faction', description: 'A test faction.', stanceToPlayer: 0 }],
    identities: [
      {
        id: 'identity_test',
        name: 'Test Identity',
        backgroundSummary: 'A test identity background.',
        intro: {
          title: 'Test Identity',
          story: 'A test identity story.',
          origin: 'A test identity origin.',
          motivation: 'A test identity motivation.',
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
    interactions: [],
    quests: [],
    rewards: [],
    events: [],
    conversations: [
      {
        id: 'conversation_test',
        npcId: 'npc_test',
        title: 'Ask about the problem',
        entryNodeId: 'node_entry',
        priority: 1,
        nodes: [
          {
            id: 'node_entry',
            speaker: 'npc_test',
            text: 'The problem is still unresolved.',
            replies: [
              {
                id: 'reply_help',
                text: 'Offer help.',
                effects: [{ type: 'change_relationship', source: 'player', target: 'npc_test', path: 'trust', delta: 2 }],
                nextNodeId: 'node_after_help',
              },
            ],
          },
          {
            id: 'node_after_help',
            speaker: 'npc_test',
            text: 'That would help.',
            replies: [
              {
                id: 'reply_end',
                text: 'Leave.',
                effects: [{ type: 'add_fact', key: 'offered_help', value: true }],
                endConversation: true,
              },
            ],
          },
        ],
      },
    ],
    items: [],
    endings: [],
    runtime: {
      initialState: {
        playerLocationId: 'loc_test',
        selectedTileId: 'tile_test',
        facts: {},
      },
      dailyDriftRules: [],
    },
  }
}
