import type { ContentPack, ValidationReport } from '@tss/schema'
import type { StoryProject } from '../apps/story-lab/src/editor/types'
import { buildDashboardOverview } from '../apps/story-lab/src/editor/dashboard-overview'
import { expect, test } from 'vitest'

function pack(id: string, counts: { locations: number; npcs: number; interactions: number; quests: number; events: number; endings: number }): ContentPack {
  return {
    packId: id,
    version: '0.1.0',
    schemaVersion: '1.0.0',
    world: {
      id: `${id}_world`,
      name: `${id} world`,
      summary: '',
      editorBackground: 'Editor background.',
      maxDays: 7,
      segments: ['morning'],
      actionPointsPerSegment: 2,
    },
    variables: [],
    maps: [],
    locations: Array.from({ length: counts.locations }, (_, index) => ({
      id: `${id}_location_${index}`,
      name: `Location ${index}`,
      type: 'test',
      tags: [],
      state: {},
      descriptions: { default: '' },
      buildingIds: [],
      interactionIds: [],
    })),
    buildings: [],
    factions: [],
    identities: [],
    npcs: Array.from({ length: counts.npcs }, (_, index) => ({
      id: `${id}_npc_${index}`,
      name: `NPC ${index}`,
      age: 30,
      identity: 'test',
      tier: 'ordinary',
      faction: '',
      location: '',
      personality: {
        kindness: 0,
        courage: 0,
        greed: 0,
        loyalty: 0,
        suspicion: 0,
        responsibility: 0,
      },
      state: {},
      goals: [],
      secrets: [],
      relationships: [],
      schedule: [],
      behaviorRules: [],
      interactionIds: [],
      background: { publicStory: '', privateStory: '', hiddenStory: '' },
    })),
    items: [],
    interactions: Array.from({ length: counts.interactions }, (_, index) => ({
      id: `${id}_interaction_${index}`,
      name: `Interaction ${index}`,
      description: '',
      type: 'environment',
      environmentType: 'search',
      targetType: 'location',
      targetId: `${id}_location_0`,
      effects: [],
    })),
    quests: Array.from({ length: counts.quests }, (_, index) => ({
      id: `${id}_quest_${index}`,
      title: `Quest ${index}`,
      description: '',
      sourceNpcId: `${id}_npc_0`,
      completion: { type: 'environment', environmentType: 'search', targetType: 'location', targetId: `${id}_location_0` },
      rewardIds: [],
    })),
    rewards: [],
    conversations: [],
    events: Array.from({ length: counts.events }, (_, index) => ({
      id: `${id}_event_${index}`,
      name: `Event ${index}`,
      description: '',
      type: 'world_state_event',
      participantIds: [],
      trigger: { fact: 'story_started', equals: true },
      effects: [],
      followupEventIds: [],
    })),
    endings: Array.from({ length: counts.endings }, (_, index) => ({
      id: `${id}_ending_${index}`,
      name: `Ending ${index}`,
      priority: index,
      conditions: { fact: 'story_started', equals: true },
      summary: '',
      causalChainRules: [],
    })),
    runtime: {
      initialState: { playerLocationId: '', facts: {} },
      dailyDriftRules: [],
    },
  }
}

function project(id: string, projectPack: ContentPack): StoryProject {
  return {
    id,
    name: id,
    description: '',
    owner: '',
    status: 'draft',
    updatedAt: '2026-04-29',
    pack: projectPack,
  }
}

function report(id: string, issueCount: number): ValidationReport {
  return {
    packId: id,
    checkedAt: '2026-04-29T00:00:00.000Z',
    errors: Array.from({ length: issueCount }, (_, index) => ({
      severity: 'error',
      type: 'test_error',
      message: `Issue ${index}`,
    })),
    gaps: [],
    summary: {
      locations: 0,
      buildings: 0,
      npcs: 0,
      interactions: 0,
      quests: 0,
      rewards: 0,
      events: 0,
      conversations: 0,
      endings: 0,
    },
  }
}

test('dashboard overview metrics are scoped to the current project', () => {
  const currentPack = pack('current', { locations: 2, npcs: 3, interactions: 6, quests: 7, events: 4, endings: 5 })
  const otherPack = pack('other', { locations: 20, npcs: 30, interactions: 60, quests: 70, events: 40, endings: 50 })
  const overview = buildDashboardOverview(project('current', currentPack), currentPack, report('current', 2))

  expect(overview.metrics).toEqual({
    locations: 2,
    npcs: 3,
    interactions: 6,
    quests: 7,
    events: 4,
    endings: 5,
    issues: 2,
  })
  expect(overview.metrics.locations).not.toBe(currentPack.locations.length + otherPack.locations.length)
  expect(overview.status).toBe('needs_fix')
})
