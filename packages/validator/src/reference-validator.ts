import type { ContentPack, Effect, InteractionTargetType, QuestCompletion, ValidationIssue } from '@tss/schema'
import { issue } from './helpers'

function makeSets(pack: ContentPack) {
  const interactions = Array.isArray(pack.interactions) ? pack.interactions : []
  const quests = Array.isArray(pack.quests) ? pack.quests : []
  const rewards = Array.isArray(pack.rewards) ? pack.rewards : []
  return {
    locations: new Set(pack.locations.map((item) => item.id)),
    buildings: new Set(pack.buildings.map((item) => item.id)),
    npcs: new Set(pack.npcs.map((item) => item.id)),
    factions: new Set(pack.factions.map((item) => item.id)),
    interactions: new Set(interactions.map((item) => item.id)),
    quests: new Set(quests.map((item) => item.id)),
    rewards: new Set(rewards.map((item) => item.id)),
    events: new Set(pack.events.map((item) => item.id)),
    conversations: new Set(pack.conversations.map((item) => item.id)),
    items: new Set(pack.items.map((item) => item.id)),
    endings: new Set(pack.endings.map((item) => item.id)),
    variables: new Set(pack.variables.map((item) => item.key)),
    tiles: new Set(pack.maps.flatMap((map) => map.tiles.map((tile) => tile.id))),
  }
}

function validateEffectReference(effect: Effect, pack: ContentPack, targetId: string): ValidationIssue[] {
  const sets = makeSets(pack)
  const issues: ValidationIssue[] = []
  if (effect.type === 'change_variable' || effect.type === 'set_variable') {
    if (!sets.variables.has(effect.key)) issues.push(issue('error', 'reference_error', `引用了不存在的变量：${effect.key}`, targetId))
  }
  if (effect.type === 'change_location_state' && !sets.locations.has(effect.locationId)) issues.push(issue('error', 'reference_error', `引用了不存在的地点：${effect.locationId}`, targetId))
  if (effect.type === 'change_building_state' && !sets.buildings.has(effect.buildingId)) issues.push(issue('error', 'reference_error', `引用了不存在的建筑：${effect.buildingId}`, targetId))
  if (effect.type === 'change_npc_state' && !sets.npcs.has(effect.npcId)) issues.push(issue('error', 'reference_error', `引用了不存在的 NPC：${effect.npcId}`, targetId))
  if (effect.type === 'move_npc') {
    if (!sets.npcs.has(effect.npcId)) issues.push(issue('error', 'reference_error', `引用了不存在的 NPC：${effect.npcId}`, targetId))
    if (!sets.locations.has(effect.locationId)) issues.push(issue('error', 'reference_error', `引用了不存在的地点：${effect.locationId}`, targetId))
  }
  if (effect.type === 'move_player' && !sets.locations.has(effect.locationId)) issues.push(issue('error', 'reference_error', `引用了不存在的地点：${effect.locationId}`, targetId))
  if ((effect.type === 'add_item' || effect.type === 'remove_item') && !sets.items.has(effect.itemId)) issues.push(issue('error', 'reference_error', `引用了不存在的物品：${effect.itemId}`, targetId))
  if (effect.type === 'trigger_event' && !sets.events.has(effect.eventId)) issues.push(issue('error', 'reference_error', `引用了不存在的事件：${effect.eventId}`, targetId))
  if (effect.type === 'trigger_ending' && !sets.endings.has(effect.endingId)) issues.push(issue('error', 'reference_error', `引用了不存在的结局：${effect.endingId}`, targetId))
  if (effect.type === 'start_conversation' && !sets.conversations.has(effect.conversationId)) issues.push(issue('error', 'reference_error', `引用了不存在的会话：${effect.conversationId}`, targetId))
  if ((effect.type === 'start_quest' || effect.type === 'fail_quest' || effect.type === 'fail_quest_objective') && !sets.quests.has(effect.questId)) issues.push(issue('error', 'reference_error', `引用了不存在的任务：${effect.questId}`, targetId))
  if (effect.type === 'fail_quest_objective') {
    const quest = pack.quests.find((item) => item.id === effect.questId)
    if (quest && !quest.objectives?.some((objective) => objective.id === effect.objectiveId)) issues.push(issue('error', 'reference_error', `引用了不存在的任务目标：${effect.objectiveId}`, targetId))
  }
  if (effect.type === 'discover_location' && !sets.locations.has(effect.locationId)) issues.push(issue('error', 'reference_error', `引用了不存在的地点：${effect.locationId}`, targetId))
  if (effect.type === 'set_tile_visible' && !sets.tiles.has(effect.tileId)) issues.push(issue('error', 'reference_error', `引用了不存在的地块：${effect.tileId}`, targetId))
  if (effect.type === 'change_relationship') {
    const validSource = effect.source === 'player' || sets.npcs.has(effect.source)
    const validTarget = effect.target === 'player' || sets.npcs.has(effect.target)
    if (!validSource || !validTarget) issues.push(issue('error', 'reference_error', `关系引用不存在：${effect.source} -> ${effect.target}`, targetId))
  }
  if (effect.type === 'conditional') {
    for (const nested of Array.isArray(effect.effects) ? effect.effects : []) issues.push(...validateEffectReference(nested, pack, targetId))
    for (const nested of Array.isArray(effect.elseEffects) ? effect.elseEffects : []) issues.push(...validateEffectReference(nested, pack, targetId))
  }
  return issues
}

function validateTargetReference(targetType: InteractionTargetType, targetId: string, sets: ReturnType<typeof makeSets>, targetIssueId: string, issues: ValidationIssue[], label: string) {
  if (targetType === 'location' && !sets.locations.has(targetId)) issues.push(issue('error', 'reference_error', `${label}地点不存在：${targetId}`, targetIssueId))
  if (targetType === 'building' && !sets.buildings.has(targetId)) issues.push(issue('error', 'reference_error', `${label}建筑不存在：${targetId}`, targetIssueId))
  if (targetType === 'npc' && !sets.npcs.has(targetId)) issues.push(issue('error', 'reference_error', `${label}NPC 不存在：${targetId}`, targetIssueId))
  if (targetType === 'tile' && !sets.tiles.has(targetId)) issues.push(issue('error', 'reference_error', `${label}地块不存在：${targetId}`, targetIssueId))
}

function validateOptionalInteraction(interactionId: string | undefined, sets: ReturnType<typeof makeSets>, targetId: string, issues: ValidationIssue[]) {
  if (interactionId && !sets.interactions.has(interactionId)) issues.push(issue('error', 'reference_error', `引用了不存在的交互：${interactionId}`, targetId))
}

function validateQuestCompletion(completion: QuestCompletion, sets: ReturnType<typeof makeSets>, questId: string, issues: ValidationIssue[]) {
  if (completion.type === 'conversation') {
    if (!sets.npcs.has(completion.npcId)) issues.push(issue('error', 'reference_error', `任务完成 NPC 不存在：${completion.npcId}`, questId))
    if (!sets.conversations.has(completion.conversationId)) issues.push(issue('error', 'reference_error', `任务完成会话不存在：${completion.conversationId}`, questId))
  }
  if (completion.type === 'give') {
    if (!sets.npcs.has(completion.npcId)) issues.push(issue('error', 'reference_error', `任务完成 NPC 不存在：${completion.npcId}`, questId))
    if (!sets.items.has(completion.itemId)) issues.push(issue('error', 'reference_error', `任务完成物品不存在：${completion.itemId}`, questId))
    validateOptionalInteraction(completion.interactionId, sets, questId, issues)
  }
  if (completion.type === 'combat') {
    validateTargetReference(completion.targetType, completion.targetId, sets, questId, issues, '任务完成目标')
    validateOptionalInteraction(completion.interactionId, sets, questId, issues)
  }
  if (completion.type === 'environment') {
    validateTargetReference(completion.targetType, completion.targetId, sets, questId, issues, '任务完成目标')
    validateOptionalInteraction(completion.interactionId, sets, questId, issues)
  }
}

function isQuestCompletion(value: unknown): value is QuestCompletion {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'
}

export function validateReferences(pack: ContentPack): ValidationIssue[] {
  const sets = makeSets(pack)
  const issues: ValidationIssue[] = []
  const interactions = Array.isArray(pack.interactions) ? pack.interactions : []
  const quests = Array.isArray(pack.quests) ? pack.quests : []
  const rewards = Array.isArray(pack.rewards) ? pack.rewards : []

  for (const location of pack.locations) {
    for (const buildingId of location.buildingIds) if (!sets.buildings.has(buildingId)) issues.push(issue('error', 'reference_error', `地点引用了不存在的建筑：${buildingId}`, location.id))
    for (const interactionId of Array.isArray(location.interactionIds) ? location.interactionIds : []) if (!sets.interactions.has(interactionId)) issues.push(issue('error', 'reference_error', `地点引用了不存在的交互：${interactionId}`, location.id))
  }
  for (const building of pack.buildings) {
    if (!sets.locations.has(building.locationId)) issues.push(issue('error', 'reference_error', `建筑引用了不存在的地点：${building.locationId}`, building.id))
    for (const interactionId of Array.isArray(building.interactionIds) ? building.interactionIds : []) if (!sets.interactions.has(interactionId)) issues.push(issue('error', 'reference_error', `建筑引用了不存在的交互：${interactionId}`, building.id))
  }
  for (const npc of pack.npcs) {
    if (!sets.factions.has(npc.faction)) issues.push(issue('error', 'reference_error', `NPC 引用了不存在的势力：${npc.faction}`, npc.id))
    if (!sets.locations.has(npc.location)) issues.push(issue('error', 'reference_error', `NPC 引用了不存在的地点：${npc.location}`, npc.id))
    for (const interactionId of npc.interactionIds ?? []) if (!sets.interactions.has(interactionId)) issues.push(issue('error', 'reference_error', `NPC 引用了不存在的交互：${interactionId}`, npc.id))
    for (const rel of npc.relationships) if (!sets.npcs.has(rel.targetId)) issues.push(issue('error', 'reference_error', `NPC 关系引用不存在：${rel.targetId}`, npc.id))
    for (const entry of npc.schedule) {
      if (!sets.locations.has(entry.locationId)) issues.push(issue('error', 'reference_error', `日程引用了不存在的地点：${entry.locationId}`, entry.id))
      for (const effect of entry.effects ?? []) issues.push(...validateEffectReference(effect, pack, entry.id))
    }
    for (const rule of npc.behaviorRules) for (const effect of rule.effects) issues.push(...validateEffectReference(effect, pack, rule.id))
  }
  for (const interaction of interactions) {
    validateTargetReference(interaction.targetType, interaction.targetId, sets, interaction.id, issues, '交互目标')
    if (interaction.type === 'conversation' && !sets.conversations.has(interaction.conversationId)) issues.push(issue('error', 'reference_error', `交互引用了不存在的会话：${interaction.conversationId}`, interaction.id))
    if (interaction.type === 'give' && !sets.items.has(interaction.itemId)) issues.push(issue('error', 'reference_error', `交互引用了不存在的物品：${interaction.itemId}`, interaction.id))
    for (const effect of Array.isArray(interaction.effects) ? interaction.effects : []) issues.push(...validateEffectReference(effect, pack, interaction.id))
    if (interaction.type === 'give') for (const effect of Array.isArray(interaction.acceptedEffects) ? interaction.acceptedEffects : []) issues.push(...validateEffectReference(effect, pack, interaction.id))
    if (interaction.type === 'combat') for (const effect of Array.isArray(interaction.victoryEffects) ? interaction.victoryEffects : []) issues.push(...validateEffectReference(effect, pack, interaction.id))
  }
  for (const event of pack.events) {
    if (event.locationId && !sets.locations.has(event.locationId)) issues.push(issue('error', 'reference_error', `事件地点不存在：${event.locationId}`, event.id))
    for (const npcId of event.participantIds) if (!sets.npcs.has(npcId)) issues.push(issue('error', 'reference_error', `事件参与 NPC 不存在：${npcId}`, event.id))
    for (const followup of event.followupEventIds) if (!sets.events.has(followup)) issues.push(issue('error', 'reference_error', `事件 followup 不存在：${followup}`, event.id))
    for (const effect of event.effects) issues.push(...validateEffectReference(effect, pack, event.id))
  }
  for (const quest of quests) {
    if (!sets.npcs.has(quest.sourceNpcId)) issues.push(issue('error', 'reference_error', `任务来源 NPC 不存在：${quest.sourceNpcId}`, quest.id))
    for (const rewardId of Array.isArray(quest.rewardIds) ? quest.rewardIds : []) if (!sets.rewards.has(rewardId)) issues.push(issue('error', 'reference_error', `任务奖励不存在：${rewardId}`, quest.id))
    if (isQuestCompletion(quest.completion)) validateQuestCompletion(quest.completion, sets, quest.id, issues)
  }
  for (const reward of rewards) for (const effect of Array.isArray(reward.effects) ? reward.effects : []) issues.push(...validateEffectReference(effect, pack, reward.id))
  for (const conversation of pack.conversations) {
    if (!sets.npcs.has(conversation.npcId)) issues.push(issue('error', 'reference_error', `会话 NPC 不存在：${conversation.npcId}`, conversation.id))
    for (const node of conversation.nodes) {
      if (node.speaker !== 'player' && !sets.npcs.has(node.speaker)) issues.push(issue('error', 'reference_error', `会话 speaker 不存在：${node.speaker}`, node.id))
      for (const effect of node.effects ?? []) issues.push(...validateEffectReference(effect, pack, node.id))
      for (const reply of node.replies) {
        if (reply.itemCost && !sets.items.has(reply.itemCost.itemId)) issues.push(issue('error', 'reference_error', `引用了不存在的物品：${reply.itemCost.itemId}`, reply.id))
        for (const effect of reply.effects ?? []) issues.push(...validateEffectReference(effect, pack, reply.id))
      }
    }
  }
  const initialState = pack.runtime?.initialState
  if (initialState) {
    if (!sets.locations.has(initialState.playerLocationId)) issues.push(issue('error', 'reference_error', `初始地点不存在：${initialState.playerLocationId}`, pack.packId, 'runtime.initialState.playerLocationId'))
    if (initialState.selectedTileId && !sets.tiles.has(initialState.selectedTileId)) issues.push(issue('error', 'reference_error', `初始选中地块不存在：${initialState.selectedTileId}`, pack.packId, 'runtime.initialState.selectedTileId'))
    for (const tileId of Object.keys(initialState.tileOverrides ?? {})) {
      if (!sets.tiles.has(tileId)) issues.push(issue('error', 'reference_error', `初始地块覆盖不存在：${tileId}`, pack.packId, 'runtime.initialState.tileOverrides'))
    }
  }
  for (const rule of pack.runtime?.dailyDriftRules ?? []) for (const effect of rule.effects) issues.push(...validateEffectReference(effect, pack, rule.id))
  return issues
}
