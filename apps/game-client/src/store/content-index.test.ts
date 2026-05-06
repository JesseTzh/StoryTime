import type { ContentPack } from '@tss/schema'
import { expect, test } from 'vitest'
import { buildContentIndex } from './content-index'

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
  maps: [
    {
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
    },
  ],
  locations: [{
    id: 'loc_fixture',
    name: 'Location',
    type: 'fixture',
    tags: [],
    state: {},
    descriptions: { default: 'Location', morning: 'Location', noon: 'Location', night: 'Location' },
    buildingIds: ['building_fixture'],
    interactionIds: [],
  }],
  buildings: [{
    id: 'building_fixture',
    name: 'Building',
    locationId: 'loc_fixture',
    type: 'fixture',
    state: {},
    descriptions: { default: 'Building' },
    interactionIds: ['interaction_fixture'],
  }],
  factions: [],
  identities: [],
  npcs: [],
  relationships: [],
  interactions: [{
    id: 'interaction_fixture',
    name: 'Interaction',
    description: 'Interaction',
    type: 'environment',
    environmentType: 'search',
    targetType: 'location',
    targetId: 'loc_fixture',
    effects: [],
  }],
  quests: [{
    id: 'quest_fixture',
    title: 'Quest',
    description: 'Quest',
    sourceNpcId: 'npc_fixture',
    completion: { type: 'environment', environmentType: 'search', targetType: 'location', targetId: 'loc_fixture', interactionId: 'interaction_fixture' },
    rewardIds: ['reward_fixture'],
  }],
  rewards: [{
    id: 'reward_fixture',
    name: 'Reward',
    description: 'Reward',
    effects: [{ type: 'change_variable', key: 'rapport', delta: 1 }],
  }],
  events: [],
  conversations: [
    { id: 'conversation_low', npcId: 'npc_fixture', title: 'Low', entryNodeId: 'node_low', nodes: [], priority: 1 },
    { id: 'conversation_high', npcId: 'npc_fixture', title: 'High', entryNodeId: 'node_high', nodes: [], priority: 5 },
  ],
  items: [],
  endings: [],
  runtime: { initialState: { playerLocationId: 'loc_fixture', facts: {} }, dailyDriftRules: [] },
} satisfies ContentPack

test('builds lookup indexes for tiles, locations, interactions, quests, rewards, and conversations', () => {
  const index = buildContentIndex(pack)

  expect(index.tileById.get('tile_fixture')?.locationId).toBe('loc_fixture')
  expect(index.tileByLocationId.get('loc_fixture')?.id).toBe('tile_fixture')
  expect(index.locationById.get('loc_fixture')?.buildingIds).toEqual(['building_fixture'])
  expect(index.interactionById.get('interaction_fixture')?.name).toBe('Interaction')
  expect(index.questById.get('quest_fixture')?.title).toBe('Quest')
  expect(index.rewardById.get('reward_fixture')?.name).toBe('Reward')
  expect(index.conversationsByNpcId.get('npc_fixture')?.map((conversation) => conversation.id)).toEqual([
    'conversation_low',
    'conversation_high',
  ])
})
