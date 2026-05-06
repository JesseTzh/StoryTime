import type { ContentPack } from '@tss/schema'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { readCssWithImports } from './css-test-utils'
import { buildScheduleEventOverview } from '../apps/story-lab/src/editor/schedule-overview'

function pack(): ContentPack {
  return {
    packId: 'test-story',
    version: '0.1.0',
    schemaVersion: '1.0.0',
    world: {
      id: 'world_test',
      name: 'Test World',
      summary: '',
      editorBackground: 'Editor background.',
      maxDays: 3,
      segments: ['morning', 'noon', 'night'],
      actionPointsPerSegment: 2,
    },
    variables: [],
    maps: [],
    locations: [
      {
        id: 'loc_square',
        name: 'Square',
        type: 'public',
        tags: [],
        state: {},
        descriptions: { default: '', morning: '', noon: '', night: '' },
        buildingIds: [],
        interactionIds: [],
      },
    ],
    buildings: [],
    factions: [],
    identities: [],
    npcs: [
      {
        id: 'npc_with_events',
        name: 'Event NPC',
        age: 30,
        identity: 'test',
        tier: 'core',
        faction: '',
        location: 'loc_square',
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
        schedule: [
          {
            id: 'schedule_plain',
            segment: 'morning',
            locationId: 'loc_square',
            activity: 'plain work',
          },
          {
            id: 'schedule_event',
            segment: 'night',
            locationId: 'loc_square',
            activity: 'event work',
            dayRange: { from: 2, to: 2 },
            effects: [{ type: 'trigger_event', eventId: 'event_schedule' }],
          },
        ],
        behaviorRules: [
          {
            id: 'rule_event',
            name: 'Rule Event',
            priority: 10,
            conditions: {
              all: [
                { fact: 'time.day', equals: 3 },
                { fact: 'time.segment', equals: 'noon' },
              ],
            },
            effects: [{ type: 'trigger_event', eventId: 'event_behavior' }],
          },
        ],
        background: { publicStory: '', privateStory: '', hiddenStory: '' },
      },
    ],
    items: [],
    interactions: [],
    quests: [],
    rewards: [],
    conversations: [],
    events: [
      {
        id: 'event_schedule',
        name: 'Schedule Event',
        type: 'npc_behavior_event',
        participantIds: ['npc_with_events'],
        trigger: { fact: 'facts.schedule_event', not_equals: true },
        description: '',
        effects: [],
        followupEventIds: [],
      },
      {
        id: 'event_behavior',
        name: 'Behavior Event',
        type: 'npc_behavior_event',
        participantIds: ['npc_with_events'],
        trigger: { fact: 'facts.behavior_event', not_equals: true },
        description: '',
        effects: [],
        followupEventIds: [],
      },
    ],
    endings: [],
    runtime: {
      initialState: {
        time: { day: 1, segment: 'morning', actionPoints: 2 },
        player: {
          identity: '',
          locationId: 'loc_square',
          state: {
            health: 100,
            stamina: 100,
            money: 0,
            reputation: 0,
            combat: 0,
            negotiation: 0,
            medicine: 0,
            stealth: 0,
          },
          inventory: {},
        },
        worldState: {
          variables: {},
          facts: {},
          locations: {},
          buildings: {},
          npcs: {},
          relationships: {},
          activeEventIds: [],
          pendingEventIds: [],
          eventHistory: [],
        },
        eventLogs: [],
      },
      dailyDriftRules: [],
    },
  }
}

describe('buildScheduleEventOverview', () => {
  test('keeps only NPC schedule and behavior entries that can trigger events', () => {
    const overview = buildScheduleEventOverview(pack())

    expect(overview.days).toHaveLength(3)
    expect(overview.totalEntries).toBe(2)
    expect(overview.days[0].entryCount).toBe(0)

    const scheduleSegment = overview.days[1].segments.find((segment) => segment.segment === 'night')
    expect(scheduleSegment?.entries).toMatchObject([
      {
        id: 'schedule:npc_with_events:schedule_event:2:night',
        sourceKind: 'schedule',
        npcName: 'Event NPC',
        eventNames: ['Schedule Event'],
      },
    ])

    const behaviorSegment = overview.days[2].segments.find((segment) => segment.segment === 'noon')
    expect(behaviorSegment?.entries).toMatchObject([
      {
        id: 'behavior:npc_with_events:rule_event:3:noon',
        sourceKind: 'behavior',
        npcName: 'Event NPC',
        eventNames: ['Behavior Event'],
      },
    ])
  })
})

test('schedule timeline labels show only the day number copy', () => {
  const source = readFileSync('apps/story-lab/src/pages/editor/schedule-page.tsx', 'utf8')
  const styles = readCssWithImports('apps/story-lab/src/styles.css')

  expect(source).toContain('>{day.day} 日</span>')
  expect(source).toContain('data-test-id="schedule-layout"')
  expect(source).not.toContain('schedule-timeline-head')
  expect(source).not.toContain('schedule-timeline-day-count')
  expect(source).not.toContain('{day.eventCount}件')
  expect(styles).toContain('.schedule-layout')
  expect(styles).not.toContain('.schedule-floating-timeline')
})
