import type { ContentPack } from '@tss/schema'
import { describe, expect, test } from 'vitest'
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
      rewardIds: ['reward_rapport_test'],
    },
    {
      id: 'quest_combat_test',
      title: 'Combat Test',
      description: 'Win the fight.',
      sourceNpcId: 'npc_test',
      completion: { type: 'combat', targetType: 'npc', targetId: 'npc_test', result: 'victory', interactionId: 'interaction_fight_test' },
      rewardIds: ['reward_rapport_test'],
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
    const interaction = pack.interactions.find((item) => item.id === 'interaction_give_letter')
    if (!interaction) throw new Error('Missing test interaction')

    const availability = getInteractionAvailability(pack, state, interaction)

    expect(availability.available).toBe(false)
    expect(availability.reasons.join(';')).toContain('物品不足')
  })

  test('give interaction consumes item and completes give quest', () => {
    const pack = makePack()
    const initial = createInitialRuntimeState(pack, 'identity_test')
    initial.player.inventory.item_letter = 1
    const active = startQuest(pack, initial, 'quest_give_test').state

    const result = executeInteraction(pack, active, 'interaction_give_letter')

    expect(result.ok).toBe(true)
    expect(result.state.player.inventory.item_letter).toBe(0)
    expect(result.state.worldState.quests.quest_give_test?.status).toBe('completed')
    expect(result.state.worldState.variables.rapport).toBe(5)
  })

  test('quest reward effects can trigger an ending immediately after interaction', () => {
    const pack = makePack()
    pack.endings.unshift({
      id: 'ending_rapport',
      name: 'Rapport Ending',
      priority: 50,
      conditions: { fact: 'variables.rapport', greater_than_or_equal: 5 },
      summary: 'Rapport reached the ending threshold.',
      causalChainRules: [{ variable: 'rapport', operator: 'greater_than_or_equal', value: 5, text: 'Rapport was high enough.' }],
    })
    pack.rewards.find((reward) => reward.id === 'reward_rapport_test')?.effects.push({ type: 'trigger_ending', endingId: 'ending_rapport' })
    const initial = createInitialRuntimeState(pack, 'identity_test')
    initial.player.inventory.item_letter = 1
    const active = startQuest(pack, initial, 'quest_give_test').state

    const result = executeInteraction(pack, active, 'interaction_give_letter')

    expect(result.ok).toBe(true)
    expect(result.state.endingResult?.ending.id).toBe('ending_rapport')
  })

  test('conditional interaction effects can skip item rewards without blocking execution or completing item-gated quests', () => {
    const pack = makePack()
    pack.items.push({ id: 'item_timed_reward', name: 'Timed Reward', type: 'quest', description: 'Only appears at the right time.' })
    const interaction = pack.interactions.find((item) => item.id === 'interaction_search_test')
    if (!interaction) throw new Error('Missing test interaction')
    interaction.effects = [
      {
        type: 'conditional',
        conditions: { fact: 'time.segment', equals: 'morning' },
        effects: [{ type: 'add_item', itemId: 'item_timed_reward', count: 1 }],
        elseEffects: [
          { type: 'add_fact', key: 'timed_reward_attempted', value: true },
          { type: 'fail_quest_objective', questId: 'quest_search_test', objectiveId: 'objective_timed_reward' },
        ],
      },
    ]
    interaction.conditions = { fact: 'facts.timed_reward_attempted', exists: false }
    const quest = pack.quests.find((item) => item.id === 'quest_search_test')
    if (!quest) throw new Error('Missing test quest')
    quest.objectives = [
      {
        id: 'objective_timed_reward',
        title: 'Get timed reward',
        description: 'Get the timed reward.',
        conditions: { fact: 'player.inventory.item_timed_reward', greater_than_or_equal: 1 },
      },
    ]
    const initial = createInitialRuntimeState(pack, 'identity_test')
    initial.time.segment = 'noon'
    const active = startQuest(pack, initial, 'quest_search_test').state

    const wrongTime = executeInteraction(pack, active, 'interaction_search_test')

    expect(wrongTime.ok).toBe(true)
    expect(wrongTime.state.time.actionPoints).toBe(active.time.actionPoints - 1)
    expect(wrongTime.state.player.inventory.item_timed_reward).toBeUndefined()
    expect(wrongTime.state.worldState.quests.quest_search_test?.status).toBe('active')
    expect(wrongTime.state.worldState.quests.quest_search_test?.failedObjectiveIds).toEqual(['objective_timed_reward'])

    const secondAttemptAvailability = getInteractionAvailability(pack, wrongTime.state, interaction)
    expect(secondAttemptAvailability.available).toBe(false)

    const rightTimeState = { ...active, time: { ...active.time, segment: 'morning' as const } }
    const rightTime = executeInteraction(pack, rightTimeState, 'interaction_search_test')

    expect(rightTime.ok).toBe(true)
    expect(rightTime.state.player.inventory.item_timed_reward).toBe(1)
    expect(rightTime.state.worldState.quests.quest_search_test?.status).toBe('completed')
  })

  test('combat victory damages player defeats npc and completes combat quest', () => {
    const pack = makePack()
    const active = startQuest(pack, createInitialRuntimeState(pack, 'identity_test'), 'quest_combat_test').state

    const result = executeInteraction(pack, active, 'interaction_fight_test')

    expect(result.ok).toBe(true)
    expect(result.state.player.state.health).toBeLessThan(100)
    expect(result.state.worldState.npcs.npc_test?.state.alive).toBe(false)
    expect(result.state.worldState.facts.enemy_defeated).toBe(true)
    expect(result.state.worldState.quests.quest_combat_test?.status).toBe('completed')
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
